from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.links.models import PaymentLink, FeeHandling
from typing import Optional
from decimal import Decimal
import uuid

links_router = Router(tags=["Payment Links"])

class CreateLinkSchema(Schema):
    title: str
    description: Optional[str] = ""
    price_ghs: Decimal
    shipping_fee_ghs: Optional[Decimal] = Decimal('0.00')
    fee_handling: str = FeeHandling.PASS_TO_BUYER
    intended_buyer_phone: Optional[str] = None

class LinkResponseSchema(Schema):
    id: uuid.UUID
    url: str

class LinkDetailSchema(Schema):
    id: uuid.UUID
    title: str
    description: str
    price_ghs: Decimal
    shipping_fee_ghs: Decimal
    fee_handling: str

@links_router.post("/create", response=LinkResponseSchema)
def create_link(request, data: CreateLinkSchema):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")

    link = PaymentLink.objects.create(
        seller=request.user,
        title=data.title,
        description=data.description,
        price_ghs=data.price_ghs,
        shipping_fee_ghs=data.shipping_fee_ghs,
        fee_handling=data.fee_handling,
        intended_buyer_phone=data.intended_buyer_phone
    )
    
    # Return a mocked short URL based on ID
    return {"id": link.id, "url": f"https://pay.hendaxis.com/l/{link.id}"}

@links_router.get("/{link_id}", response=LinkDetailSchema)
def get_link(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink, id=link_id)
    if not link.is_active:
        raise HttpError(404, "Payment link is inactive")
        
    return {
        "id": link.id,
        "title": link.title,
        "description": link.description,
        "price_ghs": link.price_ghs,
        "shipping_fee_ghs": link.shipping_fee_ghs,
        "fee_handling": link.fee_handling
    }
