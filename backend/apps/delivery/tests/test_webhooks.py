import pytest
import uuid
from ninja.testing import TestClient
from django.conf import settings
from apps.delivery.webhooks import webhooks_router
from apps.notifications.models import WebhookEventLog

@pytest.fixture
def courier_client():
    return TestClient(webhooks_router)

@pytest.mark.django_db
def test_courier_webhook_missing_token(courier_client):
    res = courier_client.post("/courier-status", json={"transaction_id": str(uuid.uuid4()), "status": "DELIVERED"})
    assert res.status_code == 401
    
    log = WebhookEventLog.objects.filter(provider="COURIER_API").last()
    assert log.response_status_code == 401
    assert log.error_message == "Invalid X-Courier-Token"

@pytest.mark.django_db
def test_courier_webhook_invalid_token(courier_client):
    res = courier_client.post("/courier-status", json={"transaction_id": str(uuid.uuid4()), "status": "DELIVERED"}, headers={"x-courier-token": "bad_token"})
    assert res.status_code == 401

@pytest.mark.django_db
def test_courier_webhook_valid_token(courier_client):
    from hendaxis_trust.settings import env
    secret = env('COURIER_WEBHOOK_SECRET', default='secret_courier_key')
    # Since transaction doesn't exist, it will hit the 404 block and log a 500
    # but the 401 check will pass!
    res = courier_client.post("/courier-status", json={"transaction_id": str(uuid.uuid4()), "status": "DELIVERED"}, headers={"x-courier-token": secret})
    assert res.status_code == 404
