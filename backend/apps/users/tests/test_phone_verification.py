import pytest
from django.contrib.auth import get_user_model
from ninja.testing import TestClient
from apps.users.api import auth_router

User = get_user_model()

@pytest.mark.django_db
def test_seller_phone_otp_verification_flow():
    # 1. Create seller with unverified email & phone
    seller = User.objects.create_user(
        username="otpseller",
        email="otpseller@example.com",
        password="Password123!",
        phone_number="0241112233",
        role="SELLER",
        is_email_verified=False,
        is_phone_verified=False
    )

    client = TestClient(auth_router)

    # 2. Login fails prior to email verification
    login_res1 = client.post("/login", json={"username": "otpseller", "password": "Password123!"})
    assert login_res1.status_code == 403
    assert "activate your account" in login_res1.json()["detail"]

    # 3. Simulate email activation
    seller.is_email_verified = True
    seller.save(update_fields=['is_email_verified'])

    # 4. Login fails prior to phone verification and returns PHONE_VERIFICATION_REQUIRED with UID
    login_res2 = client.post("/login", json={"username": "otpseller", "password": "Password123!"})
    assert login_res2.status_code == 403
    assert "PHONE_VERIFICATION_REQUIRED" in login_res2.json()["detail"]

    seller.refresh_from_db()
    assert seller.phone_otp_code != ""  # Auto-generated OTP code

    # 5. Send Phone OTP endpoint
    send_res = client.post("/send-phone-otp", json={"email_or_username": "otpseller"})
    assert send_res.status_code == 200
    assert send_res.json()["is_phone_verified"] is False

    seller.refresh_from_db()
    otp_code = seller.phone_otp_code

    # 6. Verify Phone OTP with wrong code fails
    verify_bad = client.post("/verify-phone-otp", json={"email_or_username": "otpseller", "otp_code": "000000"})
    assert verify_bad.status_code == 400

    # 7. Verify Phone OTP with correct code succeeds
    verify_ok = client.post("/verify-phone-otp", json={"email_or_username": "otpseller", "otp_code": otp_code})
    assert verify_ok.status_code == 200
    assert verify_ok.json()["is_phone_verified"] is True

    seller.refresh_from_db()
    assert seller.is_phone_verified is True

    # 8. Login now succeeds fully
    login_res3 = client.post("/login", json={"username": "otpseller", "password": "Password123!"})
    assert login_res3.status_code == 200
    assert login_res3.json()["username"] == "otpseller"


@pytest.mark.django_db
def test_buyer_phone_login_with_unverified_email():
    # 1. Buyer created with verified phone but unverified email
    buyer = User.objects.create_user(
        username="buyer_0249998877",
        email="buyer99@example.com",
        password="BuyerSecurePass123!",
        phone_number="0249998877",
        role="BUYER",
        is_email_verified=False,
        is_phone_verified=True
    )

    client = TestClient(auth_router)

    # 2. Buyer can log in using their phone number directly
    login_phone = client.post("/login", json={"username": "0249998877", "password": "BuyerSecurePass123!"})
    assert login_phone.status_code == 200
    assert login_phone.json()["username"] == "buyer_0249998877"
    assert login_phone.json()["role"] == "BUYER"
    assert login_phone.json()["is_email_verified"] is False
    assert login_phone.json()["is_phone_verified"] is True

    # 3. Buyer can also log in using their email
    login_email = client.post("/login", json={"username": "buyer99@example.com", "password": "BuyerSecurePass123!"})
    assert login_email.status_code == 200
    assert login_email.json()["username"] == "buyer_0249998877"

    # 4. Buyer can log in using international phone format (+233249998877)
    login_intl = client.post("/login", json={"username": "+233249998877", "password": "BuyerSecurePass123!"})
    assert login_intl.status_code == 200
    assert login_intl.json()["username"] == "buyer_0249998877"


@pytest.mark.django_db
def test_buyer_quick_register_uniqueness_and_guest_choice():
    # 1. Pre-existing buyer
    existing = User.objects.create_user(
        username="buyer_0248887766",
        email="existing_buyer@example.com",
        password="ValidPassword123!",
        phone_number="0248887766",
        role="BUYER",
        is_email_verified=False,
        is_phone_verified=True
    )

    client = TestClient(auth_router)

    # 2. Quick register with existing email and password -> returns account_already_exists without logging in immediately
    res_prompt = client.post("/buyer-quick-register", json={
        "email": "existing_buyer@example.com",
        "phone_number": "0248887766",
        "password": "ValidPassword123!",
        "confirm_existing_login": False
    })
    assert res_prompt.status_code == 200
    assert res_prompt.json()["account_already_exists"] is True
    assert res_prompt.json()["username"] == "buyer_0248887766"

    # 3. Quick register with confirm_existing_login = True -> logs in
    res_login = client.post("/buyer-quick-register", json={
        "email": "existing_buyer@example.com",
        "phone_number": "0248887766",
        "password": "ValidPassword123!",
        "confirm_existing_login": True
    })
    assert res_login.status_code == 200
    assert res_login.json()["account_already_exists"] is False
    assert res_login.json()["is_phone_verified"] is True

    # 4. Quick register with wrong password -> returns 400 error
    res_err = client.post("/buyer-quick-register", json={
        "email": "existing_buyer@example.com",
        "phone_number": "0248887766",
        "password": "WrongPassword999!"
    })
    assert res_err.status_code == 400
    assert "already exists" in res_err.json()["detail"]


@pytest.mark.django_db
def test_check_account_exists():
    client = TestClient(auth_router)

    # 1. Non-existent account
    res_none = client.post("/check-account-exists", json={
        "email": "notfound@example.com",
        "phone_number": "0240000000"
    })
    assert res_none.status_code == 200
    assert res_none.json()["exists"] is False

    # 2. Existing buyer by email
    User.objects.create_user(
        username="buyer_check_1",
        email="foundbuyer@example.com",
        phone_number="0241234567",
        role="BUYER"
    )

    res_found_email = client.post("/check-account-exists", json={
        "email": "foundbuyer@example.com"
    })
    assert res_found_email.status_code == 200
    assert res_found_email.json()["exists"] is True
    assert res_found_email.json()["email"] == "foundbuyer@example.com"

    # 3. Existing buyer by international phone variant (+233241234567)
    res_found_phone = client.post("/check-account-exists", json={
        "phone_number": "+233241234567"
    })
    assert res_found_phone.status_code == 200
    assert res_found_phone.json()["exists"] is True


