from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count
from django.utils import timezone
from hendaxis_trust.auth import JWTCookieAuth
from apps.escrow.models import Transaction, TransactionStatus
from apps.users.models import User
from apps.reviews.models import SellerReview
from typing import Optional, List
import uuid

reviews_router = Router(tags=["Seller Reviews & Public Storefronts"])

class SubmitReviewSchema(Schema):
    transaction_id: uuid.UUID
    rating_speed: int
    rating_communication: int
    rating_overall: int
    comment: Optional[str] = ""

class SellerReplySchema(Schema):
    reply: str

class ReviewItemSchema(Schema):
    id: uuid.UUID
    buyer_name: str
    rating_speed: int
    rating_communication: int
    rating_overall: int
    comment: str
    seller_reply: Optional[str] = ""
    seller_replied_at: Optional[str] = None
    created_at: str
    item_title: str

class SellerStorefrontSchema(Schema):
    seller_id: uuid.UUID
    seller_username: str
    shop_name: Optional[str] = ""
    profile_picture_url: Optional[str] = ""
    banner_url: Optional[str] = ""
    joined_at: str
    total_completed_escrows: int
    total_reviews_count: int
    avg_overall: float
    avg_speed: float
    avg_communication: float
    badge_verified_seller: bool
    badge_top_rated: bool
    badge_title: Optional[str] = None
    reviews: List[ReviewItemSchema]

@reviews_router.post("/submit", response=dict)
def submit_seller_review(request, data: SubmitReviewSchema):
    transaction = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), id=data.transaction_id)
    
    if transaction.status in [TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]:
        raise HttpError(400, "Cannot review a cancelled or refunded transaction.")
        
    if transaction.status == TransactionStatus.DISPUTED:
        raise HttpError(400, "Cannot submit review while transaction is in dispute.")

    for field, val in [('rating_speed', data.rating_speed), ('rating_communication', data.rating_communication), ('rating_overall', data.rating_overall)]:
        if val < 1 or val > 5:
            raise HttpError(400, f"{field} must be between 1 and 5 stars.")

    review, created = SellerReview.objects.update_or_create(
        transaction=transaction,
        defaults={
            'seller': transaction.link.seller,
            'buyer_name': transaction.buyer_name,
            'buyer_phone': transaction.buyer_phone,
            'rating_speed': data.rating_speed,
            'rating_communication': data.rating_communication,
            'rating_overall': data.rating_overall,
            'comment': data.comment or "",
            'is_active': True
        }
    )

    return {
        "message": "Thank you! Your rating and review have been published to the seller's storefront profile.",
        "review_id": str(review.id)
    }

@reviews_router.get("/seller/{identifier}", response=SellerStorefrontSchema, auth=None)
def get_seller_storefront(request, identifier: str):
    from django.db.models import Q
    try:
        seller_uuid = uuid.UUID(identifier)
        seller = get_object_or_404(User, id=seller_uuid)
    except ValueError:
        seller = User.objects.filter(
            Q(username__iexact=identifier) | Q(shop_name__iexact=identifier)
        ).first()
        if not seller:
            raise HttpError(404, "Seller profile not found")

    # Completed escrows count
    completed_escrows = Transaction.objects.filter(
        link__seller=seller,
        status=TransactionStatus.COMPLETED
    ).count()

    active_reviews = SellerReview.objects.filter(seller=seller, is_active=True).select_related('transaction', 'transaction__link')

    totals = active_reviews.aggregate(
        avg_o=Avg('rating_overall'),
        avg_s=Avg('rating_speed'),
        avg_c=Avg('rating_communication'),
        count=Count('id')
    )

    avg_overall = round(totals['avg_o'] or 0.0, 1)
    avg_speed = round(totals['avg_s'] or 0.0, 1)
    avg_comm = round(totals['avg_c'] or 0.0, 1)
    total_reviews = totals['count'] or 0

    # Badge Logic ("Earned Trust") - Verified badge ONLY granted if manager approved documents!
    from apps.users.models import VerificationStatus
    badge_verified_seller = (seller.verification_status == VerificationStatus.APPROVED)
    badge_top_rated = badge_verified_seller and completed_escrows >= 10 and avg_overall >= 4.5 and total_reviews >= 5

    badge_title = None
    if badge_top_rated:
        badge_title = "⭐ Top-Rated Verified Merchant"
    elif badge_verified_seller:
        badge_title = "🛡️ Verified Seller"

    reviews_list = [
        {
            "id": r.id,
            "buyer_name": r.buyer_name,
            "rating_speed": r.rating_speed,
            "rating_communication": r.rating_communication,
            "rating_overall": r.rating_overall,
            "comment": r.comment,
            "seller_reply": r.seller_reply,
            "seller_replied_at": r.seller_replied_at.isoformat() if r.seller_replied_at else None,
            "created_at": r.created_at.isoformat(),
            "item_title": r.transaction.link.title if r.transaction and r.transaction.link else "Item Purchase"
        } for r in active_reviews
    ]

    return {
        "seller_id": seller.id,
        "seller_username": seller.username or seller.email.split('@')[0],
        "shop_name": seller.shop_name or f"@{seller.username}'s Store",
        "profile_picture_url": seller.profile_picture_url or "",
        "banner_url": seller.banner_url or "",
        "joined_at": seller.date_joined.isoformat(),
        "total_completed_escrows": completed_escrows,
        "total_reviews_count": total_reviews,
        "avg_overall": avg_overall,
        "avg_speed": avg_speed,
        "avg_communication": avg_comm,
        "badge_verified_seller": badge_verified_seller,
        "badge_top_rated": badge_top_rated,
        "badge_title": badge_title,
        "reviews": reviews_list
    }

