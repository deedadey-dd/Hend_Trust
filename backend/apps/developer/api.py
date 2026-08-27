from typing import List, Optional
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from .models import DeveloperAPIKey, WebhookEndpoint, WebhookDeliveryLog
from .auth import WebhookDispatcher

developer_router = Router(tags=["Developer Portal"], auth=JWTCookieAuth())

# Schemas
class CreateAPIKeySchema(Schema):
    name: str
    environment: str = "TEST" # LIVE | TEST

class APIKeyResponseSchema(Schema):
    id: str
    name: str
    environment: str
    public_key: str
    secret_prefix: str
    is_active: bool
    created_at: str
    last_used_at: Optional[str] = None
    raw_secret_key: Optional[str] = None # Only present during creation!

class WebhookEndpointSchema(Schema):
    url: str
    events: Optional[List[str]] = None

class WebhookResponseSchema(Schema):
    id: str
    url: str
    secret: str
    events: List[str]
    is_active: bool
    created_at: str

class WebhookLogSchema(Schema):
    id: str
    event_type: str
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    delivered_at: str
    success: bool


# ─── API Key Management Endpoints ───────────────────────────────────────────

@developer_router.post("/keys", response=APIKeyResponseSchema)
def create_api_key(request, data: CreateAPIKeySchema):
    if data.environment.upper() not in ['LIVE', 'TEST']:
        data.environment = 'TEST'
    
    key_obj, raw_secret_key = DeveloperAPIKey.generate_keys(
        user=request.user,
        name=data.name.strip(),
        environment=data.environment.upper()
    )

    return {
        "id": str(key_obj.id),
        "name": key_obj.name,
        "environment": key_obj.environment,
        "public_key": key_obj.public_key,
        "secret_prefix": key_obj.secret_prefix,
        "is_active": key_obj.is_active,
        "created_at": key_obj.created_at.isoformat(),
        "last_used_at": key_obj.last_used_at.isoformat() if key_obj.last_used_at else None,
        "raw_secret_key": raw_secret_key
    }


@developer_router.get("/keys", response=List[APIKeyResponseSchema])
def list_api_keys(request):
    keys = DeveloperAPIKey.objects.filter(user=request.user)
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "environment": k.environment,
            "public_key": k.public_key,
            "secret_prefix": k.secret_prefix,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat(),
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "raw_secret_key": None
        }
        for k in keys
    ]


@developer_router.delete("/keys/{key_id}")
def revoke_api_key(request, key_id: str):
    key_obj = get_object_or_404(DeveloperAPIKey, id=key_id, user=request.user)
    key_obj.is_active = False
    key_obj.save(update_fields=['is_active'])
    return {"message": "API key revoked successfully."}


# ─── Webhook Management Endpoints ───────────────────────────────────────────

@developer_router.post("/webhooks", response=WebhookResponseSchema)
def create_webhook(request, data: WebhookEndpointSchema):
    url = data.url.strip()
    if not url.startswith(('http://', 'https://')):
        return request.create_response({"detail": "Invalid URL protocol. Must start with http:// or https://"}, status=400)
    
    events = data.events if data.events else ["escrow.paid", "escrow.dispatched", "escrow.completed", "escrow.disputed", "escrow.refunded"]
    ep = WebhookEndpoint.create_endpoint(user=request.user, url=url, events=events)
    
    return {
        "id": str(ep.id),
        "url": ep.url,
        "secret": ep.secret,
        "events": ep.events,
        "is_active": ep.is_active,
        "created_at": ep.created_at.isoformat()
    }


@developer_router.get("/webhooks", response=List[WebhookResponseSchema])
def list_webhooks(request):
    endpoints = WebhookEndpoint.objects.filter(user=request.user)
    return [
        {
            "id": str(ep.id),
            "url": ep.url,
            "secret": ep.secret,
            "events": ep.events,
            "is_active": ep.is_active,
            "created_at": ep.created_at.isoformat()
        }
        for ep in endpoints
    ]


@developer_router.delete("/webhooks/{webhook_id}")
def delete_webhook(request, webhook_id: str):
    ep = get_object_or_404(WebhookEndpoint, id=webhook_id, user=request.user)
    ep.delete()
    return {"message": "Webhook endpoint deleted successfully."}


@developer_router.post("/webhooks/test")
def send_test_webhook(request):
    results = WebhookDispatcher.dispatch_event(
        user=request.user,
        event_type="test.event",
        data={
            "message": "This is a simulated test webhook event from HendAxis Trust Developer Portal.",
            "test": True,
            "sample_amount_ghs": 150.00
        }
    )
    return {"dispatched": len(results), "results": results}


@developer_router.get("/webhooks/{webhook_id}/logs", response=List[WebhookLogSchema])
def get_webhook_logs(request, webhook_id: str):
    ep = get_object_or_404(WebhookEndpoint, id=webhook_id, user=request.user)
    logs = WebhookDeliveryLog.objects.filter(webhook=ep)[:20]
    return [
        {
            "id": str(l.id),
            "event_type": l.event_type,
            "response_status": l.response_status,
            "response_body": l.response_body,
            "delivered_at": l.delivered_at.isoformat(),
            "success": l.success
        }
        for l in logs
    ]
