import pytest
import base64
import io
from decimal import Decimal
from PIL import Image
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
import uuid6

from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.ledger.models import LedgerAccount, AccountType, LedgerEntry
from apps.escrow.api import admin_router, compress_dispute_images_total_1mb

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username="super_audit_admin", phone_number="0241002003", is_staff=True, is_superuser=True)

@pytest.fixture
def admin_client(admin_user):
    token = str(AccessToken.for_user(admin_user))
    return TestClient(admin_router, headers={"Authorization": f"Bearer {token}"})

@pytest.fixture
def seed_ledger_accounts(db):
    b_escrow = LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY, balance=Decimal('5000.00'))
    p_rev = LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE, balance=Decimal('350.00'))
    sys_bank = LedgerAccount.objects.create(name="SYSTEM_BANK_ASSET", account_type=AccountType.ASSET, balance=Decimal('6000.00'))
    payout_liab = LedgerAccount.objects.create(name="PAYOUT_CLEARING_LIABILITY", account_type=AccountType.LIABILITY, balance=Decimal('650.00'))
    paystack_exp = LedgerAccount.objects.create(name="PAYSTACK_FEE_EXPENSE", account_type=AccountType.EXPENSE, balance=Decimal('25.00'))

    # Create dummy entries
    LedgerEntry.objects.create(
        entry_type="ESCROW_DEPOSIT",
        debit_account=sys_bank,
        credit_account=b_escrow,
        amount_ghs=Decimal('1000.00'),
        reference_id=uuid6.uuid7()
    )
    LedgerEntry.objects.create(
        entry_type="PLATFORM_FEE",
        debit_account=b_escrow,
        credit_account=p_rev,
        amount_ghs=Decimal('50.00'),
        reference_id=uuid6.uuid7()
    )
    return {
        "b_escrow": b_escrow,
        "p_rev": p_rev,
        "sys_bank": sys_bank,
        "payout_liab": payout_liab,
        "paystack_exp": paystack_exp
    }

@pytest.mark.django_db
def test_admin_funds_accounts_summary(admin_client, seed_ledger_accounts):
    res = admin_client.get("/funds/accounts")
    assert res.status_code == 200
    data = res.json()
    assert "accounts" in data
    assert "summary" in data
    assert data['summary']['system_bank_asset_ghs'] == 6000.0
    assert data['summary']['buyer_escrow_deposit_ghs'] == 5000.0
    assert data['summary']['platform_revenue_ghs'] == 350.0

@pytest.mark.django_db
def test_admin_funds_ledger_filtering_and_sorting(admin_client, seed_ledger_accounts):
    # 1. Fetch all ledger entries
    res = admin_client.get("/funds/ledger")
    assert res.status_code == 200
    data = res.json()
    assert data['total_count'] == 2

    # 2. Filter by entry_type
    res_deposit = admin_client.get("/funds/ledger?entry_type=ESCROW_DEPOSIT")
    assert res_deposit.status_code == 200
    assert res_deposit.json()['total_count'] == 1
    assert res_deposit.json()['items'][0]['entry_type'] == "ESCROW_DEPOSIT"

    # 3. Search query
    res_search = admin_client.get("/funds/ledger?search=PLATFORM_FEE_REVENUE")
    assert res_search.status_code == 200
    assert res_search.json()['total_count'] == 1

def _generate_test_base64_image(width=500, height=500, color='red'):
    img = Image.new('RGB', (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=95)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

@pytest.mark.django_db
def test_dispute_images_compression_under_1mb(db):
    seller = User.objects.create_user(username="dispute_compress_seller", phone_number="0240099887")
    link = PaymentLink.objects.create(seller=seller, title="Laptop", price_ghs=Decimal('2000.00'), fee_handling=FeeHandling.PASS_TO_BUYER)
    txn = Transaction.objects.create(
        link=link,
        buyer_phone="0241122334",
        total_amount_ghs=Decimal('2050.00'),
        platform_fee_ghs=Decimal('50.00'),
        status=TransactionStatus.DISPUTED,
        paystack_reference="DISP_COMPRESS_TEST"
    )

    # Attach 4 large base64 photos across buyer, seller, and manager
    large_img_1 = _generate_test_base64_image(1200, 1200, 'blue')
    large_img_2 = _generate_test_base64_image(1200, 1200, 'green')
    large_img_3 = _generate_test_base64_image(1200, 1200, 'yellow')
    large_img_4 = _generate_test_base64_image(1200, 1200, 'purple')

    txn.buyer_dispute_photos = [large_img_1, large_img_2]
    txn.seller_dispute_photos = [large_img_3]
    txn.manager_dispute_photos = [large_img_4]
    txn.save()

    # Run compression
    compress_dispute_images_total_1mb(txn)

    txn.refresh_from_db()
    total_b64_size = sum(
        len(p) for lst in [txn.buyer_dispute_photos, txn.seller_dispute_photos, txn.manager_dispute_photos] for p in lst if isinstance(p, str)
    )

    # Must be <= 1MB (1,048,576 bytes)
    assert total_b64_size <= 1048576
