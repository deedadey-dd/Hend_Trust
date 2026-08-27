from typing import Optional
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink
from apps.escrow.models import Transaction
from .auth import APIKeyAuth, WebhookDispatcher

v1_developer_router = Router(auth=APIKeyAuth())

# Schemas
class CreateEscrowOrderSchema(Schema):
    title: str
    price_ghs: float
    shipping_fee_ghs: float = 0.0
    description: Optional[str] = ""
    buyer_name: Optional[str] = ""
    buyer_email: Optional[str] = ""
    buyer_phone: Optional[str] = ""
    shipping_address: Optional[str] = ""
    custom_order_reference: Optional[str] = None

class EscrowOrderResponseSchema(Schema):
    transaction_id: str
    escrow_reference: str
    checkout_url: str
    title: str
    price_ghs: float
    shipping_fee_ghs: float
    total_amount_ghs: float
    status: str
    custom_order_reference: Optional[str] = None
    created_at: str

class EscrowStatusDetailSchema(Schema):
    transaction_id: str
    escrow_reference: str
    status: str
    status_label: str
    title: str
    total_amount_ghs: float
    buyer_email: str
    shipping_address: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_method: Optional[str] = None
    waybill_photo_url: Optional[str] = None
    inspection_starts_at: Optional[str] = None
    created_at: str

class DispatchOrderSchema(Schema):
    delivery_method: str = "COURIER_API" # COURIER_API | INFORMAL_BUS
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    waybill_photo_url: Optional[str] = None


# ─── Public REST API Endpoints for Developers ────────────────────────────────

@v1_developer_router.post("/escrow/create", response=EscrowOrderResponseSchema)
def create_escrow_order(request, data: CreateEscrowOrderSchema):
    user = request.auth_user
    
    # 1. Create Payment Link
    link = PaymentLink.objects.create(
        seller=user,
        title=data.title.strip(),
        description=data.description.strip() if data.description else "",
        price_ghs=data.price_ghs,
        shipping_fee_ghs=data.shipping_fee_ghs,
        fee_handling="PASS_TO_BUYER",
        is_active=True
    )

    gross_total = float(data.price_ghs) + float(data.shipping_fee_ghs)
    platform_fee = (gross_total * 0.015) + 10.0
    total_amount = gross_total + platform_fee

    # 2. Create Escrow Transaction
    ref = f"DEV-{link.id.hex[:6].upper()}"
    txn = Transaction.objects.create(
        link=link,
        total_amount_ghs=total_amount,
        platform_fee_ghs=platform_fee,
        buyer_name=data.buyer_name or "API Customer",
        buyer_email=data.buyer_email or "",
        buyer_phone=data.buyer_phone or "",
        shipping_address=data.shipping_address or "",
        status="AWAITING_PAYMENT",
        paystack_reference=ref
    )

    checkout_url = f"https://trust.hendaxis.com/l/{link.id}?reference={txn.paystack_reference}"

    return {
        "transaction_id": str(txn.id),
        "escrow_reference": txn.paystack_reference,
        "checkout_url": checkout_url,
        "title": link.title,
        "price_ghs": float(data.price_ghs),
        "shipping_fee_ghs": float(data.shipping_fee_ghs),
        "total_amount_ghs": float(txn.total_amount_ghs),
        "status": txn.status,
        "custom_order_reference": data.custom_order_reference,
        "created_at": txn.created_at.isoformat() if hasattr(txn, 'created_at') else link.created_at.isoformat()
    }


@v1_developer_router.get("/escrow/{transaction_id}", response=EscrowStatusDetailSchema)
def get_escrow_status(request, transaction_id: str):
    user = request.auth_user
    txn = get_object_or_404(Transaction, id=transaction_id, link__seller=user)

    status_labels = {
        'AWAITING_PAYMENT': 'Awaiting Payment',
        'PAYMENT_RECEIVED': 'Awaiting Shipping',
        'DELIVERY_IN_PROGRESS': 'In Transit',
        'INSPECTION_PERIOD': 'Inspection Mode',
        'COMPLETED': 'Completed & Released',
        'DISPUTED': 'Under Dispute',
        'REFUNDED': 'Refunded',
        'CANCELLED': 'Cancelled'
    }

    return {
        "transaction_id": str(txn.id),
        "escrow_reference": txn.paystack_reference,
        "status": txn.status,
        "status_label": status_labels.get(txn.status, txn.status),
        "title": txn.link.title,
        "total_amount_ghs": float(txn.total_amount_ghs),
        "buyer_email": txn.buyer_email,
        "shipping_address": txn.shipping_address,
        "courier_name": getattr(txn, 'courier_name', None),
        "tracking_number": getattr(txn, 'tracking_number', None),
        "delivery_method": getattr(txn, 'delivery_method', None),
        "waybill_photo_url": getattr(txn, 'waybill_photo_url', None),
        "inspection_starts_at": txn.inspection_starts_at.isoformat() if txn.inspection_starts_at else None,
        "created_at": txn.link.created_at.isoformat()
    }


@v1_developer_router.post("/escrow/{transaction_id}/dispatch")
def dispatch_escrow_order(request, transaction_id: str, data: DispatchOrderSchema):
    user = request.auth_user
    txn = get_object_or_404(Transaction, id=transaction_id, link__seller=user)

    if txn.status not in ['PAYMENT_RECEIVED', 'AWAITING_PAYMENT']:
        return request.create_response(
            {"detail": f"Cannot dispatch order in state {txn.status}"},
            status=400
        )

    txn.delivery_method = data.delivery_method
    if data.delivery_method == 'COURIER_API':
        txn.courier_name = data.courier_name or 'Express Courier'
        txn.tracking_number = data.tracking_number or ''
    else:
        txn.driver_phone = data.driver_phone or ''
        txn.driver_car_number = data.driver_car_number or ''
        txn.destination_station = data.destination_station or ''

    if data.waybill_photo_url:
        txn.waybill_photo_url = data.waybill_photo_url

    from django.utils import timezone
    txn.status = 'DELIVERY_IN_PROGRESS'
    txn.dispatched_at = timezone.now()
    txn.save()

    # Trigger Webhook Event
    WebhookDispatcher.dispatch_event(
        user=user,
        event_type="escrow.dispatched",
        data={
            "transaction_id": str(txn.id),
            "escrow_reference": txn.paystack_reference,
            "delivery_method": txn.delivery_method,
            "courier_name": txn.courier_name,
            "tracking_number": txn.tracking_number,
            "status": txn.status
        }
    )

    return {"message": "Order marked as dispatched successfully.", "status": txn.status}
