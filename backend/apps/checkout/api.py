import secrets
import string
from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.checkout.services import generate_and_send_otp, generate_and_send_email_otp, verify_otp, PaystackAdapter
from apps.core.ratelimit import rate_limit
from typing import Optional
from decimal import Decimal
import uuid

checkout_router = Router(tags=["Guest Checkout"])

class SendOtpSchema(Schema):
    phone_number: str

class SendEmailOtpSchema(Schema):
    email: str

class TrackRequestSchema(Schema):
    email: str
    otp_code: str

class TrackByIdSchema(Schema):
    paystack_reference: str
    phone_number: str

class VerifyInitializeSchema(Schema):
    link_id: uuid.UUID
    name: str
    phone_number: str
    otp_code: str
    email: str
    shipping_address: Optional[str] = ""

class MessageResponse(Schema):
    message: str

class TransactionStatusSchema(Schema):
    id: uuid.UUID
    status: str
    total_amount_ghs: float
    buyer_refund_amount_ghs: Optional[float] = None
    buyer_name: str
    buyer_email: str
    shipping_address: str
    title: str
    image_url: Optional[str] = ""
    created_at: str
    paystack_reference: str
    inspection_starts_at: Optional[str] = None
    seller_username: Optional[str] = ""
    shop_name: Optional[str] = ""
    seller_email: Optional[str] = ""
    seller_phone: Optional[str] = ""
    seller_profile_picture_url: Optional[str] = ""
    delivery_method: Optional[str] = None
    courier_name: Optional[str] = None
    carrier_code: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier_tracking_url: Optional[str] = None
    driver_phone: Optional[str] = None
    destination_station: Optional[str] = None
    waybill_photo_url: Optional[str] = None
    manager_dispute_notes: Optional[str] = None
    manager_dispute_photos: Optional[list[str]] = []
    buyer_dispute_reason: Optional[str] = None
    buyer_dispute_photos: Optional[list[str]] = []
    seller_dispute_response: Optional[str] = None
    seller_dispute_photos: Optional[list[str]] = []

class InitializeResponse(Schema):
    authorization_url: str
    reference: str

class TrackByPhoneSchema(Schema):
    phone_number: str
    otp_code: str

@checkout_router.post("/send-otp", response=MessageResponse)
@rate_limit('checkout_send_otp', max_calls=5, window_seconds=300)
def send_otp(request, data: SendOtpSchema):
    generate_and_send_otp(data.phone_number)
    return {"message": "OTP sent to your phone number. Valid for 5 minutes."}

@checkout_router.post("/send-email-otp", response=MessageResponse)
@rate_limit('checkout_send_email_otp', max_calls=5, window_seconds=300)
def send_email_otp(request, data: SendEmailOtpSchema):
    generate_and_send_email_otp(data.email)
    return {"message": "OTP sent to your email address. Valid for 5 minutes."}

def _build_txn_status_dict(t):
    log = None
    try:
        if hasattr(t, 'delivery_logs') and t.delivery_logs.exists():
            log = t.delivery_logs.order_by('-created_at').first()
    except Exception as ex:
        print(f"Error fetching delivery_logs: {ex}")
    
    refund_val = None
    if t.status in ['REFUNDED', 'CANCELLED']:
        if t.status == 'CANCELLED':
            refund_val = float(t.total_amount_ghs or 0.0)
        else:
            try:
                from apps.ledger.models import LedgerEntry
                e = LedgerEntry.objects.filter(reference_id=t.id, debit_account__name='BUYER_ESCROW_DEPOSIT').first()
                if e:
                    refund_val = float(e.amount_ghs)
                else:
                    refund_val = float(t.total_amount_ghs or 0.0)
            except Exception as ex:
                print(f"Error resolving refund_val: {ex}")
                refund_val = float(t.total_amount_ghs or 0.0)

    seller = t.link.seller if (t.link and hasattr(t.link, 'seller')) else None
    seller_uname = seller.username if seller else (seller.email.split('@')[0] if (seller and seller.email) else 'seller')
    shop_n = seller.shop_name if (seller and seller.shop_name) else (f"@{seller_uname}'s Store" if seller_uname else 'Seller Store')

    return {
        "id": str(t.id),
        "status": str(t.status),
        "total_amount_ghs": float(t.total_amount_ghs or 0.0),
        "buyer_refund_amount_ghs": refund_val,
        "buyer_name": str(t.buyer_name or ''),
        "buyer_email": str(t.buyer_email or ''),
        "shipping_address": str(t.shipping_address or ''),
        "title": str(t.link.title if t.link else 'Escrow Purchase'),
        "image_url": t.link.image_url if (t.link and getattr(t.link, 'image_url', None)) else "",
        "created_at": t.created_at.isoformat() if t.created_at else '',
        "paystack_reference": str(t.paystack_reference or ''),
        "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
        "seller_username": seller_uname,
        "shop_name": shop_n,
        "seller_email": getattr(seller, 'email', '') if seller else '',
        "seller_phone": getattr(seller, 'phone_number', '') if seller else '',
        "seller_profile_picture_url": getattr(seller, 'profile_picture_url', '') if seller else '',
        "delivery_method": log.delivery_method if log else None,
        "courier_name": log.courier_name if log else None,
        "carrier_code": getattr(log, 'carrier_code', None) if log else None,
        "tracking_number": log.tracking_number if log else None,
        "carrier_tracking_url": getattr(log, 'carrier_tracking_url', None) if log else None,
        "driver_phone": log.driver_phone if log else None,
        "destination_station": log.destination_station if log else None,
        "waybill_photo_url": log.waybill_photo_url if log else None,
        "manager_dispute_notes": t.manager_dispute_notes or None,
        "manager_dispute_photos": t.manager_dispute_photos or [],
        "buyer_dispute_reason": t.buyer_dispute_reason or None,
        "buyer_dispute_photos": t.buyer_dispute_photos or [],
        "seller_dispute_response": t.seller_dispute_response or None,
        "seller_dispute_photos": t.seller_dispute_photos or [],
    }

