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
