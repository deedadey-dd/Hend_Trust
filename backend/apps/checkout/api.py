from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.checkout.services import generate_and_send_otp, generate_and_send_email_otp, verify_otp, PaystackAdapter
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
    buyer_name: str
    buyer_email: str
    shipping_address: str
    title: str
    created_at: str
    paystack_reference: str
    inspection_starts_at: Optional[str] = None
    seller_username: Optional[str] = ""
    seller_email: Optional[str] = ""
    seller_phone: Optional[str] = ""

class InitializeResponse(Schema):
    authorization_url: str
    reference: str

class TrackByPhoneSchema(Schema):
    phone_number: str
    otp_code: str

@checkout_router.post("/send-otp", response=MessageResponse)
def send_otp(request, data: SendOtpSchema):
    generate_and_send_otp(data.phone_number)
    return {"message": "OTP sent successfully (check terminal output)"}

@checkout_router.post("/send-email-otp", response=MessageResponse)
def send_email_otp(request, data: SendEmailOtpSchema):
    generate_and_send_email_otp(data.email)
    return {"message": "OTP sent successfully via email"}

@checkout_router.post("/track", response=list[TransactionStatusSchema])
def track_orders(request, data: TrackRequestSchema):
    if not verify_otp(data.email, data.otp_code):
        raise HttpError(400, "Invalid or expired OTP.")
    
    txns = Transaction.objects.filter(buyer_email=data.email).select_related('link', 'link__seller').order_by('-created_at')
    
    return [
        {
            "id": t.id,
            "status": t.status,
            "total_amount_ghs": float(t.total_amount_ghs),
            "buyer_name": t.buyer_name,
            "buyer_email": t.buyer_email,
            "shipping_address": t.shipping_address,
            "title": t.link.title,
            "created_at": t.created_at.isoformat(),
            "paystack_reference": t.paystack_reference,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "seller_username": t.link.seller.username or t.link.seller.email.split('@')[0],
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
        } for t in txns
    ]

@checkout_router.post("/track/phone", response=list[TransactionStatusSchema])
def track_orders_by_phone(request, data: TrackByPhoneSchema):
    if not verify_otp(data.phone_number, data.otp_code):
        raise HttpError(400, "Invalid or expired OTP.")
    
    txns = Transaction.objects.filter(buyer_phone=data.phone_number).select_related('link', 'link__seller').order_by('-created_at')
    
    return [
        {
            "id": t.id,
            "status": t.status,
            "total_amount_ghs": float(t.total_amount_ghs),
            "buyer_name": t.buyer_name,
            "buyer_email": t.buyer_email,
            "shipping_address": t.shipping_address,
            "title": t.link.title,
            "created_at": t.created_at.isoformat(),
            "paystack_reference": t.paystack_reference,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "seller_username": t.link.seller.username or t.link.seller.email.split('@')[0],
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
        } for t in txns
    ]

@checkout_router.post("/track/id", response=list[TransactionStatusSchema])
def track_order_by_id(request, data: TrackByIdSchema):
    txn = Transaction.objects.filter(
        paystack_reference=data.paystack_reference,
        buyer_phone=data.phone_number
    ).select_related('link', 'link__seller').first()
    
    if not txn:
        raise HttpError(404, "Order not found. Please check your Transaction ID and Phone Number.")
        
    return [
        {
            "id": txn.id,
            "status": txn.status,
            "total_amount_ghs": float(txn.total_amount_ghs),
            "buyer_name": txn.buyer_name,
            "buyer_email": txn.buyer_email,
            "shipping_address": txn.shipping_address,
            "title": txn.link.title,
            "created_at": txn.created_at.isoformat(),
            "paystack_reference": txn.paystack_reference,
            "inspection_starts_at": txn.inspection_starts_at.isoformat() if txn.inspection_starts_at else None,
            "seller_username": txn.link.seller.username or txn.link.seller.email.split('@')[0],
            "seller_email": getattr(txn.link.seller, 'email', ''),
            "seller_phone": getattr(txn.link.seller, 'phone_number', ''),
        }
    ]

@checkout_router.get("/transaction/{reference}", response=TransactionStatusSchema)
def get_transaction_status(request, reference: str):
    txn = get_object_or_404(Transaction, paystack_reference=reference)
    
    # Actively verify with Paystack if still awaiting payment (in case webhook was missed/delayed)
    if txn.status == TransactionStatus.AWAITING_PAYMENT:
        try:
            paystack_data = PaystackAdapter.verify_transaction(reference)
            if paystack_data.get('status') == 'success':
                txn.status = TransactionStatus.PAYMENT_RECEIVED
                txn.save(update_fields=['status', 'updated_at'])
                
                from apps.core.tasks import notify_buyer_payment_received_task, notify_seller_payment_received_task
                notify_buyer_payment_received_task.delay(txn.id)
                notify_seller_payment_received_task.delay(txn.id)
                
        except Exception as e:
            print(f"Error verifying transaction with Paystack: {e}")

    return {
        "id": txn.id,
        "status": txn.status,
        "total_amount_ghs": float(txn.total_amount_ghs),
        "buyer_name": txn.buyer_name,
        "buyer_email": txn.buyer_email,
        "shipping_address": txn.shipping_address,
        "title": txn.link.title,
        "created_at": str(txn.created_at),
        "paystack_reference": txn.paystack_reference,
        "inspection_starts_at": str(txn.inspection_starts_at) if txn.inspection_starts_at else None,
    }

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

    # Generate unique paystack reference (8 chars alphanumeric)
    import random, string
    paystack_ref = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

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
        
        paystack_data = PaystackAdapter.initialize_transaction(
            email=data.email, 
            amount_ghs=float(total_amount), 
            reference=paystack_ref,
            callback_url=cb_url
        )
        return {
            "authorization_url": paystack_data['authorization_url'],
            "reference": paystack_ref
        }
    except Exception as e:
        txn.status = TransactionStatus.DISPUTED
        txn.save()
        raise HttpError(500, f"Paystack initialization failed: {str(e)}")