@checkout_router.post("/track", response=list[TransactionStatusSchema])
def track_orders(request, data: TrackRequestSchema):
    if not verify_otp(data.email, data.otp_code):
        raise HttpError(400, "Invalid or expired OTP.")
    
    txns = Transaction.objects.filter(buyer_email=data.email).select_related('link', 'link__seller').prefetch_related('delivery_logs').order_by('-created_at')
    return [_build_txn_status_dict(t) for t in txns]

@checkout_router.post("/track/phone", response=list[TransactionStatusSchema])
def track_orders_by_phone(request, data: TrackByPhoneSchema):
    if not verify_otp(data.phone_number, data.otp_code):
        raise HttpError(400, "Invalid or expired OTP.")
    
    txns = Transaction.objects.filter(buyer_phone=data.phone_number).select_related('link', 'link__seller').prefetch_related('delivery_logs').order_by('-created_at')
    return [_build_txn_status_dict(t) for t in txns]

@checkout_router.post("/track/id", response=list[TransactionStatusSchema])
def track_order_by_id(request, data: TrackByIdSchema):
    txn = Transaction.objects.filter(
        paystack_reference=data.paystack_reference,
        buyer_phone=data.phone_number
    ).select_related('link', 'link__seller').prefetch_related('delivery_logs').first()
    
    if not txn:
        raise HttpError(404, "Order not found. Please check your Transaction ID and Phone Number.")
        
    return [_build_txn_status_dict(txn)]

@checkout_router.get("/transaction/{reference}", response=TransactionStatusSchema)
def get_transaction_status(request, reference: str):
    txn = get_object_or_404(Transaction.objects.select_related('link', 'link__seller').prefetch_related('delivery_logs'), paystack_reference=reference)
    
    # Actively verify with Paystack if still awaiting payment (in case webhook was missed/delayed)
    if txn.status == TransactionStatus.AWAITING_PAYMENT:
        try:
            paystack_data = PaystackAdapter.verify_transaction(reference)
            if paystack_data.get('status') == 'success':
                txn.status = TransactionStatus.PAYMENT_RECEIVED
                txn.save(update_fields=['status', 'updated_at'])
                
                from apps.ledger.services import record_buyer_deposit
                try:
                    raw_fee = paystack_data.get('fees')
                    fee_val = Decimal(str(raw_fee / 100)) if raw_fee else (txn.total_amount_ghs * Decimal('0.0195')).quantize(Decimal('0.01'))
                    record_buyer_deposit(reference_id=str(txn.id), gross_amount=txn.total_amount_ghs, gateway_fee=fee_val)
                except Exception as e:
                    print(f"Ledger record_buyer_deposit error: {e}")

                from apps.core.tasks import notify_buyer_payment_received_task, notify_seller_payment_received_task
                notify_buyer_payment_received_task.delay(txn.id)
                notify_seller_payment_received_task.delay(txn.id)
                
        except Exception as e:
            print(f"Error verifying transaction with Paystack: {e}")

    return _build_txn_status_dict(txn)

