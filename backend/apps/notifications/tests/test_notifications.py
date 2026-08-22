import pytest
import uuid
from ninja.testing import TestClient
from unittest.mock import patch

from apps.users.models import User
from apps.notifications.models import NotificationLog, WebhookEventLog, NotificationType
from apps.notifications.services import create_notification
from apps.notifications.api import notifications_router
from apps.delivery.webhooks import webhooks_router

@pytest.fixture
def auth_user(db):
    return User.objects.create_user(username="notif_user", phone_number="999888777")

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
    assert len(data['items']) == 2
    
    # Fetch unread only
    res_unread = notif_client.get("/?unread_only=true")
    assert res_unread.status_code == 200
    data_unread = res_unread.json()
    assert len(data_unread['items']) == 1
    assert data_unread['items'][0]['title'] == "Welcome"

@pytest.mark.django_db
def test_mark_notification_read(auth_user, notif_client):
    n = create_notification(auth_user, "Update", "Please read this")
    assert not n.is_read
    
    res = notif_client.patch(f"/{n.id}/read")
    assert res.status_code == 200
    
    n.refresh_from_db()
    assert n.is_read

@pytest.mark.django_db
def test_webhook_event_logging(webhook_client):
    payload = {
        "transaction_id": str(uuid.uuid4()),
        "status": "DELIVERED",
        "tracking_number": "TRK123"
    }
    
    res = webhook_client.post("/courier-status", json=payload, headers={"x-courier-token": "secret_courier_key"})
    assert res.status_code == 404
    
    # Check that it logged
    log = WebhookEventLog.objects.first()
    assert log is not None
    assert log.provider == "COURIER_API"
    assert log.event_type == "DELIVERED"
    assert log.response_status_code == 500
    assert log.payload == payload
