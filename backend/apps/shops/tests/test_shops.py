import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
from apps.users.models import User, VerificationStatus
from apps.reviews.api import reviews_router
from apps.escrow.api import admin_router

@pytest.fixture
def seller(db):
    user = User.objects.create_user(
        username="accra_tech",
        shop_name="Accra Tech Hub",
        shop_description="Quality laptops & gadgets",
        phone_number="0240001122",
        role="SELLER"
    )
    return user

@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        username="admin_manager",
        phone_number="0249990000",
        is_staff=True,
        is_superuser=True
    )
    return user

@pytest.fixture
def shops_client():
    return TestClient(reviews_router)

@pytest.fixture
def seller_client(seller):
    token = str(AccessToken.for_user(seller))
    return TestClient(reviews_router, headers={"Authorization": f"Bearer {token}"})

@pytest.fixture
def admin_client(admin_user):
    token = str(AccessToken.for_user(admin_user))
    return TestClient(admin_router, headers={"Authorization": f"Bearer {token}"})

@pytest.mark.django_db
def test_public_shops_directory(shops_client, seller):
    res = shops_client.get("/shops")
    assert res.status_code == 200
    data = res.json()
    assert len(data['standard_shops']) >= 1
    assert data['standard_shops'][0]['shop_name'] == "Accra Tech Hub"
    assert data['standard_shops'][0]['badge_title'] == "🆕 New Shop"

@pytest.mark.django_db
def test_seller_profile_update(seller_client, seller):
    payload = {
        "shop_name": "Accra Gadgets & Laptops",
        "shop_description": "Premium electronics store",
        "shop_category": "Electronics"
    }
    res = seller_client.put("/shop/profile", json=payload)
    assert res.status_code == 200
    
    seller.refresh_from_db()
    assert seller.shop_name == "Accra Gadgets & Laptops"
    assert seller.shop_description == "Premium electronics store"
    assert seller.shop_category == "Electronics"

@pytest.mark.django_db
def test_admin_document_verification_grants_verified_badge(admin_client, shops_client, seller):
    seller.verification_status = VerificationStatus.PENDING
    seller.national_id_card_url = "https://example.com/id.jpg"
    seller.save()
    
    # 2. Admin verifies documents
    verify_res = admin_client.post(f"/verifications/{seller.id}/approve")
    assert verify_res.status_code == 200
    
    seller.refresh_from_db()
    assert seller.verification_status == VerificationStatus.APPROVED
    
    # Check directory reflects Verified Seller badge
    dir_res = shops_client.get("/shops")
    data = dir_res.json()
    assert data['standard_shops'][0]['badge_title'] == "🛡️ Verified Seller"