from typing import List

class TransactionListItemSchema(Schema):
    id: uuid.UUID
    status: str
    total_amount_ghs: float
    title: str
    buyer_name: str
    created_at: str
    paystack_reference: str
    link_id: uuid.UUID
    inspection_starts_at: Optional[str] = None

class PhoneLookupSchema(Schema):
    phone_number: str

class VerifiedLookupSchema(Schema):
    phone_number: str
    otp_code: str

@checkout_router.post("/lookup/request-otp", response=MessageResponse)
@rate_limit('lookup_request_otp', max_calls=5, window_seconds=300)
def request_lookup_otp(request, data: PhoneLookupSchema):
    """Send OTP to verify phone ownership before showing transaction history."""
    generate_and_send_otp(data.phone_number)
    return {"message": "OTP sent to your phone."}

@checkout_router.post("/my-transactions", response=List[TransactionListItemSchema])
def get_my_transactions(request, data: VerifiedLookupSchema):
    """Buyer looks up transactions after verifying phone with OTP."""
    if not verify_otp(data.phone_number, data.otp_code):
        raise HttpError(401, "Invalid or expired OTP. Please request a new one.")
    
    txns = Transaction.objects.filter(
        buyer_phone=data.phone_number
    ).select_related('link').exclude(
        status=TransactionStatus.AWAITING_PAYMENT
    ).order_by('-created_at')
    
    return [{
        "id": t.id,
        "status": t.status,
        "total_amount_ghs": float(t.total_amount_ghs),
        "title": t.link.title,
        "buyer_name": t.buyer_name,
        "created_at": str(t.created_at),
        "paystack_reference": t.paystack_reference,
        "link_id": t.link.id,
        "inspection_starts_at": str(t.inspection_starts_at) if t.inspection_starts_at else None,
    } for t in txns]

@checkout_router.post("/verify-and-initialize", response=InitializeResponse)
@rate_limit('checkout_initialize', max_calls=10, window_seconds=300)
def verify_and_initialize(request, data: VerifyInitializeSchema):
    if not verify_otp(data.phone_number, data.otp_code):
        raise HttpError(400, "Invalid or expired OTP")

    link = get_object_or_404(PaymentLink, id=data.link_id)
    if not link.is_active:
        raise HttpError(404, "Payment link is inactive")

    # Fee logic calculation
    gross_product_total = link.price_ghs + link.shipping_fee_ghs
    base_percentage = Decimal('0.015') # 1.5%
    fixed_fee = Decimal('10.00')

    platform_fee = (gross_product_total * base_percentage) + fixed_fee

    if link.fee_handling == FeeHandling.PASS_TO_BUYER:
        total_amount = gross_product_total + platform_fee
    else: # ABSORB_FEE
        total_amount = gross_product_total

    # Generate cryptographically secure unique Paystack reference with collision check
    _charset = string.ascii_uppercase + string.digits
    for _ in range(10):
        paystack_ref = ''.join(secrets.choice(_charset) for _ in range(16))
        if not Transaction.objects.filter(paystack_reference=paystack_ref).exists():
            break

    # Create transaction
    txn = Transaction.objects.create(
        link=link,
        buyer_name=data.name,
        buyer_phone=data.phone_number,
        buyer_email=data.email,
        shipping_address=data.shipping_address,
        total_amount_ghs=total_amount,
        platform_fee_ghs=platform_fee,
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference=paystack_ref
    )

    try:
        origin = request.headers.get('origin', 'http://localhost:5173')
        cb_url = f"{origin}/l/{link.id}?reference={paystack_ref}"
        
        from apps.escrow.api import get_platform_settings
        active_gw = get_platform_settings().get('active_payment_gateway', 'PAYSTACK')

        if active_gw == 'APPSNMOBILE':
            from apps.checkout.adapters.appsnmobile import AppsNMobileAdapter
            pay_data = AppsNMobileAdapter.initialize_transaction(
                email=data.email,
                amount_ghs=float(total_amount),
                reference=paystack_ref,
                callback_url=cb_url
            )
        else:
            pay_data = PaystackAdapter.initialize_transaction(
                email=data.email, 
                amount_ghs=float(total_amount), 
                reference=paystack_ref,
                callback_url=cb_url
            )

        return {
            "authorization_url": pay_data['authorization_url'],
            "reference": paystack_ref
        }
    except Exception as e:
        txn.status = TransactionStatus.DISPUTED
        txn.save()
        raise HttpError(500, f"Payment gateway initialization failed: {str(e)}")
