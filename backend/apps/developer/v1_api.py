from typing import Optional, List
from decimal import Decimal
from django.db import models
from django.db.models import Q, Avg
from django.utils import timezone
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.models import DeliveryLog, DeliveryMethod, CarrierChoice
from apps.reviews.models import SellerReview
from apps.wallet.api import get_user_wallet
from .auth import APIKeyAuth, WebhookDispatcher

v1_developer_router = Router(auth=APIKeyAuth())

STATUS_LABELS = {
    'AWAITING_PAYMENT': 'Awaiting Payment',
    'PAYMENT_RECEIVED': 'Payment Received (Ready for Dispatch)',
    'DELIVERY_IN_PROGRESS': 'In Transit / Dispatched',
    'INSPECTION_PERIOD': 'Inspection Period Active',
    'COMPLETED': 'Completed & Payout Released',
    'DISPUTED': 'Under Active Dispute',
    'RETURN_IN_PROGRESS': 'Return In Progress',
    'CANCELLED': 'Cancelled',
    'REFUNDED': 'Refunded',
}


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PingResponseSchema(Schema):
    status: str
    environment: str
    merchant_id: str
    merchant_username: str
    merchant_name: str
    key_name: str
    public_key: str
    server_time: str
    version: str


class MerchantAccountSchema(Schema):
    merchant_id: str
    username: str
    email: str
    business_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_verified: bool
    verification_tier: str
    available_balance_ghs: float
    pending_escrow_ghs: float
    total_escrow_orders_count: int
    active_orders_count: int
    seller_rating: float
    total_reviews_count: int


class CreateEscrowOrderSchema(Schema):
    title: str
    price_ghs: float
    shipping_fee_ghs: float = 0.0
    fee_handling: str = "PASS_TO_BUYER"  # PASS_TO_BUYER | ABSORB_FEE
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    category: Optional[str] = ""
    buyer_name: Optional[str] = ""
    buyer_email: Optional[str] = ""
    buyer_phone: Optional[str] = ""
    shipping_address: Optional[str] = ""
    custom_order_reference: Optional[str] = None


class EscrowOrderResponseSchema(Schema):
    transaction_id: str
    escrow_reference: str
    checkout_url: str
    embed_url: str
    title: str
    description: Optional[str] = None
    price_ghs: float
    shipping_fee_ghs: float
    platform_fee_ghs: float
    total_amount_ghs: float
    fee_handling: str
    status: str
    status_label: str
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    custom_order_reference: Optional[str] = None
    created_at: str


class EscrowStatusDetailSchema(Schema):
    transaction_id: str
    escrow_reference: str
    status: str
    status_label: str
    title: str
    description: Optional[str] = None
    price_ghs: float
    shipping_fee_ghs: float
    platform_fee_ghs: float
    total_amount_ghs: float
    fee_handling: str
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    custom_order_reference: Optional[str] = None
    delivery_method: Optional[str] = None
    courier_name: Optional[str] = None
    carrier_code: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier_tracking_url: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    waybill_photo_url: Optional[str] = None
    dispatched_at: Optional[str] = None
    delivered_at: Optional[str] = None
    inspection_starts_at: Optional[str] = None
    inspection_period_hours: int = 48
    is_disputed: bool = False
    dispute_reason: Optional[str] = None
    created_at: str
    updated_at: str


class EscrowListResponseSchema(Schema):
    total: int
    limit: int
    offset: int
    orders: List[EscrowStatusDetailSchema]


class DispatchOrderSchema(Schema):
    delivery_method: str = "COURIER_API"  # COURIER_API | INFORMAL_BUS
    courier_name: Optional[str] = None
    carrier_code: Optional[str] = "OTHERS"  # DHL | FEDEX | UPS | EMS | SPEEDAF | OTHERS
    tracking_number: Optional[str] = None
    carrier_tracking_url: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    waybill_photo_url: Optional[str] = None


class CancelOrderSchema(Schema):
    reason: Optional[str] = "Cancelled by merchant via Developer API"


