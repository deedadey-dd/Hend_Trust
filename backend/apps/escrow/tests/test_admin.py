import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch
from django.utils import timezone
from ninja.testing import TestClient

from apps.users.models import User, Role
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.ledger.models import LedgerAccount, AccountType
from apps.escrow.api import admin_router

@pytest.fixture
def system_accounts(db):
    LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE, balance=Decimal('0.00'))
    LedgerAccount.objects.create(name="SYSTEM_BANK_ASSET", account_type=AccountType.ASSET, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PAYOUT_CLEARING_LIABILITY", account_type=AccountType.LIABILITY)
    LedgerAccount.objects.create(name="PAYSTACK_FEE_EXPENSE", account_type=AccountType.EXPENSE)

@pytest.fixture
def normal_user(db):
    return User.objects.create_user(username="normal", phone_number="111")

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username="admin", phone_number="222", role=Role.ADMIN)

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="admin_seller", phone_number="333")

@pytest.fixture
def disputed_transaction(seller_user, db):
    link = PaymentLink.objects.create(
        seller=seller_user,
        title="Admin Test Item",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.ABSORB_FEE
    )
    return Transaction.objects.create(
        link=link,
        buyer_phone="444",
        total_amount_ghs=Decimal('100.00'),
        platform_fee_ghs=Decimal('11.50'), # 1.5% + 10
        status=TransactionStatus.DISPUTED
    )

@pytest.fixture
def admin_client():
    return TestClient(admin_router)

class MockRequest:
    def __init__(self, user):
        self.user = user
        self.auth = True

@pytest.mark.django_db
def test_admin_endpoints_forbidden(normal_user):
    from apps.core.permissions import is_admin_user
    from ninja.errors import HttpError
    
    req = MockRequest(normal_user)
    with pytest.raises(HttpError) as exc:
        is_admin_user(req)
    assert exc.value.status_code == 403

@pytest.mark.django_db
def test_resolve_dispute_full_refund(admin_client, disputed_transaction, admin_user, system_accounts, seller_user):
    with patch('apps.escrow.api.is_admin_user') as mock_is_admin, \
         patch('ninja_jwt.authentication.JWTAuth.__call__') as mock_auth:
        mock_is_admin.return_value = True
        mock_auth.return_value = admin_user
        
        res = admin_client.post(f"/disputes/{disputed_transaction.id}/resolve", json={"action": "FULL_REFUND_TO_BUYER"})
        assert res.status_code == 200
        
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.status == TransactionStatus.REFUNDED
        
        # Verify strict double-entry ledger adjustments
        escrow = LedgerAccount.objects.get(name="BUYER_ESCROW_DEPOSIT")
        assert escrow.balance == Decimal('100.00') # 200 initial - 100 debit (liability down)
        
        bank = LedgerAccount.objects.get(name="SYSTEM_BANK_ASSET")
        assert bank.balance == Decimal('100.00') # 200 initial - 100 credit (asset down)
        
        revenue = LedgerAccount.objects.get(name="PLATFORM_FEE_REVENUE")
        assert revenue.balance == Decimal('11.50') # Credit for fee penalty
        
        seller_wallet = LedgerAccount.objects.get(name=f"SELLER_INTERNAL_WALLET_{seller_user.id}")
        assert seller_wallet.balance == Decimal('-11.50') # Debit for fee penalty (liability down -> negative)

@pytest.mark.django_db
def test_resolve_dispute_release(admin_client, disputed_transaction, admin_user, system_accounts, seller_user):
    with patch('apps.escrow.api.is_admin_user') as mock_is_admin, \
         patch('ninja_jwt.authentication.JWTAuth.__call__') as mock_auth:
        mock_is_admin.return_value = True
        mock_auth.return_value = admin_user
        
        with patch('apps.escrow.payouts.release_escrow_to_seller_wallet') as mock_release:
            res = admin_client.post(f"/disputes/{disputed_transaction.id}/resolve", json={"action": "RELEASE_TO_SELLER"})
            assert res.status_code == 200
            
            disputed_transaction.refresh_from_db()
            assert disputed_transaction.status == TransactionStatus.COMPLETED
            mock_release.assert_called_once()

@pytest.mark.django_db
def test_get_pending_seller_verifications(admin_client, admin_user):
    with patch('apps.escrow.api.is_admin_user') as mock_is_admin, \
         patch('ninja_jwt.authentication.JWTAuth.__call__') as mock_auth:
        mock_is_admin.return_value = True
        mock_auth.return_value = admin_user
        res = admin_client.get("/verifications")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

@pytest.mark.django_db
def test_resolve_dispute_partial_refund(admin_client, disputed_transaction, admin_user, system_accounts, seller_user):
    with patch('apps.escrow.api.is_admin_user') as mock_is_admin, \
         patch('ninja_jwt.authentication.JWTAuth.__call__') as mock_auth:
        mock_is_admin.return_value = True
        mock_auth.return_value = admin_user
        
        # Max allocatable is 100.00 - 11.50 = 88.50
        res = admin_client.post(
            f"/disputes/{disputed_transaction.id}/resolve",
            json={
                "action": "PARTIAL_REFUND_TO_BUYER",
                "refund_amount_ghs": 50.0,
                "seller_amount_ghs": 38.5,
                "platform_retained_fee_ghs": 11.5
            }
        )
        assert res.status_code == 200
        assert "24 hours" in res.json()["message"]
        
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.status == TransactionStatus.REFUNDED
