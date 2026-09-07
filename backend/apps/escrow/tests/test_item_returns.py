import pytest
from decimal import Decimal
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta

from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.api import resolve_dispute_admin, dispatch_return, seller_confirm_return
from apps.escrow.tasks import process_auto_return_refunds
from apps.ledger.models import LedgerAccount, AccountType


@pytest.fixture
def system_accounts(db):
    LedgerAccount.objects.create(name="BUYER_ESCROW_DEPOSIT", account_type=AccountType.LIABILITY, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PLATFORM_FEE_REVENUE", account_type=AccountType.REVENUE, balance=Decimal('0.00'))
    LedgerAccount.objects.create(name="SYSTEM_BANK_ASSET", account_type=AccountType.ASSET, balance=Decimal('200.00'))
    LedgerAccount.objects.create(name="PAYOUT_CLEARING_LIABILITY", account_type=AccountType.LIABILITY)
    LedgerAccount.objects.create(name="PAYSTACK_REFUND_FEES_EXPENSE", account_type=AccountType.EXPENSE)


@pytest.fixture
def seller_user(db):
    return User.objects.create_user(
        username="return_seller",
        email="returnseller@example.com",
        phone_number="0247778888"
    )


@pytest.fixture
def payment_link(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Return Test Item",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )


@pytest.fixture
def disputed_transaction(payment_link, db):
    return Transaction.objects.create(
        link=payment_link,
        buyer_name="Bob Returner",
        buyer_phone="0249990000",
        buyer_email="bob@example.com",
        total_amount_ghs=Decimal('111.50'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.DISPUTED,
        paystack_reference="txn_return_test_123"
    )


class MockAdminRequest:
    def __init__(self, user):
        self.user = user
        self.user.is_staff = True
        self.auth = True


class MockSellerRequest:
    def __init__(self, user):
        self.user = user
        self.auth = True


class DummySchema:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


@pytest.mark.django_db
def test_admin_require_return_from_buyer(seller_user, disputed_transaction):
    admin_req = MockAdminRequest(seller_user)
    data = DummySchema(
        action="REQUIRE_RETURN_FROM_BUYER",
        refund_amount_ghs=0.0,
        seller_amount_ghs=0.0,
        platform_retained_fee_ghs=0.0,
        admin_notes="Item must be returned to seller intact.",
        manager_photos=[]
    )

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        res = resolve_dispute_admin(admin_req, disputed_transaction.id, data)
        assert "Return Required" in res["message"]
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.status == TransactionStatus.RETURN_IN_PROGRESS


@pytest.mark.django_db
def test_buyer_dispatch_return_courier(disputed_transaction):
    disputed_transaction.status = TransactionStatus.RETURN_IN_PROGRESS
    disputed_transaction.save()

    data = DummySchema(
        delivery_method="COURIER_API",
        courier_name="DHL Express",
        tracking_number="RET123456",
        carrier_code="DHL",
        driver_phone=None,
        driver_car_number=None,
        destination_station=None,
        waybill_photo_url=None
    )

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        res = dispatch_return(None, disputed_transaction.id, data)
        assert "Return shipment recorded" in res["message"]
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.return_delivery_method == "COURIER_API"
        assert disputed_transaction.return_tracking_number == "RET123456"


@pytest.mark.django_db
def test_buyer_dispatch_return_bus_and_seller_confirm(system_accounts, seller_user, disputed_transaction):
    disputed_transaction.status = TransactionStatus.RETURN_IN_PROGRESS
    disputed_transaction.save()

    dispatch_data = DummySchema(
        delivery_method="INFORMAL_BUS",
        courier_name=None,
        tracking_number=None,
        carrier_code=None,
        driver_phone="0501112222",
        driver_car_number="GW 123-22",
        destination_station="VIP Station Circle",
        waybill_photo_url=None
    )

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        res = dispatch_return(None, disputed_transaction.id, dispatch_data)
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.return_confirmation_code != ""
        otp = disputed_transaction.return_confirmation_code

    # Seller confirms return with Reverse OTP
    seller_req = MockSellerRequest(seller_user)
    confirm_data = DummySchema(confirmation_code=otp)

    with patch('apps.wallet.services.execute_refund_payout') as mock_payout:
        confirm_res = seller_confirm_return(seller_req, disputed_transaction.id, confirm_data)
        assert "Return confirmed" in confirm_res["message"]
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.status == TransactionStatus.REFUNDED


@pytest.mark.django_db
def test_process_auto_return_refunds(system_accounts, seller_user, disputed_transaction):
    disputed_transaction.status = TransactionStatus.RETURN_IN_PROGRESS
    disputed_transaction.return_dispatched_at = timezone.now() - timedelta(hours=49)
    disputed_transaction.save()

    with patch('apps.wallet.services.execute_refund_payout') as mock_payout, \
         patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        task_res = process_auto_return_refunds()
        assert "Auto-refunded 1" in task_res
        disputed_transaction.refresh_from_db()
        assert disputed_transaction.status == TransactionStatus.REFUNDED
