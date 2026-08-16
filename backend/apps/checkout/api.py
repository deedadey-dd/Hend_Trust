from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.checkout.services import generate_and_send_otp, verify_otp, PaystackAdapter
from typing import Optional
from decimal import Decimal
import uuid

checkout_router = Router(tags=["Guest Checkout"])

class SendOtpSchema(Schema):
    phone_number: str

class VerifyInitializeSchema(Schema):
    link_id: uuid.UUID
    phone_number: str
    otp_code: str
    email: str
    shipping_address: Optional[str] = ""

class MessageResponse(Schema):
    message: str

class InitializeResponse(Schema):
    authorization_url: str
    reference: str

@checkout_router.post("/send-otp", response=MessageResponse)
def send_otp(request, data: SendOtpSchema):
    generate_and_send_otp(data.phone_number)
    return {"message": "OTP sent successfully (check terminal output)"}

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

    # Generate unique paystack reference
    paystack_ref = f"txn_{uuid.uuid4().hex}"

    # Create transaction
    txn = Transaction.objects.create(
        link=link,
        buyer_phone=data.phone_number,
        buyer_email=data.email,
        shipping_address=data.shipping_address,
        total_amount_ghs=total_amount,
        platform_fee_ghs=platform_fee,
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference=paystack_ref
    )

    try:
        paystack_data = PaystackAdapter.initialize_transaction(
            email=data.email, 
            amount_ghs=float(total_amount), 
            reference=paystack_ref
        )
        return {
            "authorization_url": paystack_data['authorization_url'],
            "reference": paystack_ref
        }
    except Exception as e:
        txn.status = TransactionStatus.DISPUTED
        txn.save()
        raise HttpError(500, f"Paystack initialization failed: {str(e)}")
