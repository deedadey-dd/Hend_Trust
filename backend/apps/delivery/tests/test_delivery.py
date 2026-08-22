import pytest
import uuid
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from freezegun import freeze_time
from ninja.testing import TestClient

from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink, FeeHandling
from apps.users.models import User
from apps.delivery.models import DeliveryLog, DeliveryMethod
from apps.delivery.api import delivery_router
from apps.delivery.webhooks import webhooks_router

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="seller_delivery", phone_number="0987654321")

@pytest.fixture
def payment_link(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Delivery Test",
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
        status=TransactionStatus.PAYMENT_RECEIVED,
        paystack_reference="txn_test_ref"
    )

@pytest.fixture
def delivery_client(seller_user):
    from ninja_jwt.tokens import AccessToken
    token = str(AccessToken.for_user(seller_user))
    return TestClient(delivery_router, headers={"Authorization": f"Bearer {token}"})

@pytest.fixture
def webhook_client():
    return TestClient(webhooks_router)

@pytest.mark.django_db
def test_dispatch_courier_and_webhook(delivery_client, webhook_client, transaction):
    # 1. Dispatch Courier
    payload = {
        "transaction_id": str(transaction.id),
        "courier_name": "FedEx",
        "tracking_number": "123456789"
    }
    res = delivery_client.post("/dispatch-courier", json=payload)
    assert res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DELIVERY_IN_PROGRESS
    assert transaction.dispatched_at is not None
    
    log = transaction.delivery_logs.first()
    assert log.delivery_method == DeliveryMethod.COURIER_API
    assert log.courier_name == "FedEx"

    # 2. Webhook Courier Status
    wh_payload = {
        "transaction_id": str(transaction.id),
        "status": "DELIVERED",
        "tracking_number": "123456789"
    }
    wh_res = webhook_client.post("/courier-status", json=wh_payload, headers={"x-courier-token": "secret_courier_key"})
    assert wh_res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.INSPECTION_PERIOD
    assert transaction.delivered_at is not None
    assert transaction.inspection_starts_at is not None

@pytest.mark.django_db
def test_dispatch_waybill_and_verify_otp(delivery_client, transaction):
    # 1. Dispatch Waybill
    payload = {
        "transaction_id": str(transaction.id),
        "bus_company": "VIP Transport",
        "driver_phone": "0551234567",
        "destination_station": "Kumasi Central",
        "waybill_photo_url": "https://example.com/waybill.jpg"
    }
    res = delivery_client.post("/dispatch-waybill", json=payload)
    assert res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DELIVERY_IN_PROGRESS
    
    # 2. Get OTP from Cache
    from django.core.cache import cache
    otp = cache.get(f"delivery_otp_{transaction.id}")
    assert otp is not None
    
    # 3. Verify OTP
    verify_payload = {
        "transaction_id": str(transaction.id),
        "otp_code": otp
    }
    verify_res = delivery_client.post("/verify-otp", json=verify_payload)
    assert verify_res.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.INSPECTION_PERIOD

@pytest.mark.django_db
def test_unresponsive_buyer_safeguard_locked(delivery_client, transaction):
    # Set to delivery in progress recently
    transaction.status = TransactionStatus.DELIVERY_IN_PROGRESS
    transaction.dispatched_at = timezone.now()
    transaction.save()
    
    # Try to claim immediately
    payload = {"transaction_id": str(transaction.id)}
    res = delivery_client.post("/seller-claim-delivery", json=payload)
    assert res.status_code == 400
    assert "24 hours must pass" in res.json()['detail']

@pytest.mark.django_db
def test_unresponsive_buyer_safeguard_success(delivery_client, transaction):
    initial_time = timezone.now()
    
    with freeze_time(initial_time):
        transaction.status = TransactionStatus.DELIVERY_IN_PROGRESS
        transaction.dispatched_at = initial_time
        transaction.save()
    
    # Advance time by 25 hours
    future_time = initial_time + timedelta(hours=25)
    with freeze_time(future_time):
        from ninja_jwt.tokens import AccessToken
        token = str(AccessToken.for_user(transaction.link.seller))
        fresh_client = TestClient(delivery_router, headers={"Authorization": f"Bearer {token}"})
        payload = {"transaction_id": str(transaction.id)}
        res = fresh_client.post("/seller-claim-delivery", json=payload)
        assert res.status_code == 200
        
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.INSPECTION_PERIOD
        assert transaction.inspection_starts_at == future_time
