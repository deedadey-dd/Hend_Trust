from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.payouts import execute_payout_for_transaction
import uuid
from django.db.models import Q
from datetime import datetime
from ninja.pagination import paginate, LimitOffsetPagination
import random

escrow_router = Router(tags=["Escrow Transactions"], auth=JWTCookieAuth())

class ResolveDisputeSchema(Schema):
    resolution: str  # e.g., 'COMPLETED' or 'CANCELLED'

class MessageResponse(Schema):
    message: str

from typing import Optional

class SellerTransactionSchema(Schema):
    id: uuid.UUID
    status: str
    total_amount_ghs: float
    buyer_name: str
    buyer_phone: str
    buyer_email: str
    shipping_address: str
    title: str
    created_at: str
    paystack_reference: str
    link_id: uuid.UUID
    inspection_starts_at: Optional[str] = None
    delivery_method: Optional[str] = None
    dispatched_at: Optional[str] = None

@escrow_router.get("/seller/transactions", response=list[SellerTransactionSchema])
@paginate(LimitOffsetPagination)
def get_seller_transactions(request, search: str = None, status: str = None, start_date: str = None, end_date: str = None):
    """Get paginated, filtered, and searchable transactions for the logged-in seller."""
    txns = Transaction.objects.filter(link__seller=request.user).select_related('link').order_by('-created_at')
    
    if search:
        txns = txns.filter(
            Q(paystack_reference__icontains=search) | 
            Q(buyer_phone__icontains=search) | 
            Q(buyer_email__icontains=search) |
            Q(link__title__icontains=search)
        )
        
    if status:
        txns = txns.filter(status=status)
        
    if start_date:
        try:
            date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            txns = txns.filter(created_at__gte=date_obj)
        except ValueError:
            pass
            
    if end_date:
        try:
            # Set to end of day
            date_obj = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            txns = txns.filter(created_at__lte=date_obj)
        except ValueError:
            pass
            
    return [{
        "id": t.id,
        "status": t.status,
        "total_amount_ghs": float(t.total_amount_ghs),
        "buyer_name": t.buyer_name,
        "buyer_phone": t.buyer_phone,
        "buyer_email": t.buyer_email,
        "shipping_address": t.shipping_address,
        "title": t.link.title,
        "created_at": str(t.created_at),
        "paystack_reference": t.paystack_reference,
        "link_id": t.link.id,
        "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
        "delivery_method": (
            t.delivery_logs.order_by('-created_at').values_list('delivery_method', flat=True).first()
        ),
        "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
    } for t in txns.prefetch_related('delivery_logs')]


class SellerDispatchSchema(Schema):
    delivery_method: str  # 'COURIER_API' or 'INFORMAL_BUS'
    # Path A fields
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    # Path B fields
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None


