import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch
from ninja.testing import TestClient

from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.api import escrow_router
from apps.ledger.models import LedgerAccount, AccountType

@pytest.fixture
def system_accounts(db):
    LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE, balance=Decimal('0.00'))
    LedgerAccount.objects.create(name="SYSTEM_BANK_ASSET", account_type=AccountType.ASSET, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PAYOUT_CLEARING_LIABILITY", account_type=AccountType.LIABILITY)

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="test_seller", phone_number="0240000000")

@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="other_seller", phone_number="0250000000")

@pytest.fixture
def payment_link(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Test Product",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

@pytest.fixture
def transaction_awaiting_shipping(payment_link, db):
    return Transaction.objects.create(
        link=payment_link,
        buyer_name="John Doe",
        buyer_phone="0260000000",
        buyer_email="buyer@example.com",
        total_amount_ghs=Decimal('111.50'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.PAYMENT_RECEIVED,
        paystack_reference="txn_test123"
    )

class MockRequest:
    def __init__(self, user):
        self.user = user
        self.auth = True

@pytest.mark.django_db
def test_get_seller_transactions(seller_user, transaction_awaiting_shipping):
    # Setup mock request
    request = MockRequest(seller_user)
    
    # We call the router function directly since it's hard to mock Ninja auth nicely with TestClient for authenticated endpoints
    from apps.escrow.api import get_seller_transactions
    
    # Test basic list
    res = get_seller_transactions(request)
    assert len(res) > 0 # it's a list or queryset if not paginated manually, but wait...
    # Let's see what res actually is, wait... the error says:
    # where 2 = len({'items': [...], 'count': 1})
    assert len(res['items']) == 1
    assert res['items'][0]['paystack_reference'] == "txn_test123"
    assert res['items'][0]['buyer_name'] == "John Doe"
    
    # Test search by product name
    res = get_seller_transactions(request, search="Test Product")
    assert len(res['items']) == 1
    
    # Test search by phone
    res = get_seller_transactions(request, search="0260")
    assert len(res['items']) == 1
    
    # Test non-matching search
    res = get_seller_transactions(request, search="NonExistent")
    assert len(res['items']) == 0

@pytest.mark.django_db
def test_seller_dispatch(seller_user, transaction_awaiting_shipping):
    request = MockRequest(seller_user)
    from apps.escrow.api import seller_dispatch, SellerDispatchSchema
    
    dispatch_data = SellerDispatchSchema(
        delivery_method="COURIER_API",
        courier_name="FedEx",
        tracking_number="TRACK123"
    )
    
    res = seller_dispatch(request, transaction_awaiting_shipping.id, dispatch_data)
    assert "DELIVERY_IN_PROGRESS" in res['message']
    
    transaction_awaiting_shipping.refresh_from_db()
    assert transaction_awaiting_shipping.status == TransactionStatus.DELIVERY_IN_PROGRESS

@pytest.mark.django_db
def test_seller_cancel_refunds_buyer_and_notifies(seller_user, transaction_awaiting_shipping, system_accounts):
    request = MockRequest(seller_user)
    from apps.escrow.api import seller_cancel
    
    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        
        res = seller_cancel(request, transaction_awaiting_shipping.id)
        assert "cancelled" in res['message']
        
        # Verify status changed
        transaction_awaiting_shipping.refresh_from_db()
        assert transaction_awaiting_shipping.status == TransactionStatus.CANCELLED
        
        # Verify notifications sent
        mock_sms.assert_called_once()
        mock_email.assert_called_once()
        assert transaction_awaiting_shipping.buyer_phone in mock_sms.call_args[0]
        assert transaction_awaiting_shipping.buyer_email in mock_email.call_args[0]
        
        # Verify ledger updates
        # Buyer Escrow should be debited (decrease in liability), so balance goes down by gross (111.50)
        escrow = LedgerAccount.objects.get(name="BUYER_ESCROW_DEPOSIT")
        assert escrow.balance == Decimal('200.00') - Decimal('111.50')
        
        # Seller should be penalized for platform fee (11.50)
        seller_wallet = LedgerAccount.objects.get(name=f"SELLER_INTERNAL_WALLET_{seller_user.id}")
        assert seller_wallet.balance == Decimal('-11.50')


@pytest.mark.django_db
def test_get_seller_summary_metrics(seller_user, transaction_awaiting_shipping):
    request = MockRequest(seller_user)
    from apps.escrow.api import get_seller_summary_metrics
    
    metrics = get_seller_summary_metrics(request)
    assert metrics['pending_transactions_count'] == 1
    # total 111.50 - platform fee 11.50 = net 100.00 due to seller
    assert metrics['pending_net_due_seller_ghs'] == 100.0
    assert metrics['awaiting_dispatch_count'] == 1
    assert metrics['awaiting_dispatch_net_ghs'] == 100.0
    assert metrics['in_delivery_count'] == 0
    assert metrics['completed_transactions_count'] == 0