@reviews_router.post("/{review_id}/seller-reply", response=dict, auth=JWTCookieAuth())
def seller_reply_review(request, review_id: uuid.UUID, data: SellerReplySchema):
    review = get_object_or_404(SellerReview, id=review_id)
    if review.seller != request.user:
        raise HttpError(403, "You can only reply to reviews on your own seller profile.")
        
    review.seller_reply = data.reply
    review.seller_replied_at = timezone.now()
    review.save(update_fields=['seller_reply', 'seller_replied_at'])

    return {"message": "Reply published successfully."}


class UpdateShopProfileSchema(Schema):
    shop_name: Optional[str] = ""
    shop_description: Optional[str] = ""
    shop_category: Optional[str] = "General"
    profile_picture_url: Optional[str] = None
    banner_url: Optional[str] = None

class PromoteShopSchema(Schema):
    duration_days: int # 7 or 30

class ShopProductSchema(Schema):
    link_id: str
    title: str
    price_ghs: float

class ShopCardSchema(Schema):
    seller_id: uuid.UUID
    seller_username: str
    shop_name: str
    shop_description: str
    shop_category: str
    shop_categories: List[str] = []
    profile_picture_url: Optional[str] = ""
    banner_url: Optional[str] = ""
    joined_at: str
    total_completed_escrows: int
    total_reviews_count: int
    avg_overall: float
    badge_title: Optional[str] = None
    is_featured: bool
    advertised_until: Optional[str] = None
    featured_products: List[ShopProductSchema]

class MarketplaceDirectorySchema(Schema):
    featured_shops: List[ShopCardSchema]
    standard_shops: List[ShopCardSchema]


@reviews_router.get("/shops", response=MarketplaceDirectorySchema, auth=None)
def get_marketplace_directory(request, query: Optional[str] = None, category: Optional[str] = None):
    from django.db.models import Q
    from apps.links.models import PaymentLink
    from apps.users.models import VerificationStatus

    now = timezone.now()
    
    # Select all sellers or users with links, shop details, or non-unsubmitted verification
    sellers_qs = User.objects.filter(
        Q(role='SELLER') | Q(payment_links__isnull=False) | ~Q(shop_name='') | ~Q(verification_status='UNSUBMITTED')
    ).distinct()

    if category and category.lower() != 'all':
        sellers_qs = sellers_qs.filter(
            Q(shop_category__iexact=category) | Q(shop_categories__icontains=category)
        )

    if query and query.strip():
        q_str = query.strip()
        matching_link_seller_ids = PaymentLink.objects.filter(
            Q(title__icontains=q_str) | Q(description__icontains=q_str),
            is_active=True
        ).values_list('seller_id', flat=True)

        sellers_qs = sellers_qs.filter(
            Q(username__icontains=q_str) |
            Q(shop_name__icontains=q_str) |
            Q(shop_description__icontains=q_str) |
            Q(id__in=matching_link_seller_ids)
        )

    sellers = list(sellers_qs)

    featured_list = []
    standard_list = []

    for seller in sellers:
        # Skip internal superusers without links or shop name
        seller_links = PaymentLink.objects.filter(seller=seller, is_active=True)
        if (seller.is_superuser or seller.is_staff) and seller.role != 'SELLER' and seller_links.count() == 0 and not seller.shop_name:
            continue

        completed_escrows = Transaction.objects.filter(
            link__seller=seller,
            status=TransactionStatus.COMPLETED
        ).count()

        active_reviews = SellerReview.objects.filter(seller=seller, is_active=True)
        totals = active_reviews.aggregate(avg_o=Avg('rating_overall'), count=Count('id'))
        
        avg_overall = round(totals['avg_o'] or 0.0, 1)
        total_reviews = totals['count'] or 0

        # Badge Logic - Verified badge ONLY granted if manager approved documents!
        badge_verified_seller = (seller.verification_status == VerificationStatus.APPROVED)
        badge_top_rated = badge_verified_seller and completed_escrows >= 10 and avg_overall >= 4.5 and total_reviews >= 5
        badge_title = None
        if badge_top_rated:
            badge_title = "⭐ Top-Rated Merchant"
        elif badge_verified_seller:
            badge_title = "🛡️ Verified Seller"
        else:
            badge_title = "🆕 New Shop"

        is_featured = bool(seller.advertised_until and seller.advertised_until > now)

        # Top 3 products
        products = [
            {
                "link_id": str(link.id),
                "title": link.title,
                "price_ghs": float(link.price_ghs)
            } for link in seller_links[:3]
        ]

        # Categories (up to 3)
        cats = seller.shop_categories if isinstance(seller.shop_categories, list) else []
        if not cats and seller.shop_category:
            cats = [seller.shop_category]

        shop_data = {
            "seller_id": seller.id,
            "seller_username": seller.username or seller.email.split('@')[0],
            "shop_name": seller.shop_name or f"@{seller.username}'s Store",
            "shop_description": seller.shop_description or f"Escrow Merchant on HendAxis Trust.",
            "shop_category": seller.shop_category or "General",
            "shop_categories": cats[:3],
            "profile_picture_url": seller.profile_picture_url or "",
            "banner_url": seller.banner_url or "",
            "joined_at": seller.date_joined.isoformat(),
            "total_completed_escrows": completed_escrows,
            "total_reviews_count": total_reviews,
            "avg_overall": avg_overall,
            "badge_title": badge_title,
            "is_featured": is_featured,
            "advertised_until": seller.advertised_until.isoformat() if seller.advertised_until else None,
            "featured_products": products
        }

        if is_featured:
            featured_list.append(shop_data)
        else:
            standard_list.append(shop_data)

    return {
        "featured_shops": featured_list,
        "standard_shops": standard_list
    }