class CreatePaymentLinkSchema(Schema):
    title: str
    price_ghs: float
    shipping_fee_ghs: float = 0.0
    fee_handling: str = "PASS_TO_BUYER"
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    category: Optional[str] = ""


class PaymentLinkDetailSchema(Schema):
    id: str
    title: str
    description: Optional[str] = None
    price_ghs: float
    shipping_fee_ghs: float
    fee_handling: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_active: bool
    checkout_url: str
    created_at: str


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _format_transaction_detail(txn: Transaction) -> dict:
    link = txn.link
    delivery_log = txn.delivery_logs.order_by('-created_at').first() if hasattr(txn, 'delivery_logs') else None
    
    courier_name = None
    carrier_code = None
    tracking_number = None
    carrier_tracking_url = None
    driver_phone = None
    driver_car_number = None
    destination_station = None
    waybill_photo_url = None
    delivery_method = getattr(txn, 'delivery_method', None)

    if delivery_log:
        delivery_method = delivery_log.delivery_method
        courier_name = delivery_log.courier_name
        carrier_code = delivery_log.carrier_code
        tracking_number = delivery_log.tracking_number
        carrier_tracking_url = delivery_log.carrier_tracking_url
        driver_phone = delivery_log.driver_phone
        driver_car_number = delivery_log.driver_car_number
        destination_station = delivery_log.destination_station
        waybill_photo_url = delivery_log.waybill_photo_url

    price = float(link.price_ghs) if link else 0.0
    shipping = float(link.shipping_fee_ghs) if link else 0.0
    fee_handling = link.fee_handling if link else "PASS_TO_BUYER"

    return {
        "transaction_id": str(txn.id),
        "escrow_reference": txn.paystack_reference,
        "status": txn.status,
        "status_label": STATUS_LABELS.get(txn.status, txn.status),
        "title": link.title if link else "Escrow Order",
        "description": link.description if link else "",
        "price_ghs": price,
        "shipping_fee_ghs": shipping,
        "platform_fee_ghs": float(txn.platform_fee_ghs or 0.0),
        "total_amount_ghs": float(txn.total_amount_ghs or 0.0),
        "fee_handling": fee_handling,
        "buyer_name": txn.buyer_name or "",
        "buyer_email": txn.buyer_email or "",
        "buyer_phone": txn.buyer_phone or "",
        "shipping_address": txn.shipping_address or "",
        "custom_order_reference": txn.paystack_reference,
        "delivery_method": delivery_method,
        "courier_name": courier_name,
        "carrier_code": carrier_code,
        "tracking_number": tracking_number,
        "carrier_tracking_url": carrier_tracking_url,
        "driver_phone": driver_phone,
        "driver_car_number": driver_car_number,
        "destination_station": destination_station,
        "waybill_photo_url": waybill_photo_url,
        "dispatched_at": txn.dispatched_at.isoformat() if txn.dispatched_at else None,
        "delivered_at": txn.delivered_at.isoformat() if txn.delivered_at else None,
        "inspection_starts_at": txn.inspection_starts_at.isoformat() if txn.inspection_starts_at else None,
        "inspection_period_hours": 48,
        "is_disputed": txn.status == TransactionStatus.DISPUTED or bool(txn.disputed_at),
        "dispute_reason": txn.buyer_dispute_reason if txn.buyer_dispute_reason else None,
        "created_at": txn.created_at.isoformat() if hasattr(txn, 'created_at') else timezone.now().isoformat(),
        "updated_at": txn.updated_at.isoformat() if hasattr(txn, 'updated_at') else timezone.now().isoformat()
    }


def _resolve_transaction(user, transaction_id_or_ref: str) -> Transaction:
    """Finds transaction belonging to user by UUID or paystack_reference."""
    query = Q(link__seller=user) & (Q(id__iexact=transaction_id_or_ref) | Q(paystack_reference__iexact=transaction_id_or_ref))
    return get_object_or_404(Transaction, query)


