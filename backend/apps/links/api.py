from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from apps.links.models import PaymentLink, FeeHandling
from typing import Optional
from decimal import Decimal
from django.db.models import Q
import uuid

links_router = Router(tags=["Payment Links"], auth=JWTCookieAuth())

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
    seller_username: Optional[str] = ""
    seller_email: Optional[str] = ""
    seller_phone: Optional[str] = ""

class SellerLinkSchema(Schema):
    id: uuid.UUID
    title: str
    price_ghs: Decimal
    created_at: str
    url: str

@links_router.get("/", response=dict)
def list_seller_links(request, search: str = None, start_date: str = None, end_date: str = None, limit: int = 10, offset: int = 0):
    links = PaymentLink.objects.filter(seller=request.user).order_by('-created_at')
    if search:
        links = links.filter(Q(title__icontains=search) | Q(description__icontains=search))
    if start_date:
        links = links.filter(created_at__date__gte=start_date)
    if end_date:
        links = links.filter(created_at__date__lte=end_date)
    total = links.count()
    page = links[offset:offset + limit]
    return {
        "count": total,
        "items": [
            {
                "id": str(l.id),
                "title": l.title,
                "price_ghs": str(l.price_ghs),
                "created_at": l.created_at.isoformat(),
                "url": f"https://pay.hendaxis.com/l/{l.id}"
            } for l in page
        ]
    }

@links_router.post("/create", response=LinkResponseSchema)
def create_link(request, data: CreateLinkSchema):

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

@links_router.get("/{link_id}", response=LinkDetailSchema, auth=None)
def get_link(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink.objects.select_related('seller'), id=link_id)
    if not link.is_active:
        raise HttpError(404, "Payment link is inactive")
        
    return {
        "id": link.id,
        "title": link.title,
        "description": link.description,
        "price_ghs": link.price_ghs,
        "shipping_fee_ghs": link.shipping_fee_ghs,
        "fee_handling": link.fee_handling,
        "seller_username": link.seller.username or link.seller.email.split('@')[0],
        "seller_email": getattr(link.seller, 'email', ''),
        "seller_phone": getattr(link.seller, 'phone_number', ''),
    }