@reviews_router.put("/shop/profile", response=dict, auth=JWTCookieAuth())
def update_shop_profile(request, data: UpdateShopProfileSchema):
    user = request.user
    update_fields = []
    if data.shop_name is not None:
        user.shop_name = data.shop_name.strip()
        update_fields.append('shop_name')
    if data.shop_description is not None:
        user.shop_description = data.shop_description.strip()
        update_fields.append('shop_description')
    if data.shop_category is not None:
        user.shop_category = data.shop_category.strip()
        update_fields.append('shop_category')
    if data.profile_picture_url is not None:
        user.profile_picture_url = data.profile_picture_url.strip()
        update_fields.append('profile_picture_url')
    if data.banner_url is not None:
        user.banner_url = data.banner_url.strip()
        update_fields.append('banner_url')

    if update_fields:
        user.save(update_fields=update_fields)
    return {"message": "Shop profile updated successfully."}


@reviews_router.post("/shop/promote", response=dict, auth=JWTCookieAuth())
def promote_shop_ad(request, data: PromoteShopSchema):
    from decimal import Decimal
    from datetime import timedelta
    from django.conf import settings
    from apps.wallet.models import SellerWallet
    from apps.ledger.services import record_ad_promotion_fee
    from apps.checkout.services import PaystackAdapter
    import uuid6

    if data.duration_days not in [7, 30]:
        raise HttpError(400, "Invalid duration. Choose 7 Days (GHS 50) or 30 Days (GHS 150).")

    fee = Decimal("50.00") if data.duration_days == 7 else Decimal("150.00")
    wallet, _ = SellerWallet.objects.get_or_create(user=request.user)

    # Option 1: Pay using Wallet Balance if sufficient funds
    if wallet.available_balance_ghs >= fee:
        ref_id = uuid6.uuid7()
        record_ad_promotion_fee(reference_id=ref_id, seller_user_id=request.user.id, fee_amount=fee)

        now = timezone.now()
        current_expiry = request.user.advertised_until if (request.user.advertised_until and request.user.advertised_until > now) else now
        new_expiry = current_expiry + timedelta(days=data.duration_days)

        request.user.advertised_until = new_expiry
        request.user.save(update_fields=['advertised_until'])

        return {
            "message": f"Success! Your shop is now featured at the top of the Marketplace Directory for {data.duration_days} days.",
            "requires_paystack": False,
            "advertised_until": new_expiry.isoformat(),
            "fee_paid_ghs": float(fee)
        }

    # Option 2: Pay directly via Paystack Checkout if insufficient wallet balance
    reference = f"AD_{data.duration_days}D_{uuid6.uuid7().hex[:8]}"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    callback_url = f"{frontend_url}/shops?ad_success=true"

    try:
        paystack_data = PaystackAdapter.initialize_transaction(
            email=request.user.email or f"{request.user.username}@hendaxis.com",
            amount_ghs=float(fee),
            reference=reference,
            callback_url=callback_url
        )
        return {
            "message": "Redirecting to Paystack for store promotion payment...",
            "requires_paystack": True,
            "checkout_url": paystack_data['authorization_url'],
            "reference": reference
        }
    except Exception as e:
        raise HttpError(400, f"Failed to initialize Paystack ad payment: {str(e)}")