# ─── Public REST API Endpoints for Developers ────────────────────────────────

@v1_developer_router.get("/ping", response=PingResponseSchema)
def ping_api(request):
    """
    Developer Ping & Authentication Health Check.
    Validates the provided API key, returns merchant identity and active environment.
    """
    user = request.auth_user
    api_key = getattr(request, 'api_key', None)

    return {
        "status": "ok",
        "environment": api_key.environment if api_key else "LIVE",
        "merchant_id": str(user.id),
        "merchant_username": user.username,
        "merchant_name": getattr(user, 'business_name', '') or user.get_full_name() or user.username,
        "key_name": api_key.name if api_key else "Default API Key",
        "public_key": api_key.public_key if api_key else "",
        "server_time": timezone.now().isoformat(),
        "version": "v1.0.0"
    }


@v1_developer_router.get("/merchant/account", response=MerchantAccountSchema)
def get_merchant_account(request):
    """
    Retrieves the authenticated merchant's account profile, escrow balances,
    verification status, and platform rating stats.
    """
    user = request.auth_user
    wallet = get_user_wallet(user)

    # Calculate pending escrow balance (funds in transit/inspection)
    pending_txs = Transaction.objects.filter(
        link__seller=user,
        status__in=[TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.INSPECTION_PERIOD]
    )
    pending_escrow_sum = sum(float(t.total_amount_ghs - t.platform_fee_ghs) for t in pending_txs)
    total_orders_count = Transaction.objects.filter(link__seller=user).count()
    active_orders_count = pending_txs.count()

    reviews = SellerReview.objects.filter(seller=user)
    reviews_count = reviews.count()
    avg_rating = float(reviews.aggregate(Avg('rating_overall'))['rating_overall__avg'] or 5.0) if reviews_count > 0 else 5.0

    return {
        "merchant_id": str(user.id),
        "username": user.username,
        "email": user.email or "",
        "business_name": getattr(user, 'business_name', None),
        "phone_number": getattr(user, 'phone_number', None),
        "is_verified": getattr(user, 'is_verified', False),
        "verification_tier": getattr(user, 'verification_tier', 'STANDARD'),
        "available_balance_ghs": float(wallet.available_balance_ghs if wallet else 0.0),
        "pending_escrow_ghs": round(pending_escrow_sum, 2),
        "total_escrow_orders_count": total_orders_count,
        "active_orders_count": active_orders_count,
        "seller_rating": round(avg_rating, 1),
        "total_reviews_count": reviews_count
    }


