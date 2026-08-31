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
    image_url: Optional[str] = ""

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
    image_url: Optional[str] = ""
    seller_username: Optional[str] = ""
    shop_name: Optional[str] = ""
    seller_email: Optional[str] = ""
    seller_phone: Optional[str] = ""
    seller_profile_picture_url: Optional[str] = ""

class SellerLinkSchema(Schema):
    id: uuid.UUID
    title: str
    price_ghs: Decimal
    image_url: Optional[str] = ""
    created_at: str
    url: str

@links_router.get("/", response=dict)
def list_seller_links(request, search: str = None, status_filter: str = 'all', start_date: str = None, end_date: str = None, limit: int = 10, offset: int = 0):
    links = PaymentLink.objects.filter(seller=request.user).order_by('-created_at')
    
    if status_filter == 'active':
        links = links.filter(is_archived=False, is_active=True)
    elif status_filter == 'disabled':
        links = links.filter(is_archived=False, is_active=False)
    elif status_filter == 'archived':
        links = links.filter(is_archived=True)
    else: # 'all' non-archived links
        links = links.filter(is_archived=False)

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
                "description": l.description,
                "price_ghs": str(l.price_ghs),
                "shipping_fee_ghs": str(l.shipping_fee_ghs),
                "fee_handling": l.fee_handling,
                "image_url": l.image_url or "",
                "is_active": l.is_active,
                "is_archived": l.is_archived,
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
        intended_buyer_phone=data.intended_buyer_phone,
        image_url=data.image_url or ''
    )
    return {"id": link.id, "url": f"https://pay.hendaxis.com/l/{link.id}"}

@links_router.post("/{link_id}/toggle-active", response=dict)
def toggle_link_active(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink, id=link_id, seller=request.user)
    link.is_active = not link.is_active
    link.save(update_fields=['is_active'])
    return {
        "id": str(link.id),
        "is_active": link.is_active,
        "message": f"Payment link {'enabled' if link.is_active else 'disabled'} successfully"
    }

@links_router.post("/{link_id}/archive", response=dict)
def archive_link(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink, id=link_id, seller=request.user)
    link.is_archived = True
    link.is_active = False
    link.save(update_fields=['is_archived', 'is_active'])
    return {
        "id": str(link.id),
        "is_archived": True,
        "is_active": False,
        "message": "Payment link archived successfully"
    }

@links_router.post("/{link_id}/unarchive", response=dict)
def unarchive_link(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink, id=link_id, seller=request.user)
    link.is_archived = False
    link.is_active = True
    link.save(update_fields=['is_archived', 'is_active'])
    return {
        "id": str(link.id),
        "is_archived": False,
        "is_active": True,
        "message": "Payment link unarchived successfully"
    }

@links_router.get("/{link_id}", response=LinkDetailSchema, auth=None)
def get_link(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink.objects.select_related('seller'), id=link_id)
    if link.is_archived or not link.is_active:
        seller_name = link.seller.shop_name or getattr(link.seller, 'name', '') or link.seller.username
        contact_target = f"Contact {seller_name}" if seller_name else "Contact Seller"
        raise HttpError(404, f"Payment link is invalid or inactive. {contact_target}")
        
    return {
        "id": link.id,
        "title": link.title,
        "description": link.description,
        "price_ghs": link.price_ghs,
        "shipping_fee_ghs": link.shipping_fee_ghs,
        "fee_handling": link.fee_handling,
        "image_url": link.image_url or "",
        "seller_username": link.seller.username or link.seller.email.split('@')[0],
        "shop_name": link.seller.shop_name or f"@{link.seller.username}'s Store",
        "seller_email": getattr(link.seller, 'email', ''),
        "seller_phone": getattr(link.seller, 'phone_number', ''),
        "seller_profile_picture_url": getattr(link.seller, 'profile_picture_url', '') or "",
    }
