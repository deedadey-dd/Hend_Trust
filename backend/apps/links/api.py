from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from apps.links.models import PaymentLink, FeeHandling
from typing import Optional
from decimal import Decimal
import uuid
from apps.users.api import _get_request_frontend_url

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
    shipping_timeout_days: Optional[int] = 4

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

    if search and search.strip():
        q_term = search.strip()
        links = links.filter(
            Q(title__icontains=q_term) |
            Q(description__icontains=q_term)
        )

    if start_date:
        links = links.filter(created_at__gte=start_date)
    if end_date:
        links = links.filter(created_at__lte=end_date)

    total_count = links.count()
    paginated_links = links[offset:offset+limit]

    base_url = _get_request_frontend_url(request)
    return {
        "items": [
            {
                "id": link.id,
                "title": link.title,
                "price_ghs": link.price_ghs,
                "image_url": link.image_url or "",
                "created_at": link.created_at.isoformat(),
                "url": f"{base_url}/l/{link.id}",
                "is_active": link.is_active,
                "is_archived": link.is_archived,
            }
            for link in paginated_links
        ],
        "total_count": total_count,
        "count": total_count,
        "limit": limit,
        "offset": offset,
    }

@links_router.post("/create", response=LinkResponseSchema)
def create_payment_link(request, data: CreateLinkSchema):
    if getattr(request.user, 'is_suspended', False):
        raise HttpError(403, "Your seller account is currently suspended. You cannot create new payment links. Please contact support or management for manual review.")

    link = PaymentLink.objects.create(
        seller=request.user,
        title=data.title.strip(),
        description=data.description.strip(),
        price_ghs=data.price_ghs,
        shipping_fee_ghs=data.shipping_fee_ghs or Decimal('0.00'),
        fee_handling=data.fee_handling,
        intended_buyer_phone=data.intended_buyer_phone.strip() if data.intended_buyer_phone else None,
        image_url=data.image_url.strip() if data.image_url else None
    )

    base_url = _get_request_frontend_url(request)
    return {
        "id": link.id,
        "url": f"{base_url}/l/{link.id}"
    }

@links_router.post("/{link_id}/toggle-active", response=dict)
def toggle_link_active(request, link_id: uuid.UUID):
    link = get_object_or_404(PaymentLink, id=link_id, seller=request.user)
    link.is_active = not link.is_active
    link.save(update_fields=['is_active'])
    return {
        "id": str(link.id),
        "is_active": link.is_active,
        "message": f"Link is now {'active' if link.is_active else 'disabled'}"
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

    if getattr(link.seller, 'is_suspended', False):
        raise HttpError(403, "This payment link is currently unavailable because the seller's account has been suspended.")
        
    from apps.escrow.api import get_platform_settings
    cfg = get_platform_settings()
    timeout_days = int(cfg.get("shipping_timeout_days", 4))

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
        "shipping_timeout_days": timeout_days,
    }
