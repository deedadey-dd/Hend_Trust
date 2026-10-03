from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from django.db.models import Q
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
    intended_buyer_username: Optional[str] = None
    is_direct_order: Optional[bool] = False
    image_url: Optional[str] = ""
    category: Optional[str] = ""

class LinkResponseSchema(Schema):
    id: uuid.UUID
    url: str
    is_direct_order: bool = False
    intended_buyer_username: Optional[str] = None

class LinkDetailSchema(Schema):
    id: uuid.UUID
    title: str
    description: str
    price_ghs: Decimal
    shipping_fee_ghs: Decimal
    fee_handling: str
    image_url: Optional[str] = ""
    category: Optional[str] = ""
    seller_username: Optional[str] = ""
    shop_name: Optional[str] = ""
    seller_email: Optional[str] = ""
    seller_phone: Optional[str] = ""
    seller_profile_picture_url: Optional[str] = ""
    shipping_timeout_days: Optional[int] = 4
    is_direct_order: Optional[bool] = False
    intended_buyer_username: Optional[str] = None
    intended_buyer_name: Optional[str] = None
    intended_buyer_phone: Optional[str] = None
    intended_buyer_email: Optional[str] = None
    intended_buyer_address: Optional[str] = None

class SellerLinkSchema(Schema):
    id: uuid.UUID
    title: str
    description: Optional[str] = ""
    price_ghs: Decimal
    shipping_fee_ghs: Optional[Decimal] = Decimal('0.00')
    fee_handling: Optional[str] = "PASS_TO_BUYER"
    intended_buyer_phone: Optional[str] = ""
    intended_buyer_username: Optional[str] = ""
    is_direct_order: bool = False
    image_url: Optional[str] = ""
    category: Optional[str] = ""
    created_at: str
    url: str
    is_active: bool = True
    is_archived: bool = False

@links_router.get("/search-buyer", response=dict)
def search_buyer(request, query: str):
    """
    Search registered platform buyers by @username, phone number, or email.
    """
    clean_query = (query or '').strip().lstrip('@')
    if len(clean_query) < 2:
        return {"results": []}

    from apps.users.models import User
    users = User.objects.filter(
        Q(username__icontains=clean_query) |
        Q(phone_number__icontains=clean_query) |
        Q(email__icontains=clean_query) |
        Q(first_name__icontains=clean_query) |
        Q(last_name__icontains=clean_query)
    ).exclude(id=request.user.id).exclude(is_suspended=True)[:8]

    return {
        "results": [
            {
                "id": str(u.id),
                "username": u.username,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "full_name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "role": u.role,
                "phone_number": u.phone_number,
                "email": u.email,
                "profile_picture_url": getattr(u, 'profile_picture_url', '') or '',
                "is_phone_verified": getattr(u, 'is_phone_verified', False),
            }
            for u in users
        ]
    }

@links_router.get("/incoming-orders", response=dict)
def list_incoming_direct_orders(request, status: str = 'PENDING'):
    """
    Retrieve incoming direct escrow orders sent to the authenticated buyer.
    status can be 'PENDING', 'PAID', 'DECLINED', or 'ALL'.
    """
    links = PaymentLink.objects.filter(
        intended_buyer=request.user,
        is_direct_order=True
    ).select_related('seller').order_by('-created_at')

    status_upper = (status or 'PENDING').strip().upper()
    if status_upper != 'ALL':
        links = links.filter(direct_order_status=status_upper)
    
    if status_upper == 'PENDING':
        links = links.filter(is_active=True, is_archived=False)

    base_url = _get_request_frontend_url(request)
    return {
        "orders": [
            {
                "id": str(link.id),
                "title": link.title,
                "description": link.description or "",
                "price_ghs": float(link.price_ghs),
                "shipping_fee_ghs": float(link.shipping_fee_ghs or Decimal('0.00')),
                "total_amount_ghs": float(link.price_ghs + (link.shipping_fee_ghs or Decimal('0.00'))),
                "fee_handling": link.fee_handling,
                "image_url": link.image_url or "",
                "category": link.category or getattr(link.seller, 'shop_category', '') or "General Marketplace",
                "seller_username": link.seller.username,
                "shop_name": getattr(link.seller, 'shop_name', '') or f"@{link.seller.username}",
                "seller_profile_picture_url": getattr(link.seller, 'profile_picture_url', '') or '',
                "created_at": link.created_at.isoformat(),
                "checkout_url": f"{base_url}/l/{link.id}",
                "status": link.direct_order_status,
                "is_active": link.is_active,
                "is_archived": link.is_archived,
            }
            for link in links
        ],
        "count": links.count()
    }

