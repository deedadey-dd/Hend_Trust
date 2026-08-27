import pytest
from django.contrib.auth import get_user_model
from ninja.testing import TestClient
from apps.developer.models import DeveloperAPIKey, WebhookEndpoint
from apps.developer.v1_api import v1_developer_router
from apps.developer.api import developer_router

User = get_user_model()

@pytest.mark.django_db
def test_generate_api_key():
    user = User.objects.create_user(username="devseller", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="WooCommerce", environment="LIVE")

    assert key_obj.user == user
    assert key_obj.environment == "LIVE"
    assert key_obj.public_key.startswith("pk_live_")
    assert raw_secret.startswith("sk_live_")
    assert DeveloperAPIKey.hash_secret_key(raw_secret) == key_obj.secret_key_hash

@pytest.mark.django_db
def test_v1_create_escrow_order():
    user = User.objects.create_user(username="api_merchant", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="Test App", environment="TEST")

    client = TestClient(v1_developer_router)
    response = client.post(
        "/escrow/create",
        json={
            "title": "MacBook Pro M3",
            "price_ghs": 15000.0,
            "shipping_fee_ghs": 100.0,
            "description": "Mint condition 16-inch M3 Max",
            "buyer_name": "Kofi Mensah",
            "buyer_email": "kofi@example.com",
            "buyer_phone": "0241234567"
        },
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "MacBook Pro M3"
    assert data["price_ghs"] == 15000.0
    assert data["shipping_fee_ghs"] == 100.0
    assert data["status"] == "AWAITING_PAYMENT"
    assert "checkout_url" in data

@pytest.mark.django_db
def test_invalid_api_key_rejected():
    client = TestClient(v1_developer_router)
    response = client.post(
        "/escrow/create",
        json={"title": "Test", "price_ghs": 500.0},
        headers={"X-HendAxis-Secret-Key": "sk_test_invalid_bogus_key"}
    )
    assert response.status_code == 401