@v1_developer_router.post("/escrow/create", response=EscrowOrderResponseSchema)
def create_escrow_order(request, data: CreateEscrowOrderSchema):
    """
    Create a new Escrow Transaction Order.
    Generates a secured escrow checkout link and unique payment reference for your customer.
    """
    user = request.auth_user
    fee_handling = FeeHandling.ABSORB_FEE if data.fee_handling.upper() == "ABSORB_FEE" else FeeHandling.PASS_TO_BUYER

    # 1. Create Payment Link
    link = PaymentLink.objects.create(
        seller=user,
        title=data.title.strip(),
        description=data.description.strip() if data.description else "",
        price_ghs=Decimal(str(data.price_ghs)),
        shipping_fee_ghs=Decimal(str(data.shipping_fee_ghs)),
        fee_handling=fee_handling,
        image_url=data.image_url.strip() if data.image_url else "",
        category=data.category.strip() if data.category else "",
        is_active=True
    )

    gross_total = Decimal(str(data.price_ghs)) + Decimal(str(data.shipping_fee_ghs))
    platform_fee = ((gross_total * Decimal('0.015')) + Decimal('10.00')).quantize(Decimal('0.01'))
    
    if fee_handling == FeeHandling.PASS_TO_BUYER:
        total_amount = gross_total + platform_fee
    else:
        total_amount = gross_total

    # 2. Create Escrow Transaction
    custom_ref = data.custom_order_reference.strip() if data.custom_order_reference else None
    ref = custom_ref if custom_ref and not Transaction.objects.filter(paystack_reference=custom_ref).exists() else f"DEV-{link.id.hex[:8].upper()}"

    txn = Transaction.objects.create(
        link=link,
        total_amount_ghs=total_amount,
        platform_fee_ghs=platform_fee,
        buyer_name=data.buyer_name.strip() if data.buyer_name else "API Customer",
        buyer_email=data.buyer_email.strip() if data.buyer_email else "",
        buyer_phone=data.buyer_phone.strip() if data.buyer_phone else "",
        shipping_address=data.shipping_address.strip() if data.shipping_address else "",
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference=ref
    )

    checkout_url = f"https://trust.hendaxis.com/l/{link.id}?reference={txn.paystack_reference}"
    embed_url = f"https://trust.hendaxis.com/l/embed?pk={getattr(request, 'api_key', None).public_key if hasattr(request, 'api_key') and request.api_key else ''}&ref={txn.paystack_reference}"

    # Dispatch Webhook Event
    WebhookDispatcher.dispatch_event(
        user=user,
        event_type="escrow.created",
        data={
            "transaction_id": str(txn.id),
            "escrow_reference": txn.paystack_reference,
            "title": link.title,
            "total_amount_ghs": float(txn.total_amount_ghs),
            "status": txn.status,
            "checkout_url": checkout_url
        }
    )

    return {
        "transaction_id": str(txn.id),
        "escrow_reference": txn.paystack_reference,
        "checkout_url": checkout_url,
        "embed_url": embed_url,
        "title": link.title,
        "description": link.description,
        "price_ghs": float(data.price_ghs),
        "shipping_fee_ghs": float(data.shipping_fee_ghs),
        "platform_fee_ghs": float(platform_fee),
        "total_amount_ghs": float(txn.total_amount_ghs),
        "fee_handling": fee_handling,
        "status": txn.status,
        "status_label": STATUS_LABELS.get(txn.status, txn.status),
        "buyer_name": txn.buyer_name,
        "buyer_email": txn.buyer_email,
        "buyer_phone": txn.buyer_phone,
        "shipping_address": txn.shipping_address,
        "custom_order_reference": data.custom_order_reference,
        "created_at": txn.created_at.isoformat()
    }


@v1_developer_router.get("/escrow", response=EscrowListResponseSchema)
def list_escrow_orders(request, status: Optional[str] = None, q: Optional[str] = None, limit: int = 50, offset: int = 0):
    """
    List merchant escrow orders with filtering by status and text search.
    Supports pagination with `limit` (max 100) and `offset`.
    """
    user = request.auth_user
    limit = min(max(1, limit), 100)
    offset = max(0, offset)

    queryset = Transaction.objects.filter(link__seller=user).select_related('link').prefetch_related('delivery_logs')

    if status:
        status_clean = status.upper().strip()
        queryset = queryset.filter(status=status_clean)

    if q:
        q_clean = q.strip()
        queryset = queryset.filter(
            Q(paystack_reference__icontains=q_clean) |
            Q(buyer_name__icontains=q_clean) |
            Q(buyer_phone__icontains=q_clean) |
            Q(buyer_email__icontains=q_clean) |
            Q(link__title__icontains=q_clean)
        )

    total = queryset.count()
    orders = queryset.order_by('-created_at')[offset:offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "orders": [_format_transaction_detail(t) for t in orders]
    }


@v1_developer_router.get("/escrow/{transaction_id}", response=EscrowStatusDetailSchema)
def get_escrow_status(request, transaction_id: str):
    """
    Query real-time escrow transaction status, tracking logistics, delivery logs,
    and inspection window details. Accepts Transaction UUID or Escrow Reference.
    """
    user = request.auth_user
    txn = _resolve_transaction(user, transaction_id)
    return _format_transaction_detail(txn)


