import pytest
from decimal import Decimal
from unittest.mock import patch
from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink
from apps.users.models import User
from apps.checkout.api import checkout_router
from ninja.testing import TestClient

@pytest.fixture
def client():
    return TestClient(checkout_router)

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username="seller_t", phone_number="000")

@pytest.fixture
def test_link(test_user):
    return PaymentLink.objects.create(seller=test_user, title="Trackable Item", price_ghs=Decimal('100.00'))

@pytest.fixture
def test_transaction(test_link):
    return Transaction.objects.create(
        link=test_link,
        buyer_phone="0555555555",
        buyer_email="buyer@test.com",
        total_amount_ghs=Decimal('110.00'),
        platform_fee_ghs=Decimal('10.00'),
        paystack_reference="TRACK123"
    )

@pytest.mark.django_db
@patch('apps.checkout.api.verify_otp')
def test_track_orders_with_email_otp(mock_verify_otp, client, test_transaction):
    # Setup mock
    mock_verify_otp.return_value = True
    
    payload = {
        "email": "buyer@test.com",
        "otp_code": "123456"
    }
    
    response = client.post("/track", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["paystack_reference"] == "TRACK123"
    assert data[0]["title"] == "Trackable Item"

@pytest.mark.django_db
@patch('apps.checkout.api.verify_otp')
def test_track_orders_invalid_email_otp(mock_verify_otp, client, test_transaction):
    # Setup mock
    mock_verify_otp.return_value = False
    
    payload = {
        "email": "buyer@test.com",
        "otp_code": "999999"
    }
    
    response = client.post("/track", json=payload)
    assert response.status_code == 400

@pytest.mark.django_db
def test_track_order_by_id(client, test_transaction):
    payload = {
        "paystack_reference": "TRACK123",
        "phone_number": "0555555555"
    }
    
    response = client.post("/track/id", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["paystack_reference"] == "TRACK123"
    assert data[0]["title"] == "Trackable Item"

@pytest.mark.django_db
def test_track_order_by_id_invalid(client, test_transaction):
    payload = {
        "paystack_reference": "TRACK123",
        "phone_number": "0999999999" # wrong phone
    }
    
    response = client.post("/track/id", json=payload)
    assert response.status_code == 404
