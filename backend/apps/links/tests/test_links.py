import pytest
from django.contrib.auth import get_user_model
from apps.links.models import PaymentLink

User = get_user_model()

@pytest.fixture
def seller(db):
    return User.objects.create_user(
        username="linkseller",
        email="seller@example.com",
        password="Password123!",
        role="SELLER"
    )

@pytest.fixture
def link(seller):
    return PaymentLink.objects.create(
        seller=seller,
        title="Test iPhone 14",
        price_ghs=5000.00,
        shipping_fee_ghs=50.00
    )

from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
from apps.links.api import links_router

def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.django_db
def test_toggle_link_active(seller, link):
    client = TestClient(links_router)
    headers = get_auth_headers(seller)
    assert link.is_active is True

    # Disable link
    res = client.post(f"/{link.id}/toggle-active", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    link.refresh_from_db()
    assert link.is_active is False

    # Re-enable link
    res2 = client.post(f"/{link.id}/toggle-active", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["is_active"] is True

@pytest.mark.django_db
def test_archive_and_unarchive_link(seller, link):
    client = TestClient(links_router)
    headers = get_auth_headers(seller)
    assert link.is_archived is False

    # Archive link (Soft Delete)
    res = client.post(f"/{link.id}/archive", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_archived"] is True
    assert res.json()["is_active"] is False

    link.refresh_from_db()
    assert link.is_archived is True
    assert link.is_active is False

    # Public checkout GET returns 404 when archived or inactive
    public_res = client.get(f"/{link.id}")
    assert public_res.status_code == 404

    # Unarchive link
    res2 = client.post(f"/{link.id}/unarchive", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["is_archived"] is False
    assert res2.json()["is_active"] is True

@pytest.mark.django_db
def test_list_links_status_filter(seller, link):
    client = TestClient(links_router)
    headers = get_auth_headers(seller)
    
    # Create an inactive link and an archived link
    PaymentLink.objects.create(seller=seller, title="Inactive Mac", price_ghs=10000.00, is_active=False)
    PaymentLink.objects.create(seller=seller, title="Archived Watch", price_ghs=2000.00, is_active=False, is_archived=True)

    # Default list excludes archived (returns 2 items: 1 active, 1 disabled)
    res = client.get("/", headers=headers)
    assert res.status_code == 200
    assert res.json()["count"] == 2

    # Filter active only
    res_active = client.get("/?status_filter=active", headers=headers)
    assert res_active.json()["count"] == 1
    assert res_active.json()["items"][0]["title"] == "Test iPhone 14"

    # Filter disabled only
    res_disabled = client.get("/?status_filter=disabled", headers=headers)
    assert res_disabled.json()["count"] == 1
    assert res_disabled.json()["items"][0]["title"] == "Inactive Mac"

    # Filter archived only
    res_archived = client.get("/?status_filter=archived", headers=headers)
    assert res_archived.json()["count"] == 1
    assert res_archived.json()["items"][0]["title"] == "Archived Watch"

@pytest.mark.django_db
def test_direct_in_platform_order_flow(seller):
    client = TestClient(links_router)
    headers = get_auth_headers(seller)

    # Create a registered platform buyer
    buyer = User.objects.create_user(
        username="buyer_kofi",
        email="kofi@example.com",
        phone_number="0247771122",
        first_name="Kofi",
        last_name="Mensah",
        role="BUYER"
    )

    # 1. Test search buyer endpoint
    res_search = client.get("/search-buyer?query=kofi", headers=headers)
    assert res_search.status_code == 200
    results = res_search.json()["results"]
    assert len(results) == 1
    assert results[0]["username"] == "buyer_kofi"
    assert results[0]["full_name"] == "Kofi Mensah"

    # 2. Test create direct payment link to buyer
    payload = {
        "title": "Custom Laptop Order",
        "description": "Lenovo ThinkPad X1 Carbon with Charger",
        "price_ghs": "4500.00",
        "shipping_fee_ghs": "50.00",
        "intended_buyer_username": "buyer_kofi",
        "is_direct_order": True
    }
    res_create = client.post("/create", json=payload, headers=headers)
    assert res_create.status_code == 200
    data = res_create.json()
    assert data["is_direct_order"] is True
    assert data["intended_buyer_username"] == "buyer_kofi"
    link_id = data["id"]

    # Verify notification was generated for buyer
    from apps.notifications.models import NotificationLog
    notif = NotificationLog.objects.filter(user=buyer, metadata__task_type="DIRECT_ORDER").first()
    assert notif is not None
    assert "Custom Laptop Order" in notif.title
    assert f"/l/{link_id}" in notif.action_url

    # 3. Test buyer fetches incoming direct orders
    buyer_headers = get_auth_headers(buyer)
    res_incoming = client.get("/incoming-orders", headers=buyer_headers)
    assert res_incoming.status_code == 200
    inc_data = res_incoming.json()
    assert inc_data["count"] == 1
    assert inc_data["orders"][0]["title"] == "Custom Laptop Order"
    assert inc_data["orders"][0]["total_amount_ghs"] == 4550.00
    assert inc_data["orders"][0]["status"] == "PENDING"

    # 4. Test buyer fetches link detail (prefill information available)
    res_detail = client.get(f"/{link_id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["is_direct_order"] is True
    assert detail_data["intended_buyer_username"] == "buyer_kofi"
    assert detail_data["intended_buyer_name"] == "Kofi Mensah"
    assert detail_data["intended_buyer_phone"] == "0247771122"
    assert detail_data["intended_buyer_email"] == "kofi@example.com"

    # 5. Test buyer declines order
    res_decline = client.post(f"/{link_id}/decline-direct-order", headers=buyer_headers)
    assert res_decline.status_code == 200

    # Verify order is no longer in pending incoming orders
    res_incoming_after = client.get("/incoming-orders", headers=buyer_headers)
    assert res_incoming_after.json()["count"] == 0

    # Verify seller received decline notification
    seller_notif = NotificationLog.objects.filter(user=seller, metadata__task_type="DIRECT_ORDER_DECLINED").first()
    assert seller_notif is not None
    assert "declined" in seller_notif.message.lower()