@v1_developer_router.post("/escrow/{transaction_id}/dispatch")
def dispatch_escrow_order(request, transaction_id: str, data: DispatchOrderSchema):
    """
    Mark an escrow transaction as dispatched.
    Supports Courier APIs (DHL, FedEx, Speedaf, Ghana Post, Fez) or Informal Bus Transport.
    Transitions status to DELIVERY_IN_PROGRESS and dispatches `escrow.dispatched` webhook.
    """
    user = request.auth_user
    txn = _resolve_transaction(user, transaction_id)

    if txn.status not in [TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.AWAITING_PAYMENT]:
        return request.create_response(
            {"detail": f"Cannot dispatch order in status '{txn.status}'. Must be in PAYMENT_RECEIVED."},
            status=400
        )

    method = DeliveryMethod.INFORMAL_BUS if data.delivery_method == DeliveryMethod.INFORMAL_BUS else DeliveryMethod.COURIER_API

    # Create Delivery Log
    delivery_log = DeliveryLog.objects.create(
        transaction=txn,
        delivery_method=method,
        courier_name=data.courier_name or ("Express Courier" if method == DeliveryMethod.COURIER_API else None),
        carrier_code=data.carrier_code if data.carrier_code in CarrierChoice.values else CarrierChoice.OTHERS,
        tracking_number=data.tracking_number or "",
        carrier_tracking_url=data.carrier_tracking_url or "",
        driver_phone=data.driver_phone or "",
        driver_car_number=data.driver_car_number or "",
        destination_station=data.destination_station or "",
        waybill_photo_url=data.waybill_photo_url or ""
    )

    txn.status = TransactionStatus.DELIVERY_IN_PROGRESS
    txn.dispatched_at = timezone.now()
    txn.save(update_fields=['status', 'dispatched_at', 'updated_at'])

    # Trigger Webhook Event
    WebhookDispatcher.dispatch_event(
        user=user,
        event_type="escrow.dispatched",
        data={
            "transaction_id": str(txn.id),
            "escrow_reference": txn.paystack_reference,
            "delivery_method": method,
            "courier_name": delivery_log.courier_name,
            "tracking_number": delivery_log.tracking_number,
            "driver_phone": delivery_log.driver_phone,
            "destination_station": delivery_log.destination_station,
            "status": txn.status
        }
    )

    return {
        "message": "Order marked as dispatched successfully.",
        "status": txn.status,
        "delivery_log_id": str(delivery_log.id)
    }


@v1_developer_router.post("/escrow/{transaction_id}/confirm-delivery")
def confirm_order_delivery(request, transaction_id: str):
    """
    Mark an escrow transaction as delivered.
    Initiates the 48-hour buyer inspection period (INSPECTION_PERIOD) and dispatches
    `escrow.delivered` and `escrow.inspection_started` webhooks.
    """
    user = request.auth_user
    txn = _resolve_transaction(user, transaction_id)

    if txn.status not in [TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.PAYMENT_RECEIVED]:
        return request.create_response(
            {"detail": f"Cannot confirm delivery for order in state '{txn.status}'."},
            status=400
        )

    now = timezone.now()
    txn.status = TransactionStatus.INSPECTION_PERIOD
    txn.delivered_at = now
    txn.inspection_starts_at = now
    txn.save(update_fields=['status', 'delivered_at', 'inspection_starts_at', 'updated_at'])

    # Trigger Webhooks
    WebhookDispatcher.dispatch_event(
        user=user,
        event_type="escrow.delivered",
        data={
            "transaction_id": str(txn.id),
            "escrow_reference": txn.paystack_reference,
            "status": txn.status,
            "delivered_at": txn.delivered_at.isoformat(),
            "inspection_starts_at": txn.inspection_starts_at.isoformat()
        }
    )

    return {
        "message": "Delivery confirmed. 48-hour buyer inspection period initiated.",
        "status": txn.status,
        "inspection_starts_at": txn.inspection_starts_at.isoformat()
    }


