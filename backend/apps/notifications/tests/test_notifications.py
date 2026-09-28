import pytest
import uuid
from ninja.testing import TestClient
from unittest.mock import patch

from apps.users.models import User, Role
from apps.notifications.models import NotificationLog, WebhookEventLog, NotificationType
from apps.notifications.services import create_notification, is_otp_message, derive_action_url
from apps.notifications.api import notifications_router
from apps.delivery.webhooks import webhooks_router

@pytest.fixture
def auth_user(db):
    return User.objects.create_user(username="notif_user", email="notif_user@example.com", phone_number="0241234567")

@pytest.fixture
def notif_client(auth_user):
    from ninja_jwt.tokens import AccessToken
    token = str(AccessToken.for_user(auth_user))
    return TestClient(notifications_router, headers={"Authorization": f"Bearer {token}"})

@pytest.fixture
def webhook_client():
    return TestClient(webhooks_router)

@pytest.mark.django_db
def test_create_and_fetch_notifications(auth_user, notif_client):
    create_notification(auth_user, "Welcome", "Hello!", NotificationType.IN_APP)
    create_notification(auth_user, "Alert", "Something happened", NotificationType.SMS)
    
    # Mark second as read
    n2 = NotificationLog.objects.get(title="Alert")
    n2.is_read = True
    n2.save()
    
    # Fetch all
    res = notif_client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data['total_count'] == 2
    assert data['unread_count'] == 1
    assert len(data['items']) == 2
    
    # Fetch unread only
    res_unread = notif_client.get("/?unread_only=true")
    assert res_unread.status_code == 200
    data_unread = res_unread.json()
    assert len(data_unread['items']) == 1
    assert data_unread['items'][0]['title'] == "Welcome"

@pytest.mark.django_db
def test_notification_filters_and_search(auth_user, notif_client):
    create_notification(auth_user, "Order Shipped", "Package TRK-999 is on the way", NotificationType.EMAIL)
    create_notification(auth_user, "Payout Disbursed", "Your GHS 500 payout was sent", NotificationType.SMS)
    create_notification(auth_user, "Arbiter Note", "Arbiter requested evidence for dispute", NotificationType.IN_APP)

    # Filter by channel
    res_email = notif_client.get("/?channel=EMAIL")
    assert res_email.status_code == 200
    assert len(res_email.json()['items']) == 1
    assert res_email.json()['items'][0]['title'] == "Order Shipped"

    # Search by keyword
    res_search = notif_client.get("/?search=payout")
    assert res_search.status_code == 200
    assert len(res_search.json()['items']) == 1
    assert res_search.json()['items'][0]['title'] == "Payout Disbursed"

@pytest.mark.django_db
def test_unread_count_endpoint(auth_user, notif_client):
    create_notification(auth_user, "Notif 1", "Msg 1")
    create_notification(auth_user, "Notif 2", "Msg 2")

    res = notif_client.get("/unread-count")
    assert res.status_code == 200
    assert res.json()['unread_count'] == 2

@pytest.mark.django_db
def test_mark_notification_read_and_mark_all(auth_user, notif_client):
    n1 = create_notification(auth_user, "Update 1", "Please read this")
    n2 = create_notification(auth_user, "Update 2", "Another update")
    assert not n1.is_read
    assert not n2.is_read
    
    # Mark single read
    res = notif_client.patch(f"/{n1.id}/read")
    assert res.status_code == 200
    assert res.json()['unread_count'] == 1
    
    n1.refresh_from_db()
    assert n1.is_read

    # Mark all read
    res_all = notif_client.post("/mark-all-read")
    assert res_all.status_code == 200
    assert res_all.json()['unread_count'] == 0

    n2.refresh_from_db()
    assert n2.is_read

@pytest.mark.django_db
def test_delete_and_clear_read_notifications(auth_user, notif_client):
    n1 = create_notification(auth_user, "Old 1", "Msg 1")
    n2 = create_notification(auth_user, "Old 2", "Msg 2")
    n1.is_read = True
    n1.save()

    # Clear read notifications
    res_clear = notif_client.delete("/clear-read")
    assert res_clear.status_code == 200
    assert NotificationLog.objects.filter(user=auth_user).count() == 1

    # Delete single notification
    res_del = notif_client.delete(f"/{n2.id}")
    assert res_del.status_code == 200
    assert NotificationLog.objects.filter(user=auth_user).count() == 0

