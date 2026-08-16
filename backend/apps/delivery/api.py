from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.models import DeliveryLog, DeliveryMethod
from apps.delivery.services import (
    transition_to_delivery,
    transition_to_inspection,
    generate_delivery_otp,
    verify_delivery_otp,
    check_unresponsive_buyer_safeguard
)
import uuid

delivery_router = Router(tags=["Delivery & Logistics"])

class DispatchCourierSchema(Schema):
    transaction_id: uuid.UUID
    courier_name: str
    tracking_number: str

class DispatchWaybillSchema(Schema):
    transaction_id: uuid.UUID
    bus_company: str
    driver_phone: str
    destination_station: str
    waybill_photo_url: str = "https://mock-image-url.com/waybill.jpg"

class VerifyOtpSchema(Schema):
    transaction_id: uuid.UUID
    otp_code: str

class ClaimDeliverySchema(Schema):
    transaction_id: uuid.UUID

class MessageResponse(Schema):
    message: str

@delivery_router.post("/dispatch-courier", response=MessageResponse)
def dispatch_courier(request, data: DispatchCourierSchema):
    # In reality, verify request.user is the seller of the link
    transaction = get_object_or_404(Transaction, id=data.transaction_id)
    
    transition_to_delivery(transaction)
    
    DeliveryLog.objects.create(
        transaction=transaction,
        delivery_method=DeliveryMethod.COURIER_API,
        courier_name=data.courier_name,
        tracking_number=data.tracking_number
    )
    
    return {"message": "Courier dispatched. Transaction state updated to DELIVERY_IN_PROGRESS."}

@delivery_router.post("/dispatch-waybill", response=MessageResponse)
def dispatch_waybill(request, data: DispatchWaybillSchema):
    transaction = get_object_or_404(Transaction, id=data.transaction_id)
    
    transition_to_delivery(transaction)
    
    DeliveryLog.objects.create(
        transaction=transaction,
        delivery_method=DeliveryMethod.INFORMAL_BUS,
        courier_name=data.bus_company,
        driver_phone=data.driver_phone,
        destination_station=data.destination_station,
        waybill_photo_url=data.waybill_photo_url
    )
    
    generate_delivery_otp(str(transaction.id))
    
    return {"message": "Waybill dispatched. OTP sent to buyer."}

@delivery_router.post("/verify-otp", response=MessageResponse)
def verify_otp(request, data: VerifyOtpSchema):
    transaction = get_object_or_404(Transaction, id=data.transaction_id)
    
    if not verify_delivery_otp(str(transaction.id), data.otp_code):
        raise HttpError(400, "Invalid or expired delivery OTP")
        
    transition_to_inspection(transaction)
    return {"message": "OTP verified successfully. Inspection period started."}

@delivery_router.post("/seller-claim-delivery", response=MessageResponse)
def seller_claim_delivery(request, data: ClaimDeliverySchema):
    transaction = get_object_or_404(Transaction, id=data.transaction_id)
    check_unresponsive_buyer_safeguard(transaction)
    return {"message": "Delivery successfully claimed. Inspection period force started."}
