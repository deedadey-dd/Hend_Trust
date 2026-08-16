import pytest
import hmac
import hashlib
import json
from ninja.testing import TestClient
from django.conf import settings
from apps.escrow.webhooks import escrow_webhooks_router
from apps.notifications.models import WebhookEventLog

@pytest.fixture
def paystack_client():
    return TestClient(escrow_webhooks_router)

@pytest.mark.django_db
def test_paystack_webhook_missing_signature(paystack_client):
    res = paystack_client.post("/paystack", json={"event": "charge.success"})
    assert res.status_code == 401
    assert "Missing signature" in res.json()['detail']
    
    log = WebhookEventLog.objects.filter(provider="PAYSTACK").last()
    assert log.response_status_code == 401

@pytest.mark.django_db
def test_paystack_webhook_invalid_signature(paystack_client):
    res = paystack_client.post("/paystack", json={"event": "charge.success"}, headers={"x-paystack-signature": "bad_sig"})
    assert res.status_code == 401
    assert "Invalid signature" in res.json()['detail']

@pytest.mark.django_db
def test_paystack_webhook_valid_signature(paystack_client):
    payload = {"event": "charge.success", "data": {"reference": "txn_123"}}
    body = json.dumps(payload).encode('utf-8')
    from hendaxis_trust.settings import env
    secret = env('PAYSTACK_SECRET_KEY', default='test_secret_key').encode('utf-8')
    computed_hmac = hmac.new(secret, body, hashlib.sha512).hexdigest()
    
    # In Ninja TestClient, passing body as string/bytes directly is tricky via json=, so we pass it as a raw request body or use headers properly
    # However, since Ninja serializes json= payloads directly, we can just rely on the framework to recreate it, but dict ordering might differ.
    # We will pass the exact JSON string.
    res = paystack_client.post("/paystack", data=json.dumps(payload), headers={"x-paystack-signature": computed_hmac, "Content-Type": "application/json"})
    assert res.status_code == 200
    assert res.json()['status'] == 'success'
    
    log = WebhookEventLog.objects.filter(provider="PAYSTACK").last()
    assert log.response_status_code == 200
    assert log.event_type == "charge.success"
