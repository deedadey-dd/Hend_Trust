from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.services import transition_to_inspection
from typing import Optional

webhooks_router = Router(tags=["Webhooks"])

class CourierStatusWebhookSchema(Schema):
    transaction_id: str
    status: str
    tracking_number: Optional[str] = None

from apps.notifications.services import log_webhook_event
import json

from hendaxis_trust.settings import env

@webhooks_router.post("/courier-status")
def courier_status(request, payload: CourierStatusWebhookSchema):
    """
    Webhook for Courier API updates secured via X-Courier-Token.
    Logs every raw payload to WebhookEventLog.
    """
    try:
        raw_payload = json.loads(request.body) if request.body else payload.dict()
    except Exception:
        raw_payload = payload.dict()
        
    token = request.headers.get('x-courier-token')
    if not token or token != env('COURIER_WEBHOOK_SECRET', default='secret_courier_key'):
        log_webhook_event("COURIER_API", "UNAUTHORIZED", raw_payload, 401, "Invalid X-Courier-Token")
        from ninja.errors import HttpError
        raise HttpError(401, "Unauthorized")
        
    try:
        transaction = get_object_or_404(Transaction, id=payload.transaction_id)
        
        if payload.status == "DELIVERED" and transaction.status == TransactionStatus.DELIVERY_IN_PROGRESS:
            transition_to_inspection(transaction)
            from apps.escrow.api import _notify_buyer_inspection_started
            _notify_buyer_inspection_started(transaction)
            
        log_webhook_event(
            provider="COURIER_API",
            event_type=payload.status,
            payload=raw_payload,
            status_code=200
        )
        return {"status": "success"}
    except Exception as e:
        log_webhook_event(
            provider="COURIER_API",
            event_type=payload.status,
            payload=raw_payload,
            status_code=500,
            error_message=str(e)
        )
        raise e
