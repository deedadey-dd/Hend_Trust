import pytest
import uuid
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from ninja.testing import TestClient
from django.core.cache import cache

from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.ledger.models import LedgerAccount, AccountType, LedgerEntry
from apps.wallet.models import SellerWallet
from apps.wallet.api import wallet_router
from apps.checkout.api import checkout_router
from apps.escrow.payouts import execute_payout_for_transaction

@pytest.fixture
def system_accounts(db):
    LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY)
    LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE)
    LedgerAccount.objects.create(name="SYSTEM_BANK_ASSET", account_type=AccountType.ASSET)
    LedgerAccount.objects.create(name="PAYOUT_CLEARING_LIABILITY", account_type=AccountType.LIABILITY)
    LedgerAccount.objects.create(name="PAYSTACK_FEE_EXPENSE", account_type=AccountType.EXPENSE)

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="wallet_seller", phone_number="0240000000")

@pytest.fixture
def seller_wallet(seller_user, db):
    # Wallet Ledger
    ledger = LedgerAccount.objects.create(
        user=seller_user,
        name=f"SELLER_INTERNAL_WALLET_{seller_user.id}",
        account_type=AccountType.LIABILITY
    )
    return SellerWallet.objects.create(
        user=seller_user,
        ledger_account=ledger,
        momo_number="0240000000"
    )

@pytest.fixture
def wallet_client():
    return TestClient(wallet_router)

@pytest.fixture
def checkout_client():
    return TestClient(checkout_router)

from unittest.mock import patch

@pytest.fixture
def mock_paystack():
    with patch('apps.checkout.api.PaystackAdapter.initialize_transaction') as mock:
        mock.return_value = {
            'authorization_url': 'https://checkout.paystack.com/mock',
            'reference': 'mock_ref'
        }
        yield mock

@pytest.mark.django_db
def test_fee_handling_absorb(checkout_client, seller_user, mock_paystack, db):
    link = PaymentLink.objects.create(
        seller=seller_user,
        title="Absorb Fee Item",
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.ABSORB_FEE
    )
    
    cache.set("otp_12345", "000000", timeout=300)
    
    payload = {
        "link_id": str(link.id),
        "phone_number": "12345",
        "otp_code": "000000",
        "email": "test@test.com"
    }
    
    res = checkout_client.post("/verify-and-initialize", json=payload)
    assert res.status_code == 200
    
    txn = Transaction.objects.get(link=link)
    # Fee is 1.5% of 100 + 10 = 1.5 + 10 = 11.50
    # Total charged to buyer should be 100.00 (seller absorbs fee)
    assert txn.platform_fee_ghs == Decimal('11.50')
    assert txn.total_amount_ghs == Decimal('100.00')

@pytest.mark.django_db
def test_fee_handling_pass_to_buyer(checkout_client, seller_user, mock_paystack, db):
    link = PaymentLink.objects.create(
        seller=seller_user,
        title="Pass Fee Item",
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )
    
    cache.set("otp_67890", "000000", timeout=300)
    
    payload = {
        "link_id": str(link.id),
        "phone_number": "67890",
        "otp_code": "000000",
        "email": "test@test.com"
    }
    
    res = checkout_client.post("/verify-and-initialize", json=payload)
    assert res.status_code == 200
    
    txn = Transaction.objects.get(link=link)
    # Total charged to buyer should be 100.00 + 11.50 = 111.50
    assert txn.platform_fee_ghs == Decimal('11.50')
    assert txn.total_amount_ghs == Decimal('111.50')

@pytest.mark.django_db
def test_wallet_balance_sync(system_accounts, seller_wallet, db):
    # Give the ledger account some balance
    seller_wallet.ledger_account.balance = Decimal('500.00')
    seller_wallet.ledger_account.save()
    
    from apps.wallet.services import sync_wallet_balance
    sync_wallet_balance(seller_wallet)
    
    seller_wallet.refresh_from_db()
    assert seller_wallet.available_balance_ghs == Decimal('500.00')

@pytest.mark.django_db
def test_wallet_withdrawal_success(system_accounts, seller_wallet, wallet_client, db):
    seller_wallet.ledger_account.balance = Decimal('1000.00')
    seller_wallet.ledger_account.save()
    
    payload = {
        "amount": "250.00",
        "destination_type": "MOMO",
        "destination_account": "0240000000"
    }
    
    res = wallet_client.post("/withdraw", json=payload)
    assert res.status_code == 200
    
    # Verify balance reduced
    seller_wallet.refresh_from_db()
    # Initial 1000 liability balance -> debit 250 -> new balance 750
    assert seller_wallet.available_balance_ghs == Decimal('750.00')
    
    # Verify ledger entry
    payout_liability = LedgerAccount.objects.get(name="PAYOUT_CLEARING_LIABILITY")
    assert payout_liability.balance == Decimal('250.00')

@pytest.mark.django_db
def test_wallet_withdrawal_exceeds_balance(system_accounts, seller_wallet, wallet_client, db):
    seller_wallet.ledger_account.balance = Decimal('100.00')
    seller_wallet.ledger_account.save()
    
    payload = {
        "amount": "250.00",
        "destination_type": "MOMO",
        "destination_account": "0240000000"
    }
    
    res = wallet_client.post("/withdraw", json=payload)
    assert res.status_code == 400
    assert "Insufficient funds" in res.json()['detail']
