import json
from typing import Optional
from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.models import DeliveryLog
from apps.delivery.services import transition_to_inspection
from apps.delivery.tracking import verify_and_process_carrier_webhook
from apps.notifications.services import log_webhook_event
from hendaxis_trust.settings import env

webhooks_router = Router(tags=["Webhooks"])

class CourierStatusWebhookSchema(Schema):
    transaction_id: Optional[str] = None
    tracking_number: Optional[str] = None
    status: str
    carrier_code: Optional[str] = 'OTHERS'


def _process_delivery_event(tracking_number: Optional[str], transaction_id: Optional[str], is_delivered: bool, carrier_code: str, raw_payload: dict):
    transaction = None
    provider_name = "COURIER_API" if carrier_code == "OTHERS" else f"COURIER_{carrier_code}"

    if tracking_number:
        log = DeliveryLog.objects.filter(tracking_number=tracking_number).select_related('transaction').order_by('-created_at').first()
        if log:
            transaction = log.transaction

    if not transaction and transaction_id:
        transaction = Transaction.objects.filter(id=transaction_id).first()

    if not transaction:
        evt_type = raw_payload.get('status', 'STATUS_UPDATE')
        log_webhook_event(provider=provider_name, event_type=evt_type, payload=raw_payload, status_code=500, error_message="No transaction or log found for tracking_number / transaction_id")
        raise HttpError(404, "Transaction not found")

    if is_delivered and transaction.status == TransactionStatus.DELIVERY_IN_PROGRESS:
        transition_to_inspection(transaction)
        from apps.core.tasks import dispatch_sms_task, dispatch_email_task
        msg = (
            f"Your HendAxis Trust package ({transaction.paystack_reference}) has been marked DELIVERED by {carrier_code}! "
            f"Your inspection period has started."
        )
        dispatch_sms_task.delay(transaction.buyer_phone, msg)
        if transaction.buyer_email:
            dispatch_email_task.delay(transaction.buyer_email, "Package Delivered - Inspection Started", msg)

        log_webhook_event(provider=provider_name, event_type="DELIVERED", payload=raw_payload, status_code=200)
        return {"status": "success", "message": "Transaction transitioned to INSPECTION_PERIOD"}

    log_webhook_event(provider=provider_name, event_type="STATUS_UPDATE", payload=raw_payload, status_code=200)
    return {"status": "received", "transaction_status": str(transaction.status)}


@webhooks_router.post("/courier-status")
def courier_status(request, payload: CourierStatusWebhookSchema):
    """
    Generic webhook for Courier API updates secured via X-Courier-Token.
    """
    try:
        raw_payload = json.loads(request.body) if request.body else payload.dict()
    except Exception:
        raw_payload = payload.dict()
        
    token = request.headers.get('x-courier-token')
    secret = env('COURIER_WEBHOOK_SECRET', default='secret_courier_key')
    if secret and token != secret:
        log_webhook_event("COURIER_API", "UNAUTHORIZED", raw_payload, 401, "Invalid X-Courier-Token")
        raise HttpError(401, "Unauthorized")

    is_delivered = payload.status.upper() in ["DELIVERED", "OK", "SUCCESS", "COMPLETED"]
    return _process_delivery_event(
        tracking_number=payload.tracking_number,
        transaction_id=payload.transaction_id,
        is_delivered=is_delivered,
        carrier_code=payload.carrier_code or 'OTHERS',
        raw_payload=raw_payload
    )


@webhooks_router.post("/dhl")
def dhl_webhook(request):
    """Webhook for DHL Express Shipment Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('DHL', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='DHL',
        raw_payload=payload
    )


@webhooks_router.post("/fedex")
def fedex_webhook(request):
    """Webhook for FedEx Shipment Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('FEDEX', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='FEDEX',
        raw_payload=payload
    )


@webhooks_router.post("/ups")
def ups_webhook(request):
    """Webhook for UPS Shipment Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('UPS', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='UPS',
        raw_payload=payload
    )


@webhooks_router.post("/ems")
def ems_webhook(request):
    """Webhook for EMS / Postal Shipment Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('EMS', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='EMS',
        raw_payload=payload
    )


@webhooks_router.post("/speedaf")
def speedaf_webhook(request):
    """Webhook for Speedaf Express Shipment Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('SPEEDAF', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='SPEEDAF',
        raw_payload=payload
    )


@webhooks_router.post("/universal")
def universal_webhook(request):
    """Universal Webhook for 17TRACK / ShipEngine Multi-Carrier Tracking Updates"""
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        raise HttpError(400, "Invalid JSON body")

    event = verify_and_process_carrier_webhook('UNIVERSAL', payload)
    return _process_delivery_event(
        tracking_number=event['tracking_number'],
        transaction_id=None,
        is_delivered=event['is_delivered'],
        carrier_code='UNIVERSAL',
        raw_payload=payload
    )
