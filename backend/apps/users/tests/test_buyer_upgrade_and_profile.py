import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
from apps.users.api import profile_router
from apps.escrow.api import admin_router
from apps.users.models import VerificationStatus

User = get_user_model()


def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def buyer_user(db):
    return User.objects.create_user(
        username="buyer_kofi",
        email="kofi.buyer@example.com",
        password="Password123!",
        phone_number="0241234567",
        first_name="Kofi",
        last_name="Mensah",
        role="BUYER",
        is_email_verified=True,
        is_phone_verified=True,
        verification_status=VerificationStatus.UNSUBMITTED
    )


@pytest.fixture
def seller_user(db):
    return User.objects.create_user(
        username="seller_ama",
        email="ama.seller@example.com",
        password="Password123!",
        phone_number="0247654321",
        first_name="Ama",
        last_name="Osei",
        role="SELLER",
        is_email_verified=True,
        is_phone_verified=True,
        verification_status=VerificationStatus.APPROVED
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_manager",
        email="manager@hendaxis.com",
        password="AdminPassword123!",
        phone_number="0240001122",
        role="ADMIN",
        is_superuser=True,
        is_staff=True,
        is_email_verified=True,
        is_phone_verified=True
    )


@pytest.mark.django_db
def test_get_profile_distinguishes_buyer_and_seller(buyer_user, seller_user):
    # 1. Buyer profile
    client_buyer = TestClient(profile_router, headers=get_auth_headers(buyer_user))
    res_buyer = client_buyer.get("/")
    assert res_buyer.status_code == 200
    data_buyer = res_buyer.json()
    assert data_buyer["role"] == "BUYER"
    assert data_buyer["username"] == "buyer_kofi"
    assert data_buyer["first_name"] == "Kofi"
    assert data_buyer["last_name"] == "Mensah"
    assert data_buyer["verification_status"] == VerificationStatus.UNSUBMITTED

    # 2. Seller profile
    client_seller = TestClient(profile_router, headers=get_auth_headers(seller_user))
    res_seller = client_seller.get("/")
    assert res_seller.status_code == 200
    data_seller = res_seller.json()
    assert data_seller["role"] == "SELLER"
    assert data_seller["username"] == "seller_ama"
    assert data_seller["verification_status"] == VerificationStatus.APPROVED


@pytest.mark.django_db
def test_buyer_patch_profile_personal_info_only(buyer_user):
    client = TestClient(profile_router, headers=get_auth_headers(buyer_user))

    res = client.patch("/", json={
        "first_name": "Kwame",
        "last_name": "Appiah"
    })

    assert res.status_code == 200
    buyer_user.refresh_from_db()
    assert buyer_user.first_name == "Kwame"
    assert buyer_user.last_name == "Appiah"
    assert buyer_user.role == "BUYER"


@pytest.mark.django_db
def test_buyer_submit_verification_auto_verify_upgrades_to_seller(buyer_user, settings):
    settings.ENABLE_GHANA_CARD_AUTO_VERIFY = True
    settings.GHANA_CARD_VERIFY_PROVIDER = 'MOCK'

    client = TestClient(profile_router, headers=get_auth_headers(buyer_user))

    # Submit valid Ghana Card (GHA-123456789-0 is mock-verified by default)
    res = client.post("/submit-verification", json={
        "national_id_number": "GHA-123456789-0",
        "national_id_photo_url": "data:image/webp;base64,mockphotodata",
        "business_license_photo_url": "data:image/webp;base64,mocklicensedata"
    })

    assert res.status_code == 200
    assert "upgraded to a Verified Seller" in res.json()["message"]

    buyer_user.refresh_from_db()
    assert buyer_user.role == "SELLER"
    assert buyer_user.verification_status == VerificationStatus.APPROVED
    assert buyer_user.verified_at is not None
    assert buyer_user.national_id_number == "GHA-123456789-0"


@pytest.mark.django_db
def test_buyer_submit_verification_pending_review_keeps_buyer_until_approval(buyer_user, settings):
    settings.ENABLE_GHANA_CARD_AUTO_VERIFY = True
    settings.GHANA_CARD_VERIFY_PROVIDER = 'MOCK'

    client = TestClient(profile_router, headers=get_auth_headers(buyer_user))

    # GHA-999999999-9 mock-fails auto-verify and goes to pending review
    res = client.post("/submit-verification", json={
        "national_id_number": "GHA-999999999-9",
        "national_id_photo_url": "data:image/webp;base64,mockphotodata"
    })

    assert res.status_code == 200
    assert "forwarded to platform managers for review" in res.json()["message"]

    buyer_user.refresh_from_db()
    assert buyer_user.role == "BUYER"
    assert buyer_user.verification_status == VerificationStatus.PENDING
    assert buyer_user.verified_at is None


@pytest.mark.django_db
@patch("apps.core.tasks.dispatch_sms_task.delay")
@patch("apps.core.tasks.dispatch_email_task.delay")
def test_admin_approve_verification_upgrades_buyer_to_seller(mock_email, mock_sms, buyer_user, admin_user):
    buyer_user.verification_status = VerificationStatus.PENDING
    buyer_user.national_id_number = "GHA-555555555-1"
    buyer_user.save()

    client = TestClient(admin_router, headers=get_auth_headers(admin_user))

    res = client.post(f"/verifications/{buyer_user.id}/approve")
    assert res.status_code == 200
    assert "verified" in res.json()["message"].lower()

    buyer_user.refresh_from_db()
    assert buyer_user.role == "SELLER"
    assert buyer_user.verification_status == VerificationStatus.APPROVED
    assert buyer_user.verified_at is not None


@pytest.mark.django_db
@patch("apps.core.tasks.dispatch_sms_task.delay")
def test_admin_reject_verification_keeps_buyer_role(mock_sms, buyer_user, admin_user):
    buyer_user.verification_status = VerificationStatus.PENDING
    buyer_user.national_id_number = "GHA-555555555-1"
    buyer_user.save()

    client = TestClient(admin_router, headers=get_auth_headers(admin_user))

    res = client.post(f"/verifications/{buyer_user.id}/reject", json={
        "reason": "The uploaded photo is too blurry to read."
    })

    assert res.status_code == 200
    assert "rejected" in res.json()["message"].lower()

    buyer_user.refresh_from_db()
    assert buyer_user.role == "BUYER"
    assert buyer_user.verification_status == VerificationStatus.REJECTED
    assert buyer_user.verification_rejection_reason == "The uploaded photo is too blurry to read."
