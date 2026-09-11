import pytest
import uuid
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from apps.users.models import User
from apps.links.models import PaymentLink
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.api import send_confirmation_code, confirm_receipt
from apps.delivery.services import resend_delivery_otp
from apps.users.api import _send_user_phone_otp, request_momo_otp, RequestMomoOTPSchema

@pytest.fixture
def buyer_seller_and_tx(db):
    seller = User.objects.create_user(username="otp_seller", email="otp_seller@example.com", role="SELLER", phone_number="0241000001")
    link = PaymentLink.objects.create(seller=seller, title="Test Item", price_ghs=Decimal('150.00'))
    tx = Transaction.objects.create(
        link=link,
        paystack_reference="REF_OTP_COOLDOWN_1",
        buyer_name="Buyer OTP",
        buyer_phone="0501112233",
        buyer_email="buyer_otp@example.com",
        status=TransactionStatus.DELIVERY_IN_PROGRESS,
        total_amount_ghs=Decimal('150.00'),
        platform_fee_ghs=Decimal('5.00')
    )
    return seller, tx

def make_dummy_request(user=None):
    req = MagicMock()
    req.user = user
    req.META = {'REMOTE_ADDR': '127.0.0.1'}
    return req

@pytest.mark.django_db
def test_send_confirmation_code_cooldown_and_retention(buyer_seller_and_tx):
    seller, tx = buyer_seller_and_tx
    cache.clear()
    req = make_dummy_request()

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms, \
         patch('apps.core.tasks.dispatch_email_task.delay') as mock_email:
        
        # First call: should generate OTP, set delivery_confirmation_code, dispatch SMS & email
        res1 = send_confirmation_code(req, tx.id)
        tx.refresh_from_db()
        first_code = tx.delivery_confirmation_code
        
        assert first_code != ""
        assert mock_sms.call_count == 1
        assert mock_email.call_count == 1
        assert "sent to your phone" in res1["message"]

        # Second call immediately after (within 60s cooldown):
        # Should NOT dispatch new SMS/Email, should NOT overwrite first_code
        res2 = send_confirmation_code(req, tx.id)
        tx.refresh_from_db()
        
        assert tx.delivery_confirmation_code == first_code  # First OTP code preserved!
        assert mock_sms.call_count == 1  # Still 1 call! No duplicate SMS sent!
        assert mock_email.call_count == 1  # Still 1 call!
        assert "recently" in res2["message"]

        # Third step: Confirm receipt using the first code works!
        confirm_res = confirm_receipt(req, tx.id, type('Schema', (), {'confirmation_code': first_code})())
        tx.refresh_from_db()
        assert tx.status == TransactionStatus.INSPECTION_PERIOD
        assert "Receipt confirmed" in confirm_res["message"]

@pytest.mark.django_db
def test_informal_bus_delivery_otp_cooldown(buyer_seller_and_tx):
    seller, tx = buyer_seller_and_tx
    cache.clear()

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        # First call: generates OTP & sends SMS
        otp1 = resend_delivery_otp(str(tx.id))
        assert otp1 != ""
        assert mock_sms.call_count == 1

        # Second call within 60s cooldown: returns same OTP, NO extra SMS
        otp2 = resend_delivery_otp(str(tx.id))
        assert otp2 == otp1
        assert mock_sms.call_count == 1

@pytest.mark.django_db
def test_user_phone_and_momo_otp_cooldown(buyer_seller_and_tx):
    seller, tx = buyer_seller_and_tx

    with patch('apps.core.tasks.dispatch_sms_task.delay') as mock_sms:
        # First seller phone OTP call
        code1 = _send_user_phone_otp(seller)
        assert mock_sms.call_count == 1

        # Immediate second call within 60s
        code2 = _send_user_phone_otp(seller)
        assert code2 == code1
        assert mock_sms.call_count == 1

    with patch('utils.mnotify.MNotifyService.send_sms', return_value=True) as mock_mnotify:
        req_data = RequestMomoOTPSchema(momo_number="0241234567")
        req = make_dummy_request(user=seller)
        
        # First MoMo OTP call
        r1 = request_momo_otp(req, req_data)
        assert mock_mnotify.call_count == 1
        momo_code1 = seller.momo_otp_code

        # Immediate second call within 60s
        r2 = request_momo_otp(req, req_data)
        seller.refresh_from_db()
        assert seller.momo_otp_code == momo_code1
        assert mock_mnotify.call_count == 1
        assert "recently" in r2["message"] or "Resend available" in r2["message"]
