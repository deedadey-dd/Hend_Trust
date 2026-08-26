from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.models import DeliveryLog, DeliveryMethod
from apps.delivery.services import (
    transition_to_delivery,
    transition_to_inspection,
    generate_delivery_otp,
    resend_delivery_otp,
    verify_delivery_otp,
    check_unresponsive_buyer_safeguard
)
from typing import Optional
import uuid

delivery_router = Router(tags=["Delivery & Logistics"], auth=JWTCookieAuth())


class MessageResponse(Schema):
    message: str


class DispatchCourierSchema(Schema):
    transaction_id: uuid.UUID
    courier_name: str
    tracking_number: str
    carrier_code: Optional[str] = 'OTHERS'


class DispatchWaybillSchema(Schema):
    transaction_id: uuid.UUID
    bus_company: str
    driver_phone: str
    driver_car_number: Optional[str] = None
    destination_station: str
    waybill_photo_url: Optional[str] = None


class VerifyOtpSchema(Schema):
    transaction_id: uuid.UUID
    otp_code: str


class ResendOtpSchema(Schema):
    transaction_id: uuid.UUID


class ClaimDeliverySchema(Schema):
    transaction_id: uuid.UUID


def _assert_seller(request, transaction: Transaction):
    """Ensure the requesting user is the seller who owns this transaction."""
    if transaction.link.seller != request.user:
        raise HttpError(403, "You do not have permission to act on this transaction.")


@delivery_router.post("/dispatch-courier", response=MessageResponse)
def dispatch_courier(request, data: DispatchCourierSchema):
    """Path A: Seller dispatches via a formal courier service (DHL, FedEx, UPS, EMS, Others)."""
    from apps.delivery.tracking import generate_carrier_tracking_url

    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=data.transaction_id
    )
    _assert_seller(request, transaction)

    transition_to_delivery(transaction)

    carrier_code = (data.carrier_code or 'OTHERS').upper()
    tracking_url = generate_carrier_tracking_url(
        carrier_code=carrier_code,
        tracking_number=data.tracking_number,
        courier_name=data.courier_name
    )

    DeliveryLog.objects.create(
        transaction=transaction,
        delivery_method=DeliveryMethod.COURIER_API,
        courier_name=data.courier_name,
        carrier_code=carrier_code,
        tracking_number=data.tracking_number,
        carrier_tracking_url=tracking_url
    )

    return {"message": f"Courier ({data.courier_name}) dispatched. Tracking URL generated and state updated to DELIVERY_IN_PROGRESS."}


@delivery_router.post("/dispatch-waybill", response=MessageResponse)
def dispatch_waybill(request, data: DispatchWaybillSchema):
    """Path B: Seller dispatches via informal bus/station delivery. Generates and sends OTP to buyer."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=data.transaction_id
    )
    _assert_seller(request, transaction)

    transition_to_delivery(transaction)

    DeliveryLog.objects.create(
        transaction=transaction,
        delivery_method=DeliveryMethod.INFORMAL_BUS,
        courier_name=data.bus_company,
        driver_phone=data.driver_phone,
        driver_car_number=data.driver_car_number,
        destination_station=data.destination_station,
        waybill_photo_url=data.waybill_photo_url,
    )

    # Generate OTP and SMS buyer with driver info
    generate_delivery_otp(str(transaction.id))

    return {"message": "Waybill dispatched. Buyer has been sent driver info and their Secret OTP via SMS."}


@delivery_router.post("/resend-otp", response=MessageResponse)
def resend_otp(request, data: ResendOtpSchema):
    """Resend the delivery OTP to the buyer (in case SMS was lost)."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=data.transaction_id
    )
    _assert_seller(request, transaction)

    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "OTP resend only applicable when delivery is in progress.")

    # Check it was an informal delivery
    has_informal = DeliveryLog.objects.filter(
        transaction=transaction,
        delivery_method=DeliveryMethod.INFORMAL_BUS
    ).exists()
    if not has_informal:
        raise HttpError(400, "No informal delivery found for this transaction.")

    resend_delivery_otp(str(transaction.id))
    return {"message": "OTP has been resent to the buyer's phone and email."}


@delivery_router.post("/verify-otp", response=MessageResponse)
def verify_otp(request, data: VerifyOtpSchema):
    """Seller submits buyer's OTP to confirm delivery and start inspection period."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=data.transaction_id
    )
    _assert_seller(request, transaction)

    if not verify_delivery_otp(str(transaction.id), data.otp_code):
        raise HttpError(400, "Invalid or expired delivery OTP. Ask the buyer to check their SMS.")

    transition_to_inspection(transaction)

    # Notify buyer that inspection has started
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    msg = (
        f"Your HendAxis Trust order ({transaction.paystack_reference}) has been delivered! "
        f"Your {48 if transaction.total_amount_ghs >= 2000 else 24}-hour inspection period has started. "
        f"Inspect your item and raise a dispute if needed before the timer expires."
    )
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Inspection Period Started", msg)

    return {"message": "OTP verified. Delivery confirmed. Inspection period has started."}


@delivery_router.post("/seller-claim-delivery", response=MessageResponse)
def seller_claim_delivery(request, data: ClaimDeliverySchema):
    """Seller force-claims delivery after 24h if buyer is unresponsive."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=data.transaction_id
    )
    _assert_seller(request, transaction)
    check_unresponsive_buyer_safeguard(transaction)
    return {"message": "Delivery successfully claimed. Inspection period force started."}
