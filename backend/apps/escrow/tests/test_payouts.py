import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from ninja.testing import TestClient

from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink, FeeHandling
from apps.users.models import User
from apps.ledger.models import LedgerAccount, AccountType
from apps.escrow.tasks import check_expired_inspections
from apps.escrow.api import escrow_router

@pytest.fixture
def system_accounts(db):
    LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY)
    LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE)

@pytest.fixture
def seller_user(db):
    user = User.objects.create_user(username="payout_seller", phone_number="0987654321")
    # The SELLER_INTERNAL_WALLET is dynamically created by the service if missing, but we can seed it or let it create it.
    # Let's let the service create it dynamically, so we don't need to seed it here.
    return user

@pytest.fixture
def payment_link(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Auto Payout Test",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

@pytest.fixture
def transaction(payment_link, db):
    return Transaction.objects.create(
        link=payment_link,
        buyer_phone="1234567890",
        total_amount_ghs=Decimal('111.50'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.INSPECTION_PERIOD,
        paystack_reference="txn_payout_ref",
        inspection_starts_at=timezone.now()
    )

@pytest.fixture
def escrow_client(seller_user):
    from ninja_jwt.tokens import AccessToken
    token = str(AccessToken.for_user(seller_user))
    return TestClient(escrow_router, headers={"Authorization": f"Bearer {token}"})

@pytest.mark.django_db
def test_celery_auto_payout_success(system_accounts, seller_user, transaction):
    # Fast forward 49 hours
    future_time = transaction.inspection_starts_at + timedelta(hours=49)
    
    with freeze_time(future_time):
        result = check_expired_inspections()
        assert "Processed 1" in result
        
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.COMPLETED
        
        # Verify Ledger Settlement
        seller_payable = LedgerAccount.objects.get(user=seller_user, name=f"SELLER_INTERNAL_WALLET_{seller_user.id}")
        assert seller_payable.balance > Decimal('0.00')

@pytest.mark.django_db
def test_dispute_halts_auto_payout(escrow_client, transaction):
    # 1 hour passes, buyer disputes
    dispute_time = transaction.inspection_starts_at + timedelta(hours=1)
    
    with freeze_time(dispute_time):
        res = escrow_client.post(f"/{transaction.id}/raise-dispute", json={"reason": "Damaged item", "photos": []})
        assert res.status_code == 200
        
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.DISPUTED
        
    # 49 hours pass, Celery runs
    future_time = transaction.inspection_starts_at + timedelta(hours=49)
    with freeze_time(future_time):
        result = check_expired_inspections()
        assert "Processed 0" in result # Disputed transaction ignored
        
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.DISPUTED

@pytest.mark.django_db
def test_admin_resolve_dispute_to_completed_triggers_payout(system_accounts, seller_user, escrow_client, transaction):
    transaction.status = TransactionStatus.DISPUTED
    transaction.save()
    
    res = escrow_client.post(f"/{transaction.id}/resolve-dispute", json={"resolution": "COMPLETED"})
    assert res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.COMPLETED

@pytest.mark.django_db
def test_dispute_photos_webp_optimization(escrow_client, transaction):
    import io
    import base64
    from PIL import Image

    # Generate a valid test JPEG image base64 string
    buf = io.BytesIO()
    img = Image.new('RGB', (10, 10), color='red')
    img.save(buf, format='JPEG')
    dummy_b64_jpeg = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
    
    res = escrow_client.post(
        f"/{transaction.id}/raise-dispute", 
        json={"reason": "Damaged item", "photos": [dummy_b64_jpeg]}
    )
    assert res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DISPUTED
    assert len(transaction.buyer_dispute_photos) == 1
    assert transaction.buyer_dispute_photos[0].startswith("data:image/webp;base64,")
