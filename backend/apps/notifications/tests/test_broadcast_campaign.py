import pytest
from unittest.mock import patch
from decimal import Decimal
from apps.users.models import User
from apps.notifications.models import BroadcastCampaign, BroadcastCampaignStatus
from apps.core.tasks import process_broadcast_campaign_task
from ninja.testing import TestClient
from apps.escrow.api import admin_router

from ninja_jwt.tokens import AccessToken

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="campaign_admin",
        email="admin@test.com",
        password="password123",
        role="ADMIN"
    )

@pytest.fixture
def admin_client(admin_user):
    token = str(AccessToken.for_user(admin_user))
    client = TestClient(admin_router)
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.mark.django_db
@patch('apps.core.tasks.process_broadcast_campaign_task.delay')
def test_create_and_cancel_broadcast_campaign(mock_delay, admin_client, admin_user):
    mock_delay.return_value.id = "mock-task-id"
    # 1. Create a campaign via endpoint
    payload = {
        "target_group": "CUSTOM",
        "channels": "BOTH",
        "subject": "Test Urgent Announcement",
        "message": "This is a test broadcast message.",
        "custom_recipients": "test1@example.com, test2@example.com, 0241000000"
    }

    res = admin_client.post("/broadcast-message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "campaign_id" in data
    campaign_id = data["campaign_id"]

    campaign = BroadcastCampaign.objects.get(id=campaign_id)
    assert campaign.subject == "Test Urgent Announcement"

    # 2. Cancel campaign via endpoint
    cancel_res = admin_client.post(f"/broadcast-campaigns/{campaign_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    campaign.refresh_from_db()
    assert campaign.status == BroadcastCampaignStatus.CANCELLED

    # 3. Running campaign task on cancelled campaign does nothing
    process_broadcast_campaign_task.run(campaign_id)
    campaign.refresh_from_db()
    assert campaign.status == BroadcastCampaignStatus.CANCELLED
    assert campaign.sent_email_count == 0