@escrow_router.post("/seller/transactions/{transaction_id}/dispatch", response=MessageResponse)
def seller_dispatch(request, transaction_id: uuid.UUID, data: SellerDispatchSchema):
    """Dispatch a transaction via courier (Path A) or informal bus (Path B)."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.PAYMENT_RECEIVED:
        raise HttpError(400, "Only transactions in 'Awaiting Shipping' state can be dispatched.")

    from apps.delivery.services import transition_to_delivery, generate_delivery_otp
    from apps.delivery.models import DeliveryLog, DeliveryMethod

    if data.delivery_method == 'COURIER_API':
        if not data.courier_name or not data.tracking_number:
            raise HttpError(400, "courier_name and tracking_number are required for courier dispatch.")
        transition_to_delivery(transaction)
        DeliveryLog.objects.create(
            transaction=transaction,
            delivery_method=DeliveryMethod.COURIER_API,
            courier_name=data.courier_name,
            tracking_number=data.tracking_number,
        )
        from apps.core.tasks import dispatch_sms_task, dispatch_email_task
        courier_msg = (
            f"Your HendAxis Trust order ({transaction.paystack_reference}) has been shipped via {data.courier_name}! "
            f"Tracking Number: {data.tracking_number}. "
            f"Track status at http://localhost:5173/track?ref={transaction.paystack_reference}"
        )
        dispatch_sms_task.delay(transaction.buyer_phone, courier_msg)
        if transaction.buyer_email:
            dispatch_email_task.delay(transaction.buyer_email, "Order Shipped via Courier", courier_msg)

        return {"message": "Courier dispatched. Transaction state updated to DELIVERY_IN_PROGRESS."}

    elif data.delivery_method == 'INFORMAL_BUS':
        if not data.driver_phone or not data.destination_station:
            raise HttpError(400, "driver_phone and destination_station are required for informal delivery.")
        transition_to_delivery(transaction)
        DeliveryLog.objects.create(
            transaction=transaction,
            delivery_method=DeliveryMethod.INFORMAL_BUS,
            driver_phone=data.driver_phone,
            driver_car_number=data.driver_car_number,
            destination_station=data.destination_station,
        )
        generate_delivery_otp(str(transaction.id))
        return {"message": "Dispatched via informal bus. Buyer has been sent driver info and Secret OTP via SMS."}

    else:
        raise HttpError(400, "Invalid delivery_method. Use 'COURIER_API' or 'INFORMAL_BUS'.")


class SellerVerifyOtpSchema(Schema):
    otp_code: str
    buyer_id_photo_url: Optional[str] = None

@escrow_router.post("/seller/transactions/{transaction_id}/verify-delivery", response=MessageResponse)
def seller_verify_delivery_otp(request, transaction_id: uuid.UUID, data: SellerVerifyOtpSchema):
    """Seller submits the OTP shown by the buyer at pickup to confirm delivery (Path B)."""
    from apps.delivery.services import verify_delivery_otp, transition_to_inspection
    from apps.delivery.models import DeliveryLog
    
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "This transaction is not currently in delivery.")

    otp_code = data.otp_code
    if not verify_delivery_otp(str(transaction.id), otp_code):
        raise HttpError(400, "Invalid or expired delivery OTP.")

    # Update ID photo if provided
    buyer_id_photo_url = data.buyer_id_photo_url
    if buyer_id_photo_url:
        latest_log = transaction.delivery_logs.order_by('-created_at').first()
        if latest_log:
            latest_log.buyer_id_photo_url = buyer_id_photo_url
            latest_log.save(update_fields=['buyer_id_photo_url'])

    transition_to_inspection(transaction)

    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    hours = 72 if transaction.total_amount_ghs >= 10000 else 48 if transaction.total_amount_ghs >= 2000 else 24
    msg = (
        f"Your HendAxis Trust order ({transaction.paystack_reference}) has been delivered! "
        f"Your {hours}-hour inspection period has started. "
        f"Inspect your item and raise a dispute before the timer expires if there is a problem."
    )
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Inspection Period Started", msg)

    return {"message": "OTP verified. Delivery confirmed. Inspection period has started."}


@escrow_router.post("/seller/transactions/{transaction_id}/resend-otp", response=MessageResponse)
def seller_resend_otp(request, transaction_id: uuid.UUID):
    """Resend the delivery OTP to the buyer (Path B only)."""
    from apps.delivery.services import resend_delivery_otp
    from apps.delivery.models import DeliveryLog, DeliveryMethod
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "OTP resend only applicable when delivery is in progress.")
    has_informal = DeliveryLog.objects.filter(
        transaction=transaction, delivery_method=DeliveryMethod.INFORMAL_BUS
    ).exists()
    if not has_informal:
        raise HttpError(400, "No informal bus delivery found for this transaction.")
    resend_delivery_otp(str(transaction.id))
    return {"message": "OTP resent to buyer's phone and email."}


class ForceCourierDeliveredResponse(Schema):
    """
    Returned by force-delivered endpoint.
    - completed=True means inspection started immediately (API confirmed delivery).
    - requires_reason=True means the API did NOT confirm delivery and the seller
      must resubmit with a `seller_reason` to override.
    """
    completed: bool = False
    requires_reason: bool = False
    courier_status: Optional[str] = None
    message: str = ""


def _check_courier_api_status(delivery_log) -> str:
    """
    Stub: Call the courier's API to get the latest parcel status.
    Returns a normalised status string. Replace with real integration per courier.
    """
    # TODO: Route to real courier API by `delivery_log.courier_name`.
    # For now we always return 'UNKNOWN' so the seller must provide a reason.
    return "UNKNOWN"


class ForceCourierDeliveredSchema(Schema):
    seller_reason: Optional[str] = None

@escrow_router.post(
    "/seller/transactions/{transaction_id}/force-delivered",
    response=ForceCourierDeliveredResponse,
)
def seller_force_courier_delivered(request, transaction_id: uuid.UUID, data: ForceCourierDeliveredSchema):
    """
    Path A — Force delivery confirmation for courier transactions stuck after 36 h.

    Step 1: Client posts {} (no reason). We check the courier API.
      - If courier API says DELIVERED → start inspection, return {completed: true}.
      - Otherwise → return {requires_reason: true, courier_status: '...'}.

    Step 2: Client re-posts with {seller_reason: '...'} → we log it and start inspection.
    """
    from apps.delivery.services import transition_to_inspection
    from apps.delivery.models import DeliveryLog, DeliveryMethod

    transaction = get_object_or_404(
        Transaction.objects.select_related("link").prefetch_related("delivery_logs"),
        id=transaction_id,
        link__seller=request.user,
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "This transaction is not currently in delivery.")

    latest_log = transaction.delivery_logs.order_by("-created_at").first()
    if not latest_log or latest_log.delivery_method != DeliveryMethod.COURIER_API:
        raise HttpError(400, "No courier delivery found for this transaction.")

    seller_reason = data.seller_reason

    if not seller_reason:
        # Step 1: Try to fetch real status from the courier API
        courier_status = _check_courier_api_status(latest_log)

        if courier_status == "DELIVERED":
            # Auto-confirm — API agrees
            transition_to_inspection(transaction)
            _notify_buyer_inspection_started(transaction)
            return ForceCourierDeliveredResponse(
                completed=True,
                message="Courier API confirmed delivery. Inspection period started."
            )
        else:
            # API not yet showing delivered — ask seller for reason
            return ForceCourierDeliveredResponse(
                requires_reason=True,
                courier_status=courier_status,
                message=(
                    f"The courier API shows status '{courier_status}'. "
                    "Please provide a reason to override and mark as delivered."
                ),
            )

    # Step 2: Seller provided a reason — log it and proceed
    latest_log.waybill_photo_url = latest_log.waybill_photo_url or ""  # keep existing
    # Store reason in a notes field (we reuse buyer_id_photo_url as a note stub for now;
    # a dedicated `seller_override_reason` field can be added in a future migration)
    latest_log.buyer_id_photo_url = f"[OVERRIDE REASON]: {seller_reason}"
    latest_log.save(update_fields=["buyer_id_photo_url"])

    transition_to_inspection(transaction)
    _notify_buyer_inspection_started(transaction)

    return ForceCourierDeliveredResponse(
        completed=True,
        message="Delivery confirmed with seller override. Inspection period started.",
    )


def _notify_buyer_inspection_started(transaction: Transaction):
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    hours = 72 if transaction.total_amount_ghs >= 10000 else 48 if transaction.total_amount_ghs >= 2000 else 24
    msg = (
        f"Your HendAxis Trust order ({transaction.paystack_reference}) has been marked as Delivered. "
        f"Your {hours}-hour inspection period has started. "
        f"Raise a dispute before the timer expires if there is a problem."
    )
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Inspection Period Started", msg)


@escrow_router.post("/seller/transactions/{transaction_id}/cancel", response=MessageResponse)
def seller_cancel(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id, link__seller=request.user)
    if transaction.status != TransactionStatus.PAYMENT_RECEIVED:
        raise HttpError(400, "Only transactions in 'Awaiting Shipping' state can be cancelled.")
    
    from apps.ledger.services import execute_full_refund
    execute_full_refund(
        reference_id=str(transaction.id), 
        seller_user_id=request.user.id, 
        gross_amount=transaction.total_amount_ghs, 
        platform_fee=transaction.platform_fee_ghs
    )
    transaction.status = TransactionStatus.CANCELLED
    transaction.save(update_fields=['status', 'updated_at'])
    
    # Trigger refund payout (deducts 1.95% Paystack fee)
    from apps.wallet.services import execute_refund_payout
    execute_refund_payout(
        buyer_phone=transaction.buyer_phone,
        buyer_email=transaction.buyer_email,
        refund_amount=transaction.total_amount_ghs,
        reference_id=str(transaction.id)
    )
    
    # Notifications
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    msg = f"Your order ({transaction.paystack_reference}) for {transaction.link.title} was cancelled by the seller. A full refund has been issued."
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Order Cancelled & Refunded", msg)
        
    return {"message": "Transaction cancelled. Buyer refunded and platform fee charged to your account."}

@escrow_router.post("/{transaction_id}/dispute", response=MessageResponse)
def open_dispute(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if transaction.status not in [TransactionStatus.INSPECTION_PERIOD, TransactionStatus.DELIVERY_IN_PROGRESS]:
        raise HttpError(400, f"Cannot dispute transaction in {transaction.status} state.")
        
    if transaction.status == TransactionStatus.INSPECTION_PERIOD and transaction.inspection_starts_at:
        from django.utils import timezone
        from datetime import timedelta
        
        amount = transaction.total_amount_ghs
        if amount < 2000:
            duration = timedelta(hours=24)
        elif amount < 10000:
            duration = timedelta(hours=48)
        else:
            duration = timedelta(hours=72)
            
        if (transaction.inspection_starts_at + duration) <= timezone.now():
            raise HttpError(400, "The inspection period has expired. You can no longer dispute this transaction.")
        
    transaction.status = TransactionStatus.DISPUTED
    transaction.save(update_fields=['status', 'updated_at'])
    
    return {"message": "Transaction has been disputed. Auto-payouts are paused."}

class ConfirmReceiptSchema(Schema):
    confirmation_code: str

@escrow_router.post("/{transaction_id}/send-confirmation-code", response=MessageResponse, auth=None)
def send_confirmation_code(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.status not in [TransactionStatus.INSPECTION_PERIOD, TransactionStatus.DELIVERY_IN_PROGRESS]:
        raise HttpError(400, "Cannot send confirmation code for this transaction state.")
    
    code = str(random.randint(100000, 999999))
    print(f"==================================================")
    print(f"DEV Confirmation Code for {transaction.paystack_reference}: {code}")
    print(f"==================================================")
    transaction.delivery_confirmation_code = code
    transaction.save(update_fields=['delivery_confirmation_code'])
    
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    msg = f"Your HendAxis Trust order ({transaction.paystack_reference}) delivery confirmation code is: {code}"
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Delivery Confirmation Code", msg)
        
    return {"message": "Confirmation code sent to your phone and email."}

@escrow_router.post("/{transaction_id}/confirm-receipt", response=MessageResponse, auth=None)
def confirm_receipt(request, transaction_id: uuid.UUID, data: ConfirmReceiptSchema):
    """Buyer confirms they received the item - triggers payout to seller."""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, f"Cannot confirm receipt in {transaction.status} state. Only applicable when in transit.")
        
    from apps.delivery.services import verify_delivery_otp
    is_valid_code = (transaction.delivery_confirmation_code and transaction.delivery_confirmation_code == data.confirmation_code)
    is_valid_otp = verify_delivery_otp(str(transaction.id), data.confirmation_code)
    
    if not (is_valid_code or is_valid_otp):
        raise HttpError(400, "Invalid confirmation code or delivery OTP.")
        
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    from django.utils import timezone
    transaction.inspection_starts_at = timezone.now()
    transaction.save(update_fields=['status', 'inspection_starts_at', 'updated_at'])

    _notify_buyer_inspection_started(transaction)
    
    return {"message": "Receipt confirmed. Order is now in Inspection Mode."}

@escrow_router.post("/{transaction_id}/resolve-dispute", response=MessageResponse)
def resolve_dispute(request, transaction_id: uuid.UUID, data: ResolveDisputeSchema):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, "Transaction is not currently disputed.")
        
    if data.resolution == 'COMPLETED':
        transaction.status = TransactionStatus.COMPLETED
        transaction.save(update_fields=['status', 'updated_at'])
        
        # Trigger payout immediately as requested
        execute_payout_for_transaction(transaction)
        
        return {"message": "Dispute resolved to COMPLETED. Funds transferred to seller."}
        
    elif data.resolution == 'CANCELLED':
        # Custom logic for cancelled, potentially refunding buyer
        # Not fully spec'd out in prompt, just handling status change
        transaction.status = 'CANCELLED' # Assuming this exists or just arbitrary string for now
        transaction.save(update_fields=['status', 'updated_at'])
        return {"message": "Dispute resolved to CANCELLED. Funds hold."}
        
    raise HttpError(400, "Invalid resolution. Use 'COMPLETED' or 'CANCELLED'.")

from ninja_jwt.authentication import JWTAuth
from apps.core.permissions import is_admin_user
from apps.ledger.models import LedgerAccount
from django.db.models import Sum

admin_router = Router(tags=["Admin Operations"], auth=JWTCookieAuth())

class DisputeResolutionAdminSchema(Schema):
    action: str  # 'RELEASE_TO_SELLER', 'FULL_REFUND_TO_BUYER', 'PARTIAL_REFUND_TO_BUYER'
    admin_notes: Optional[str] = None

class BroadcastMessageSchema(Schema):
    target_group: str  # 'ALL_USERS', 'ALL_SELLERS', 'ALL_BUYERS', 'USERS_WITH_ACTIVE_ESCROW', 'USERS_WITH_DISPUTES', 'CUSTOM'
    channels: str  # 'SMS', 'EMAIL', 'BOTH'
    subject: Optional[str] = "Important Notification from HendAxis Trust"
    message: str
    custom_recipients: Optional[str] = None  # Comma-separated list of phone numbers or emails

@admin_router.get("/metrics")
def get_platform_metrics(request):
    is_admin_user(request)
    
    revenue = LedgerAccount.objects.filter(name='PLATFORM_FEE_REVENUE').aggregate(total=Sum('balance'))['total'] or 0
    liabilities = LedgerAccount.objects.filter(name='BUYER_ESCROW_DEPOSIT').aggregate(total=Sum('balance'))['total'] or 0
    
    gmv = Transaction.objects.exclude(
        status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]
    ).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
    
    counts = {
        status[0]: Transaction.objects.filter(status=status[0]).count()
        for status in TransactionStatus.choices
    }
    
    from apps.users.models import User
    total_sellers = User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct().count()
    total_buyers = Transaction.objects.values('buyer_phone').distinct().count()
    total_transactions = Transaction.objects.count()
    active_disputes = Transaction.objects.filter(status=TransactionStatus.DISPUTED).count()

    return {
        "gmv_ghs": float(gmv),
        "platform_revenue_ghs": float(revenue),
        "active_escrow_liabilities_ghs": float(liabilities),
        "total_sellers": total_sellers,
        "total_buyers": total_buyers,
        "total_transactions": total_transactions,
        "active_disputes": active_disputes,
        "transaction_counts": counts
    }

@admin_router.get("/disputes")
def get_disputes(request):
    is_admin_user(request)
    txns = Transaction.objects.filter(status=TransactionStatus.DISPUTED).select_related('link', 'link__seller').prefetch_related('delivery_logs')
    res = []
    for t in txns:
        log = t.delivery_logs.order_by('-created_at').first()
        res.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "link_title": t.link.title,
            "seller_username": t.link.seller.username,
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
            "buyer_name": t.buyer_name,
            "buyer_phone": t.buyer_phone,
            "buyer_email": t.buyer_email,
            "total_amount_ghs": float(t.total_amount_ghs),
            "platform_fee_ghs": float(t.platform_fee_ghs),
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
            "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "delivery_method": log.delivery_method if log else None,
            "courier_name": log.courier_name if log else None,
            "tracking_number": log.tracking_number if log else None,
            "driver_phone": log.driver_phone if log else None,
            "destination_station": log.destination_station if log else None,
            "buyer_id_photo_url": log.buyer_id_photo_url if log else None,
        })
    return res

@admin_router.post("/disputes/{id}/resolve")
def resolve_dispute_admin(request, id: uuid.UUID, data: DisputeResolutionAdminSchema):
    is_admin_user(request)
    transaction = get_object_or_404(Transaction, id=id)
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, "Transaction is not in a DISPUTED state")
        
    if data.action == "RELEASE_TO_SELLER":
        transaction.status = TransactionStatus.COMPLETED
        transaction.save()
        execute_payout_for_transaction(transaction)
        return {"message": "Funds released to seller."}
        
    elif data.action == "FULL_REFUND_TO_BUYER":
        from apps.ledger.services import execute_full_refund
        execute_full_refund(
            reference_id=str(transaction.id),
            seller_user_id=transaction.link.seller.id,
            gross_amount=transaction.total_amount_ghs,
            platform_fee=transaction.platform_fee_ghs
        )
        transaction.status = TransactionStatus.REFUNDED
        transaction.save()
        return {"message": "Full refund issued to buyer. Seller charged for platform fee."}
        
    elif data.action == "PARTIAL_REFUND_TO_BUYER":
        transaction.status = TransactionStatus.REFUNDED
        transaction.save()
        return {"message": "Partial refund recorded."}
    
    raise HttpError(400, "Invalid action")

@admin_router.get("/transactions")
def get_all_transactions_admin(request, status: Optional[str] = None, search: Optional[str] = None, limit: int = 50, offset: int = 0):
    is_admin_user(request)
    qs = Transaction.objects.select_related('link', 'link__seller').prefetch_related('delivery_logs').order_by('-created_at')
    
    if status and status != 'ALL':
        qs = qs.filter(status=status)
        
    if search:
        qs = qs.filter(
            Q(paystack_reference__icontains=search) |
            Q(buyer_name__icontains=search) |
            Q(buyer_phone__icontains=search) |
            Q(buyer_email__icontains=search) |
            Q(link__title__icontains=search) |
            Q(link__seller__username__icontains=search)
        )
        
    total_count = qs.count()
    txns = list(qs[offset:offset+limit])
    
    items = []
    for t in txns:
        log = t.delivery_logs.order_by('-created_at').first()
        items.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "title": t.link.title,
            "seller_username": t.link.seller.username,
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
            "buyer_name": t.buyer_name,
            "buyer_phone": t.buyer_phone,
            "buyer_email": t.buyer_email,
            "shipping_address": t.shipping_address,
            "total_amount_ghs": float(t.total_amount_ghs),
            "platform_fee_ghs": float(t.platform_fee_ghs),
            "fee_handling": t.link.fee_handling,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
            "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "delivery_method": log.delivery_method if log else None,
            "courier_name": log.courier_name if log else None,
            "tracking_number": log.tracking_number if log else None,
            "driver_phone": log.driver_phone if log else None,
            "driver_car_number": log.driver_car_number if log else None,
            "destination_station": log.destination_station if log else None,
        })
        
    return {"total_count": total_count, "items": items}

@admin_router.get("/transactions/{id}")
def get_transaction_detail_admin(request, id: uuid.UUID):
    is_admin_user(request)
    t = get_object_or_404(Transaction.objects.select_related('link', 'link__seller').prefetch_related('delivery_logs'), id=id)
    
    logs = [{
        "id": str(l.id),
        "delivery_method": l.delivery_method,
        "courier_name": l.courier_name,
        "tracking_number": l.tracking_number,
        "driver_phone": l.driver_phone,
        "driver_car_number": l.driver_car_number,
        "destination_station": l.destination_station,
        "buyer_id_photo_url": l.buyer_id_photo_url,
        "created_at": l.created_at.isoformat(),
    } for l in t.delivery_logs.order_by('-created_at')]
    
    from apps.ledger.models import LedgerEntry
    ledger_entries = [{
        "id": str(e.id),
        "entry_type": e.entry_type,
        "debit_account": e.debit_account.name,
        "credit_account": e.credit_account.name,
        "amount_ghs": float(e.amount_ghs),
        "created_at": e.created_at.isoformat(),
    } for e in LedgerEntry.objects.filter(reference_id=str(t.id)).order_by('created_at')]
    
    return {
        "id": str(t.id),
        "paystack_reference": t.paystack_reference,
        "title": t.link.title,
        "description": t.link.description,
        "seller": {
            "id": str(t.link.seller.id),
            "username": t.link.seller.username,
            "email": getattr(t.link.seller, 'email', ''),
            "phone_number": getattr(t.link.seller, 'phone_number', ''),
        },
        "buyer": {
            "name": t.buyer_name,
            "phone": t.buyer_phone,
            "email": t.buyer_email,
            "shipping_address": t.shipping_address,
        },
        "total_amount_ghs": float(t.total_amount_ghs),
        "platform_fee_ghs": float(t.platform_fee_ghs),
        "status": t.status,
        "created_at": t.created_at.isoformat(),
        "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
        "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
        "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
        "delivery_logs": logs,
        "ledger_entries": ledger_entries,
    }

@admin_router.get("/sellers")
def get_sellers_admin(request, search: Optional[str] = None):
    is_admin_user(request)
    from apps.users.models import User
    from apps.wallet.models import Wallet
    
    sellers = User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct()
    
    if search:
        sellers = sellers.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(phone_number__icontains=search)
        )
        
    res = []
    for s in sellers:
        links_count = s.payment_links.count()
        txns = Transaction.objects.filter(link__seller=s)
        total_txns = txns.count()
        
        completed_gmv = txns.filter(status=TransactionStatus.COMPLETED).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
        
        wallet = Wallet.objects.filter(user=s).first()
        wallet_balance = float(wallet.balance_ghs) if wallet else 0.0
        payout_mode = getattr(s, 'payout_mode', 'INSTANT')
        
        res.append({
            "id": str(s.id),
            "username": s.username,
            "email": getattr(s, 'email', ''),
            "phone_number": getattr(s, 'phone_number', ''),
            "payout_mode": payout_mode,
            "created_at": s.created_at.isoformat() if hasattr(s, 'created_at') and s.created_at else None,
            "payment_links_count": links_count,
            "total_transactions_count": total_txns,
            "completed_gmv_ghs": float(completed_gmv),
            "wallet_balance_ghs": wallet_balance,
        })
        
    return res

@admin_router.get("/buyers")
def get_buyers_admin(request, search: Optional[str] = None):
    is_admin_user(request)
    
    qs = Transaction.objects.all()
    if search:
        qs = qs.filter(
            Q(buyer_phone__icontains=search) |
            Q(buyer_name__icontains=search) |
            Q(buyer_email__icontains=search)
        )
        
    buyer_phones = qs.values_list('buyer_phone', flat=True).distinct()
    
    res = []
    for phone in buyer_phones:
        if not phone:
            continue
        b_txns = Transaction.objects.filter(buyer_phone=phone).order_by('-created_at')
        latest = b_txns.first()
        
        total_orders = b_txns.count()
        active_escrow = b_txns.filter(status__in=[TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.INSPECTION_PERIOD]).count()
        disputed_orders = b_txns.filter(status=TransactionStatus.DISPUTED).count()
        completed_orders = b_txns.filter(status=TransactionStatus.COMPLETED).count()
        total_spent = b_txns.exclude(status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
        
        res.append({
            "buyer_phone": phone,
            "buyer_name": latest.buyer_name if latest else 'Unknown',
            "buyer_email": latest.buyer_email if latest else '',
            "total_orders": total_orders,
            "active_escrow_orders": active_escrow,
            "disputed_orders": disputed_orders,
            "completed_orders": completed_orders,
            "total_spent_ghs": float(total_spent),
            "last_order_at": latest.created_at.isoformat() if latest else None,
        })
        
    return res

@admin_router.post("/broadcast-message")
def broadcast_message_admin(request, data: BroadcastMessageSchema):
    is_admin_user(request)
    from apps.users.models import User
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    phone_numbers = set()
    email_addresses = set()
    
    target = data.target_group
    
    if target == 'ALL_USERS':
        for u in User.objects.all():
            if u.phone_number: phone_numbers.add(u.phone_number)
            if u.email: email_addresses.add(u.email)
        for t in Transaction.objects.values('buyer_phone', 'buyer_email'):
            if t['buyer_phone']: phone_numbers.add(t['buyer_phone'])
            if t['buyer_email']: email_addresses.add(t['buyer_email'])
            
    elif target == 'ALL_SELLERS':
        for u in User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct():
            if u.phone_number: phone_numbers.add(u.phone_number)
            if u.email: email_addresses.add(u.email)
            
    elif target == 'ALL_BUYERS':
        for t in Transaction.objects.values('buyer_phone', 'buyer_email'):
            if t['buyer_phone']: phone_numbers.add(t['buyer_phone'])
            if t['buyer_email']: email_addresses.add(t['buyer_email'])
            
    elif target == 'USERS_WITH_ACTIVE_ESCROW':
        active_txns = Transaction.objects.filter(
            status__in=[TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.INSPECTION_PERIOD]
        ).select_related('link', 'link__seller')
        for t in active_txns:
            if t.buyer_phone: phone_numbers.add(t.buyer_phone)
            if t.buyer_email: email_addresses.add(t.buyer_email)
            s = t.link.seller
            if getattr(s, 'phone_number', None): phone_numbers.add(s.phone_number)
            if getattr(s, 'email', None): email_addresses.add(s.email)
            
    elif target == 'USERS_WITH_DISPUTES':
        disp_txns = Transaction.objects.filter(status=TransactionStatus.DISPUTED).select_related('link', 'link__seller')
        for t in disp_txns:
            if t.buyer_phone: phone_numbers.add(t.buyer_phone)
            if t.buyer_email: email_addresses.add(t.buyer_email)
            s = t.link.seller
            if getattr(s, 'phone_number', None): phone_numbers.add(s.phone_number)
            if getattr(s, 'email', None): email_addresses.add(s.email)
            
    elif target == 'CUSTOM' and data.custom_recipients:
        raw_list = [r.strip() for r in data.custom_recipients.replace(',', '\n').split('\n') if r.strip()]
        for item in raw_list:
            if '@' in item:
                email_addresses.add(item)
            else:
                phone_numbers.add(item)
                
    sms_count = 0
    email_count = 0
    
    if data.channels in ['SMS', 'BOTH']:
        for phone in phone_numbers:
            dispatch_sms_task.delay(phone, data.message)
            sms_count += 1
            
    if data.channels in ['EMAIL', 'BOTH']:
        for email in email_addresses:
            dispatch_email_task.delay(email, data.subject or "Notification from HendAxis Trust", data.message)
            email_count += 1
            
    return {
        "message": f"Broadcast dispatched! Queued {sms_count} SMS and {email_count} Email messages.",
        "sms_count": sms_count,
        "email_count": email_count,
    }