@pytest.mark.django_db
def test_is_otp_message_and_derive_action_url(auth_user):
    assert is_otp_message("Delivery Confirmation Code", "Your 6-digit code is 123456") is True
    assert is_otp_message("Phone Verification", "Your HendAxis verification code is 888999") is True
    assert is_otp_message("Order Shipped", "Your order ORD-123 is on the way") is False

    # Check OTP exclusion in create_notification
    res_otp = create_notification(auth_user, "Verification Code", "Your code is 123456")
    assert res_otp is None

    # Check action URL derivation
    assert "/track?code=" in derive_action_url("Order Shipped", "Order #ORD-123 has been shipped")
    assert "/dashboard?tab=seller_reviews" in derive_action_url("New Customer Rating", "Buyer left a 5-star review")
    assert "/referrals" in derive_action_url("Referral Reward", "You earned a cash reward of GHS 50")

@pytest.mark.django_db
def test_webhook_event_logging(webhook_client):
    payload = {
        "transaction_id": str(uuid.uuid4()),
        "status": "DELIVERED",
        "tracking_number": "TRK123"
    }
    
    res = webhook_client.post("/courier-status", json=payload, headers={"x-courier-token": "secret_courier_key"})
    assert res.status_code == 404
    
    log = WebhookEventLog.objects.first()
    assert log is not None
    assert log.provider == "COURIER_API"
    assert log.event_type == "DELIVERED"
    assert log.response_status_code == 500
    assert log.payload == payload

@pytest.mark.django_db
def test_staff_work_assignment_notifications(auth_user):
    arbiter_staff = User.objects.create_user(
        username="arbiter_john",
        email="arbiter@hendaxis.com",
        phone_number="0249998888",
        is_staff=True,
        role=Role.ARBITER
    )
    
    # 1. Dispute Assignment Notification
    n_dispute = create_notification(
        user=arbiter_staff,
        title="Dispute Arbitration Assigned: DISP-1001",
        message="You have been designated as the primary arbiter for dispute DISP-1001.",
        notif_type=NotificationType.IN_APP,
        action_url="/admin-portal/dashboard?tab=disputes&dispute_id=DISP-1001",
        metadata={
            "task_type": "DISPUTE_ASSIGNMENT",
            "dispute_id": "DISP-1001",
            "assigned_by": auth_user.username
        }
    )
    assert n_dispute is not None
    assert n_dispute.metadata.get("task_type") == "DISPUTE_ASSIGNMENT"
    assert n_dispute.action_url == "/admin-portal/dashboard?tab=disputes&dispute_id=DISP-1001"

    # 2. KYC Verification Alert Notification
    n_kyc = create_notification(
        user=arbiter_staff,
        title="KYC Verification Review: merchant_kwame",
        message="Seller merchant_kwame submitted verification documents for manual compliance review.",
        notif_type=NotificationType.IN_APP,
        action_url="/admin-portal/dashboard?tab=verifications",
        metadata={
            "task_type": "KYC_VERIFICATION",
            "seller_username": "merchant_kwame"
        }
    )
    assert n_kyc is not None
    assert n_kyc.metadata.get("task_type") == "KYC_VERIFICATION"

    # 3. Suspension Appeal Alert Notification
    n_appeal = create_notification(
        user=arbiter_staff,
        title="Suspension Appeal Submitted: merchant_ama",
        message="Suspended seller merchant_ama submitted an appeal.",
        notif_type=NotificationType.IN_APP,
        action_url="/admin-portal/dashboard?tab=appeals",
        metadata={
            "task_type": "SUSPENSION_APPEAL",
            "seller_username": "merchant_ama"
        }
    )
    assert n_appeal is not None
    assert n_appeal.metadata.get("task_type") == "SUSPENSION_APPEAL"

    # 4. Fetching via API with staff user token
    from ninja_jwt.tokens import AccessToken
    staff_token = str(AccessToken.for_user(arbiter_staff))
    staff_client = TestClient(notifications_router, headers={"Authorization": f"Bearer {staff_token}"})

    res = staff_client.get("/")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 3

    # Check search finds dispute assignment
    res_search = staff_client.get("/?search=DISP-1001")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) == 1
    assert res_search.json()["items"][0]["title"] == "Dispute Arbitration Assigned: DISP-1001"

