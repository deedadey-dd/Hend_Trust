import pytest
from decimal import Decimal
from django.urls import reverse
from ninja.testing import TestClient
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.checkout.api import checkout_router
from apps.users.models import User
from unittest.mock import patch

@pytest.fixture
def seller_user(db):
    return User.objects.create_user(username="seller2", phone_number="0987654321")

@pytest.fixture
def payment_link_pass_fee(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Test Link Pass Fee",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

@pytest.fixture
def payment_link_absorb_fee(seller_user, db):
    return PaymentLink.objects.create(
        seller=seller_user,
        title="Test Link Absorb Fee",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.ABSORB_FEE
    )

@pytest.fixture
def client():
    return TestClient(checkout_router)

@pytest.mark.django_db
@patch('apps.checkout.api.verify_otp')
@patch('apps.checkout.api.PaystackAdapter.initialize_transaction')
def test_verify_and_initialize_pass_fee(mock_paystack, mock_verify, client, payment_link_pass_fee):
    mock_verify.return_value = True
    mock_paystack.return_value = {
        "authorization_url": "https://checkout.paystack.com/testurl",
        "reference": "mocked_ref"
    }

    payload = {
        "link_id": str(payment_link_pass_fee.id),
        "name": "Jane Doe",
        "phone_number": "1234567890",
        "otp_code": "123456",
        "email": "buyer@test.com",
        "shipping_address": "123 Test St"
    }
    
    response = client.post("/verify-and-initialize", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "authorization_url" in data
    
    # Verify fee math
    txn = Transaction.objects.first()
    assert txn.status == TransactionStatus.AWAITING_PAYMENT
    # Base: 100
    # Platform Fee: (100 * 0.015) + 10 = 1.5 + 10 = 11.50
    # Total Pass to Buyer: 100 + 11.50 = 111.50
    assert txn.platform_fee_ghs == Decimal('11.50')
    assert txn.total_amount_ghs == Decimal('111.50')
    assert txn.buyer_name == "Jane Doe"
    assert len(txn.paystack_reference) >= 16  # Updated: reference is now 16-char secure random

@pytest.mark.django_db
@patch('apps.checkout.api.verify_otp')
@patch('apps.checkout.api.PaystackAdapter.initialize_transaction')
def test_verify_and_initialize_absorb_fee(mock_paystack, mock_verify, client, payment_link_absorb_fee):
    mock_verify.return_value = True
    mock_paystack.return_value = {
        "authorization_url": "https://checkout.paystack.com/testurl2"
    }

    payload = {
        "link_id": str(payment_link_absorb_fee.id),
        "name": "John Doe",
        "phone_number": "1234567890",
        "otp_code": "123456",
        "email": "buyer@test.com"
    }
    
    response = client.post("/verify-and-initialize", json=payload)
    assert response.status_code == 200
    
    txn = Transaction.objects.first()
    # Base: 100
    # Platform Fee: (100 * 0.015) + 10 = 11.50
    # Total Absorb Fee: Buyer pays exactly 100
    assert txn.platform_fee_ghs == Decimal('11.50')
    assert txn.total_amount_ghs == Decimal('100.00')