@v1_developer_router.post("/escrow/{transaction_id}/cancel")
def cancel_escrow_order(request, transaction_id: str, data: CancelOrderSchema):
    """
    Cancel an escrow transaction if it is in AWAITING_PAYMENT state.
    """
    user = request.auth_user
    txn = _resolve_transaction(user, transaction_id)

    if txn.status != TransactionStatus.AWAITING_PAYMENT:
        return request.create_response(
            {"detail": f"Cannot cancel order in status '{txn.status}'. Paid orders must undergo formal dispute resolution."},
            status=400
        )

    txn.status = TransactionStatus.CANCELLED
    txn.save(update_fields=['status', 'updated_at'])

    WebhookDispatcher.dispatch_event(
        user=user,
        event_type="escrow.cancelled",
        data={
            "transaction_id": str(txn.id),
            "escrow_reference": txn.paystack_reference,
            "reason": data.reason,
            "status": txn.status
        }
    )

    return {
        "message": "Escrow transaction cancelled successfully.",
        "status": txn.status
    }


# ─── Payment Links API ────────────────────────────────────────────────────────

@v1_developer_router.post("/links/create", response=PaymentLinkDetailSchema)
def create_payment_link(request, data: CreatePaymentLinkSchema):
    """
    Create a standalone reusable or direct Payment Link for storefronts or social commerce.
    """
    user = request.auth_user
    fee_handling = FeeHandling.ABSORB_FEE if data.fee_handling.upper() == "ABSORB_FEE" else FeeHandling.PASS_TO_BUYER

    link = PaymentLink.objects.create(
        seller=user,
        title=data.title.strip(),
        description=data.description.strip() if data.description else "",
        price_ghs=Decimal(str(data.price_ghs)),
        shipping_fee_ghs=Decimal(str(data.shipping_fee_ghs)),
        fee_handling=fee_handling,
        image_url=data.image_url.strip() if data.image_url else "",
        category=data.category.strip() if data.category else "",
        is_active=True
    )

    checkout_url = f"https://trust.hendaxis.com/l/{link.id}"

    return {
        "id": str(link.id),
        "title": link.title,
        "description": link.description,
        "price_ghs": float(link.price_ghs),
        "shipping_fee_ghs": float(link.shipping_fee_ghs),
        "fee_handling": link.fee_handling,
        "image_url": link.image_url,
        "category": link.category,
        "is_active": link.is_active,
        "checkout_url": checkout_url,
        "created_at": link.created_at.isoformat()
    }


@v1_developer_router.get("/links", response=List[PaymentLinkDetailSchema])
def list_payment_links(request, limit: int = 50, offset: int = 0):
    """
    List all active payment links created by the merchant.
    """
    user = request.auth_user
    limit = min(max(1, limit), 100)
    offset = max(0, offset)

    links = PaymentLink.objects.filter(seller=user, is_active=True).order_by('-created_at')[offset:offset + limit]

    return [
        {
            "id": str(link.id),
            "title": link.title,
            "description": link.description,
            "price_ghs": float(link.price_ghs),
            "shipping_fee_ghs": float(link.shipping_fee_ghs),
            "fee_handling": link.fee_handling,
            "image_url": link.image_url,
            "category": link.category,
            "is_active": link.is_active,
            "checkout_url": f"https://trust.hendaxis.com/l/{link.id}",
            "created_at": link.created_at.isoformat()
        }
        for link in links
    ]


@v1_developer_router.get("/links/{link_id}", response=PaymentLinkDetailSchema)
def get_payment_link(request, link_id: str):
    """
    Retrieve payment link details by Link ID.
    """
    user = request.auth_user
    link = get_object_or_404(PaymentLink, id=link_id, seller=user)

    return {
        "id": str(link.id),
        "title": link.title,
        "description": link.description,
        "price_ghs": float(link.price_ghs),
        "shipping_fee_ghs": float(link.shipping_fee_ghs),
        "fee_handling": link.fee_handling,
        "image_url": link.image_url,
        "category": link.category,
        "is_active": link.is_active,
        "checkout_url": f"https://trust.hendaxis.com/l/{link.id}",
        "created_at": link.created_at.isoformat()
    }
