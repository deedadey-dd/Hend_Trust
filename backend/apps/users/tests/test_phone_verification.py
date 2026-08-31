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
