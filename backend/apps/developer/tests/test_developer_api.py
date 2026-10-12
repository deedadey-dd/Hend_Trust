import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from ninja.testing import TestClient
from apps.developer.models import DeveloperAPIKey, WebhookEndpoint
from apps.developer.v1_api import v1_developer_router
from apps.developer.api import developer_router
from apps.escrow.models import Transaction, TransactionStatus

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
def test_v1_ping():
    user = User.objects.create_user(username="api_merchant_ping", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="My Store", environment="TEST")

    client = TestClient(v1_developer_router)
    res = client.get("/ping", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["environment"] == "TEST"
    assert data["merchant_username"] == "api_merchant_ping"
    assert data["public_key"] == key_obj.public_key


@pytest.mark.django_db
def test_v1_merchant_account():
    user = User.objects.create_user(username="merchant_acct", password="password123", email="merchant@test.com")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="Live Prod", environment="LIVE")

    client = TestClient(v1_developer_router)
    res = client.get("/merchant/account", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "merchant_acct"
    assert data["email"] == "merchant@test.com"
    assert "available_balance_ghs" in data
    assert "pending_escrow_ghs" in data


@pytest.mark.django_db
def test_v1_create_escrow_order_lifecycle():
    user = User.objects.create_user(username="api_merchant", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="Test App", environment="TEST")

    client = TestClient(v1_developer_router)
    
    # 1. Create Escrow Order
    response = client.post(
        "/escrow/create",
        json={
            "title": "MacBook Pro M3",
            "price_ghs": 15000.0,
            "shipping_fee_ghs": 100.0,
            "fee_handling": "PASS_TO_BUYER",
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
    tx_id = data["transaction_id"]
    ref = data["escrow_reference"]

    # 2. Query Escrow Order by UUID
    res_get = client.get(f"/escrow/{tx_id}", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert res_get.status_code == 200
    assert res_get.json()["transaction_id"] == tx_id

    # 3. Query Escrow Order by Reference
    res_ref = client.get(f"/escrow/{ref}", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert res_ref.status_code == 200
    assert res_ref.json()["escrow_reference"] == ref

    # 4. List Escrow Orders
    res_list = client.get("/escrow", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1

    # 5. Dispatch Order
    res_disp = client.post(
        f"/escrow/{tx_id}/dispatch",
        json={
            "delivery_method": "COURIER_API",
            "courier_name": "Speedaf Express",
            "tracking_number": "SP-998822",
            "carrier_tracking_url": "https://speedaf.com/track/SP-998822"
        },
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )
    assert res_disp.status_code == 200
    assert res_disp.json()["status"] == "DELIVERY_IN_PROGRESS"

    # 6. Confirm Delivery & Trigger Inspection
    res_deliv = client.post(
        f"/escrow/{tx_id}/confirm-delivery",
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )
    assert res_deliv.status_code == 200
    assert res_deliv.json()["status"] == "INSPECTION_PERIOD"


@pytest.mark.django_db
def test_v1_cancel_escrow_order():
    user = User.objects.create_user(username="cancel_merchant", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="Cancel Test", environment="TEST")

    client = TestClient(v1_developer_router)
    create_res = client.post(
        "/escrow/create",
        json={"title": "Cancelled Item", "price_ghs": 250.0},
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )
    tx_id = create_res.json()["transaction_id"]

    cancel_res = client.post(
        f"/escrow/{tx_id}/cancel",
        json={"reason": "Customer changed mind"},
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


@pytest.mark.django_db
def test_v1_payment_links():
    user = User.objects.create_user(username="links_merchant", password="password123")
    key_obj, raw_secret = DeveloperAPIKey.generate_keys(user=user, name="Link App", environment="TEST")

    client = TestClient(v1_developer_router)
    create_res = client.post(
        "/links/create",
        json={
            "title": "Custom Keyboard",
            "price_ghs": 850.0,
            "shipping_fee_ghs": 30.0,
            "fee_handling": "ABSORB_FEE"
        },
        headers={"X-HendAxis-Secret-Key": raw_secret}
    )
    assert create_res.status_code == 200
    link_data = create_res.json()
    assert link_data["title"] == "Custom Keyboard"
    assert link_data["fee_handling"] == "ABSORB_FEE"
    link_id = link_data["id"]

    # Get link
    get_res = client.get(f"/links/{link_id}", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert get_res.status_code == 200
    assert get_res.json()["id"] == link_id

    # List links
    list_res = client.get("/links", headers={"X-HendAxis-Secret-Key": raw_secret})
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


@pytest.mark.django_db
def test_invalid_api_key_rejected():
    client = TestClient(v1_developer_router)
    response = client.post(
        "/escrow/create",
        json={"title": "Test", "price_ghs": 500.0},
        headers={"X-HendAxis-Secret-Key": "sk_test_invalid_bogus_key"}
    )
    assert response.status_code == 401
