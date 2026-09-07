import pytest
from decimal import Decimal
from unittest.mock import patch, ANY
from django.utils import timezone
from datetime import timedelta

from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.core.tasks import (
    send_seller_payment_notification_task,
    notify_buyer_payment_received_task,
    notify_seller_delivery_confirmed_task,
    notify_dispute_resolution_task,
)
from apps.escrow.tasks import (
    check_dispatch_expiry_reminders,
    check_inspection_expiry_reminders,
    check_delivery_reminders,
)


@pytest.fixture
def seller_user(db):
    return User.objects.create_user(
        username="audit_seller",
        email="seller@example.com",
        phone_number="0241112222"
    )


@pytest.fixture
def payment_link(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Audit Product",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )


@pytest.fixture
def sample_transaction(payment_link, db):
    return Transaction.objects.create(
        link=payment_link,
        buyer_name="Jane Doe",
        buyer_phone="0243334444",
        buyer_email="buyer@example.com",
        total_amount_ghs=Decimal('111.50'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.PAYMENT_RECEIVED,
        paystack_reference="txn_audit_ref123"
    )


@pytest.mark.django_db
def test_send_seller_payment_notification(sample_transaction):
    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        send_seller_payment_notification_task(sample_transaction.id)
        mock_email.assert_called_once()
        assert "seller@example.com" in mock_email.call_args[0]
        mock_sms.assert_called_once_with("0241112222", ANY)


@pytest.mark.django_db
def test_notify_buyer_payment_received(sample_transaction):
    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        notify_buyer_payment_received_task(sample_transaction.id)
        mock_email.assert_called_once()
        assert "buyer@example.com" in mock_email.call_args[0]
        mock_sms.assert_called_once_with("0243334444", ANY)


@pytest.mark.django_db
def test_notify_seller_delivery_confirmed(sample_transaction):
    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        notify_seller_delivery_confirmed_task(sample_transaction.id)
        mock_email.assert_called_once()
        assert "seller@example.com" in mock_email.call_args[0]
        mock_sms.assert_called_once_with("0241112222", ANY)


@pytest.mark.django_db
def test_notify_dispute_resolution(sample_transaction):
    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        notify_dispute_resolution_task(
            sample_transaction.id,
            action="RELEASE_TO_SELLER",
            admin_notes="Item confirmed in good condition"
        )
        assert mock_email.call_count == 2
        assert mock_sms.call_count == 2


@pytest.mark.django_db
def test_check_dispatch_expiry_reminders(sample_transaction):
    # Set created_at to 91 hours ago (4 days - 6 hours = 90 hours threshold)
    ninety_one_hours_ago = timezone.now() - timedelta(hours=91)
    Transaction.objects.filter(id=sample_transaction.id).update(created_at=ninety_one_hours_ago)

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        res = check_dispatch_expiry_reminders()
        assert "Sent 1" in res
        mock_sms.assert_called_once_with("0241112222", ANY)
        mock_email.assert_called_once()
        
        # Verify flag set
        sample_transaction.refresh_from_db()
        assert sample_transaction.reminder_6h_dispatch_sent is True

        # Second call should send 0 reminders
        res2 = check_dispatch_expiry_reminders()
        assert "Sent 0" in res2


@pytest.mark.django_db
def test_check_inspection_expiry_reminders(sample_transaction):
    sample_transaction.status = TransactionStatus.INSPECTION_PERIOD
    # 24 hours total, 19 hours elapsed => 5 hours remaining (<= 6 hours)
    sample_transaction.inspection_starts_at = timezone.now() - timedelta(hours=19)
    sample_transaction.save()

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        res = check_inspection_expiry_reminders()
        assert "Sent 1" in res
        mock_sms.assert_called_once_with("0243334444", ANY)
        mock_email.assert_called_once()

        sample_transaction.refresh_from_db()
        assert sample_transaction.reminder_6h_inspection_sent is True


@pytest.mark.django_db
def test_check_delivery_reminders_final_warning(sample_transaction):
    sample_transaction.status = TransactionStatus.DELIVERY_IN_PROGRESS
    sample_transaction.dispatched_at = timezone.now() - timedelta(hours=43)
    sample_transaction.save()

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        res = check_delivery_reminders()
        assert "Sent 1" in res
        msg_text = mock_sms.call_args[0][1]
        assert "FINAL WARNING" in msg_text

        sample_transaction.refresh_from_db()
        assert sample_transaction.reminder_42h_sent is True