@links_router.post("/{link_id}/decline-direct-order", response=dict)
def decline_direct_order(request, link_id: uuid.UUID):
    """
    Allows a buyer to decline an incoming direct order.
    """
    link = get_object_or_404(PaymentLink, id=link_id, intended_buyer=request.user)
    link.direct_order_status = 'DECLINED'
    link.save(update_fields=['direct_order_status'])

    # Dispatch notification to seller that buyer declined
    from apps.notifications.services import create_notification
    from apps.notifications.models import NotificationType
    buyer_display = getattr(request.user, 'first_name', '') or request.user.username
    create_notification(
        user=link.seller,
        title=f"Order Declined: {link.title}",
        message=f"@{request.user.username} ({buyer_display}) declined the direct escrow order for '{link.title}'.",
        notif_type=NotificationType.IN_APP,
        metadata={
            "task_type": "DIRECT_ORDER_DECLINED",
            "link_id": str(link.id),
            "buyer_username": request.user.username,
        }
    )

    return {"message": "Order declined successfully", "id": str(link.id)}

@links_router.get("/", response=dict)
def list_seller_links(request, search: str = None, status_filter: str = 'all', delivery_type: str = 'all', direct_status: str = 'all', start_date: str = None, end_date: str = None, limit: int = 10, offset: int = 0):
    links = PaymentLink.objects.filter(seller=request.user).select_related('intended_buyer').order_by('-created_at')
    
    if status_filter == 'active':
        links = links.filter(is_archived=False, is_active=True)
    elif status_filter == 'disabled':
        links = links.filter(is_archived=False, is_active=False)
    elif status_filter == 'archived':
        links = links.filter(is_archived=True)
    else: # 'all' non-archived links
        links = links.filter(is_archived=False)

    if delivery_type == 'public':
        links = links.filter(is_direct_order=False)
    elif delivery_type == 'direct':
        links = links.filter(is_direct_order=True)

    if direct_status and direct_status.lower() != 'all':
        links = links.filter(direct_order_status=direct_status.upper())

    if search and search.strip():
        q_term = search.strip()
        links = links.filter(
            Q(title__icontains=q_term) |
            Q(description__icontains=q_term) |
            Q(intended_buyer__username__icontains=q_term) |
            Q(intended_buyer__first_name__icontains=q_term) |
            Q(intended_buyer__last_name__icontains=q_term)
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
                "description": link.description or "",
                "price_ghs": link.price_ghs,
                "shipping_fee_ghs": link.shipping_fee_ghs,
                "fee_handling": link.fee_handling,
                "intended_buyer_phone": link.intended_buyer_phone or "",
                "intended_buyer_username": link.intended_buyer.username if link.intended_buyer else "",
                "intended_buyer_name": f"{link.intended_buyer.first_name} {link.intended_buyer.last_name}".strip() if link.intended_buyer else "",
                "is_direct_order": link.is_direct_order,
                "direct_order_status": link.direct_order_status,
                "image_url": link.image_url or "",
                "category": link.category or getattr(link.seller, 'shop_category', '') or "General Marketplace",
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

    seller_cat = getattr(request.user, 'shop_category', '') or 'General Marketplace'
    chosen_category = (data.category or '').strip() or seller_cat

    target_buyer = None
    is_direct = bool(data.is_direct_order)
    buyer_identifier = (data.intended_buyer_username or '').strip()

    if buyer_identifier or is_direct:
        from apps.users.models import User
        clean_name = buyer_identifier.lstrip('@')
        target_buyer = User.objects.filter(
            Q(username__iexact=clean_name) |
            Q(phone_number=clean_name) |
            Q(email__iexact=clean_name)
        ).first()

        if not target_buyer and buyer_identifier:
            raise HttpError(400, f"Target buyer '{buyer_identifier}' was not found on HendAxis. Please verify their username or phone number.")

        if target_buyer:
            if target_buyer.id == request.user.id:
                raise HttpError(400, "You cannot send a direct payment link to your own account.")
            is_direct = True

    link = PaymentLink.objects.create(
        seller=request.user,
        intended_buyer=target_buyer,
        is_direct_order=is_direct,
        direct_order_status='PENDING',
        title=data.title.strip(),
        description=data.description.strip(),
        price_ghs=data.price_ghs,
        shipping_fee_ghs=data.shipping_fee_ghs or Decimal('0.00'),
        fee_handling=data.fee_handling,
        intended_buyer_phone=target_buyer.phone_number if target_buyer else (data.intended_buyer_phone.strip() if data.intended_buyer_phone else None),
        image_url=data.image_url.strip() if data.image_url else "",
        category=chosen_category
    )


    # If direct order to a registered buyer, send immediate in-app notification & alert
    if target_buyer:
        from apps.notifications.services import create_notification
        from apps.notifications.models import NotificationType
        seller_display = getattr(request.user, 'shop_name', '') or request.user.username
        total_price = link.price_ghs + (link.shipping_fee_ghs or Decimal('0.00'))
        create_notification(
            user=target_buyer,
            title=f"Direct Order: {link.title}",
            message=f"{seller_display} sent you a direct escrow order for '{link.title}' (GHS {total_price:,.2f}). Review and complete payment.",
            notif_type=NotificationType.IN_APP,
            action_url=f"/l/{link.id}",
            metadata={
                "task_type": "DIRECT_ORDER",
                "link_id": str(link.id),
                "seller_username": request.user.username,
                "price_ghs": float(link.price_ghs),
                "shipping_fee_ghs": float(link.shipping_fee_ghs or Decimal('0.00')),
            }
        )

    base_url = _get_request_frontend_url(request)
    return {
        "id": link.id,
        "url": f"{base_url}/l/{link.id}",
        "is_direct_order": link.is_direct_order,
        "intended_buyer_username": target_buyer.username if target_buyer else None
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
    link = get_object_or_404(PaymentLink.objects.select_related('seller', 'intended_buyer'), id=link_id)
    if link.is_archived or not link.is_active:
        seller_name = link.seller.shop_name or getattr(link.seller, 'name', '') or link.seller.username
        contact_target = f"Contact {seller_name}" if seller_name else "Contact Seller"
        raise HttpError(404, f"Payment link is invalid or inactive. {contact_target}")

    if getattr(link.seller, 'is_suspended', False):
        raise HttpError(403, "This payment link is currently unavailable because the seller's account has been suspended.")
        
    from apps.escrow.api import get_platform_settings
    cfg = get_platform_settings()
    timeout_days = int(cfg.get("shipping_timeout_days", 4))

    intended_buyer = link.intended_buyer
    buyer_fullname = f"{intended_buyer.first_name} {intended_buyer.last_name}".strip() if intended_buyer else None

    return {
        "id": link.id,
        "title": link.title,
        "description": link.description,
        "price_ghs": link.price_ghs,
        "shipping_fee_ghs": link.shipping_fee_ghs,
        "fee_handling": link.fee_handling,
        "image_url": link.image_url or "",
        "category": link.category or getattr(link.seller, 'shop_category', '') or "General Marketplace",
        "seller_username": link.seller.username or link.seller.email.split('@')[0],
        "shop_name": link.seller.shop_name or f"@{link.seller.username}'s Store",
        "seller_email": getattr(link.seller, 'email', ''),
        "seller_phone": getattr(link.seller, 'phone_number', ''),
        "seller_profile_picture_url": getattr(link.seller, 'profile_picture_url', '') or "",
        "shipping_timeout_days": timeout_days,
        "is_direct_order": link.is_direct_order,
        "intended_buyer_username": intended_buyer.username if intended_buyer else None,
        "intended_buyer_name": buyer_fullname,
        "intended_buyer_phone": intended_buyer.phone_number if intended_buyer else (link.intended_buyer_phone or None),
        "intended_buyer_email": intended_buyer.email if intended_buyer else None,
        "intended_buyer_address": getattr(intended_buyer, 'default_shipping_address', '') if intended_buyer else None,
    }

