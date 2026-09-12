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

from django.conf import settings

reviews_router = Router(tags=["Seller Reviews & Public Storefronts"])

class SubmitReviewSchema(Schema):
    transaction_id: uuid.UUID
    rating_speed: int
    rating_communication: int
    rating_overall: int
    comment: Optional[str] = ""
    image_url: Optional[str] = ""
    review_token: Optional[str] = None

class RequestEditLinkSchema(Schema):
    paystack_reference: str
    buyer_phone: str

class TransactionReviewDetailSchema(Schema):
    has_existing_review: bool
    transaction_id: uuid.UUID
    paystack_reference: str
    item_title: str
    seller_name: str
    buyer_name: str
    rating_speed: int = 5
    rating_communication: int = 5
    rating_overall: int = 5
    comment: str = ""
    review_id: Optional[str] = None

class SellerReplySchema(Schema):
    reply: str

class ReviewVoteSchema(Schema):
    vote_type: str  # 'UP' or 'DOWN'

class RecentReviewShopSchema(Schema):
    seller_id: uuid.UUID
    seller_username: str
    shop_name: str
    profile_picture_url: Optional[str] = ""

class RecentReviewItemSchema(Schema):
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
    item_image_url: Optional[str] = ""
    upvotes_count: int
    downvotes_count: int
    user_voted: Optional[str] = None
    shop: RecentReviewShopSchema

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
    item_image_url: Optional[str] = ""
    upvotes_count: int = 0
    downvotes_count: int = 0
    user_voted: Optional[str] = None


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
    
    if transaction.buyer_review_token and data.review_token != transaction.buyer_review_token:
        raise HttpError(403, "Invalid review authorization token. Only the verified buyer can submit or edit this review.")

    if transaction.status in [TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]:
        raise HttpError(400, "Cannot review a cancelled or refunded transaction.")
        
    if transaction.status == TransactionStatus.DISPUTED:
        raise HttpError(400, "Cannot submit review while transaction is in dispute.")

    if transaction.status not in [TransactionStatus.INSPECTION_PERIOD, TransactionStatus.COMPLETED]:
        raise HttpError(400, "Reviews unlock once the package is delivered and inspection begins.")

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
            'image_url': data.image_url or "",
            'is_active': True
        }
    )

    action = "created" if created else "updated"
    return {
        "message": f"Thank you! Your rating and review have been {action} on the seller's storefront profile.",
        "review_id": str(review.id),
        "review_token": transaction.buyer_review_token
    }

@reviews_router.get("/transaction-review/{paystack_reference}", response=TransactionReviewDetailSchema, auth=None)
def get_transaction_review_detail(request, paystack_reference: str, token: Optional[str] = None):
    transaction = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), paystack_reference=paystack_reference)

    if transaction.buyer_review_token and token != transaction.buyer_review_token:
        raise HttpError(403, "Invalid review authorization token.")

    review = SellerReview.objects.filter(transaction=transaction).first()
    seller = transaction.link.seller if (transaction.link and transaction.link.seller) else None
    seller_title = seller.shop_name or seller.username if seller else "Seller"

    return {
        "has_existing_review": bool(review),
        "transaction_id": transaction.id,
        "paystack_reference": transaction.paystack_reference,
        "item_title": transaction.link.title if transaction.link else "Escrow Purchase",
        "seller_name": seller_title,
        "buyer_name": transaction.buyer_name,
        "rating_speed": review.rating_speed if review else 5,
        "rating_communication": review.rating_communication if review else 5,
        "rating_overall": review.rating_overall if review else 5,
        "comment": review.comment if review else "",
        "review_id": str(review.id) if review else None,
    }

@reviews_router.post("/request-edit-link", response=dict, auth=None)
def request_review_edit_link(request, data: RequestEditLinkSchema):
    transaction = Transaction.objects.filter(
        paystack_reference__iexact=data.paystack_reference.strip(),
        buyer_phone__icontains=data.buyer_phone.strip()
    ).first()

    if not transaction:
        raise HttpError(404, "No transaction found matching the reference and buyer phone number.")

    if not transaction.buyer_email:
        raise HttpError(400, "No buyer email address was provided during checkout for this transaction.")

    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://localhost:5173')
    magic_link = f"{frontend_url}/reviews?ref={transaction.paystack_reference}&token={transaction.buyer_review_token}"

    try:
        from django.core.mail import send_mail
        send_mail(
            subject="HendAxis Trust - Edit Your Seller Review",
            message=f"Hi {transaction.buyer_name or 'Buyer'},\n\nUse the link below to view or edit your review for transaction {transaction.paystack_reference}:\n\n{magic_link}\n\nThank you for using HendAxis Trust!",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
            recipient_list=[transaction.buyer_email],
            fail_silently=True
        )
    except Exception as e:
        print(f"Error sending review magic link email: {e}")

    return {
        "message": f"A secure edit link has been sent to {transaction.buyer_email}."
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
            "item_title": r.transaction.link.title if (r.transaction and r.transaction.link) else "Item Purchase",
            "item_image_url": r.image_url or (r.transaction.link.image_url if (r.transaction and r.transaction.link) else ""),
            "upvotes_count": r.upvotes_count,
            "downvotes_count": r.downvotes_count,
            "user_voted": None
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
    pay_via_gateway: Optional[bool] = False
    approved_wallet_deduction: Optional[bool] = False

class ShopAdInvoiceSchema(Schema):
    id: uuid.UUID
    invoice_number: str
    seller_name: str
    seller_username: str
    seller_email: str
    seller_phone: str
    duration_days: int
    amount_ghs: float
    payment_method: str
    reference_code: str
    advertised_from: str
    advertised_until: str
    created_at: str

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
    from django.db.models import Q, Prefetch, Count, Avg
    from apps.links.models import PaymentLink
    from apps.users.models import VerificationStatus

    now = timezone.now()
    
    # Select all sellers or users with links, shop details, or non-unsubmitted verification
    sellers_qs = User.objects.filter(
        Q(role='SELLER') | Q(payment_links__isnull=False) | ~Q(shop_name='') | ~Q(verification_status='UNSUBMITTED')
    ).distinct().prefetch_related(
        Prefetch('payment_links', queryset=PaymentLink.objects.filter(is_active=True), to_attr='active_links')
    )

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
    seller_ids = [s.id for s in sellers]

    # Pre-fetch completed escrows count per seller in 1 batch query
    escrow_counts = dict(
        Transaction.objects.filter(
            link__seller_id__in=seller_ids,
            status=TransactionStatus.COMPLETED
        ).values('link__seller_id').annotate(total=Count('id')).values_list('link__seller_id', 'total')
    )

    # Pre-fetch review stats per seller in 1 batch query
    review_stats_qs = SellerReview.objects.filter(
        seller_id__in=seller_ids,
        is_active=True
    ).values('seller_id').annotate(
        avg_o=Avg('rating_overall'),
        total=Count('id')
    )
    review_stats = {r['seller_id']: (r['avg_o'], r['total']) for r in review_stats_qs}

    featured_list = []
    standard_list = []

    for seller in sellers:
        seller_links = getattr(seller, 'active_links', [])
        # Skip internal superusers without links or shop name
        if (seller.is_superuser or seller.is_staff) and seller.role != 'SELLER' and len(seller_links) == 0 and not seller.shop_name:
            continue

        completed_escrows = escrow_counts.get(seller.id, 0)
        avg_o_val, total_reviews_val = review_stats.get(seller.id, (0.0, 0))
        
        avg_overall = round(avg_o_val or 0.0, 1)
        total_reviews = total_reviews_val or 0

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
    from apps.reviews.services import create_and_send_ad_invoice
    import uuid6

    if data.duration_days not in [7, 30]:
        raise HttpError(400, "Invalid duration. Choose 7 Days (GHS 50) or 30 Days (GHS 150).")

    fee = Decimal("50.00") if data.duration_days == 7 else Decimal("150.00")
    wallet, _ = SellerWallet.objects.get_or_create(user=request.user)

    payout_mode = getattr(request.user, 'payout_mode', 'INSTANT')
    has_sufficient_wallet = (wallet.available_balance_ghs >= fee and payout_mode != 'INSTANT')

    # Option A: Pay via Gateway (if explicitly requested OR if wallet balance is insufficient / seller is on INSTANT payout mode)
    if data.pay_via_gateway or not has_sufficient_wallet:
        default_url = 'https://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
        frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
        callback_url = f"{frontend_url}/shops?ad_success=true"
        reference = f"AD_{data.duration_days}D_{request.user.id}_{int(timezone.now().timestamp())}"

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
                "requires_approval": False,
                "checkout_url": paystack_data['authorization_url'],
                "reference": reference
            }
        except Exception as e:
            raise HttpError(400, f"Failed to initialize Paystack ad payment: {str(e)}")

    # Option B: Wallet Balance Available - Prompt for Explicit Approval
    if not data.approved_wallet_deduction:
        rem_balance = wallet.available_balance_ghs - fee
        return {
            "message": f"Deduction of GHS {fee:.2f} from your wallet balance requires your confirmation.",
            "requires_approval": True,
            "requires_paystack": False,
            "available_balance_ghs": float(wallet.available_balance_ghs),
            "fee_amount_ghs": float(fee),
            "remaining_balance_ghs": float(rem_balance),
            "duration_days": data.duration_days
        }

    # Approved Wallet Deduction: Execute transaction & dispatch downloadable invoice receipt
    ref_id = uuid6.uuid7()
    record_ad_promotion_fee(reference_id=ref_id, seller_user_id=request.user.id, fee_amount=fee)

    now = timezone.now()
    current_expiry = request.user.advertised_until if (request.user.advertised_until and request.user.advertised_until > now) else now
    new_expiry = current_expiry + timedelta(days=data.duration_days)

    request.user.advertised_until = new_expiry
    request.user.save(update_fields=['advertised_until'])

    # Create & Send Invoice Email Receipt
    invoice = create_and_send_ad_invoice(
        seller=request.user,
        duration_days=data.duration_days,
        fee_amount=fee,
        payment_method='WALLET',
        reference_code=str(ref_id),
        advertised_from=current_expiry,
        advertised_until=new_expiry
    )

    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    invoice_url = f"{frontend_url}/ad-invoice/{invoice.id}"

    return {
        "message": f"Success! GHS {fee:.2f} deducted from your wallet balance. Your shop is featured for {data.duration_days} days.",
        "requires_paystack": False,
        "requires_approval": False,
        "advertised_until": new_expiry.isoformat(),
        "fee_paid_ghs": float(fee),
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "invoice_url": invoice_url
    }


@reviews_router.get("/shop/ad-invoice/{invoice_id}", response=ShopAdInvoiceSchema, auth=None)
def get_shop_ad_invoice(request, invoice_id: uuid.UUID):
    from apps.reviews.models import ShopAdInvoice
    invoice = get_object_or_404(ShopAdInvoice.objects.select_related('seller'), id=invoice_id)
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "seller_name": invoice.seller.first_name or invoice.seller.username,
        "seller_username": invoice.seller.username,
        "seller_email": invoice.seller.email or "",
        "seller_phone": invoice.seller.phone_number or "",
        "duration_days": invoice.duration_days,
        "amount_ghs": float(invoice.amount_ghs),
        "payment_method": invoice.payment_method,
        "reference_code": invoice.reference_code,
        "advertised_from": invoice.advertised_from.isoformat(),
        "advertised_until": invoice.advertised_until.isoformat(),
        "created_at": invoice.created_at.isoformat()
    }


@reviews_router.get("/recent", response=List[RecentReviewItemSchema], auth=None)
def get_recent_reviews_feed(request, limit: int = 15):
    from apps.reviews.models import ReviewVote
    
    # Try optional user authentication from cookie/header if present
    user = None
    try:
        auth = JWTCookieAuth()
        user = auth.authenticate(request, None)
    except Exception:
        pass

    reviews = SellerReview.objects.filter(is_active=True).select_related(
        'seller', 'transaction', 'transaction__link'
    ).order_by('-created_at')[:limit]

    # Pre-fetch votes for this user if logged in
    user_votes_map = {}
    if user and getattr(user, 'is_authenticated', False):
        review_ids = [r.id for r in reviews]
        votes = ReviewVote.objects.filter(review_id__in=review_ids, user=user)
        user_votes_map = {v.review_id: v.vote_type for v in votes}

    result = []
    for r in reviews:
        seller = r.seller
        item_title = r.transaction.link.title if (r.transaction and r.transaction.link) else "Verified Purchase"
        item_image_url = r.image_url or (r.transaction.link.image_url if (r.transaction and r.transaction.link) else "")
        result.append({
            "id": r.id,
            "buyer_name": r.buyer_name or "Verified Customer",
            "rating_speed": r.rating_speed,
            "rating_communication": r.rating_communication,
            "rating_overall": r.rating_overall,
            "comment": r.comment,
            "seller_reply": r.seller_reply,
            "seller_replied_at": r.seller_replied_at.isoformat() if r.seller_replied_at else None,
            "created_at": r.created_at.isoformat(),
            "item_title": item_title,
            "item_image_url": item_image_url,
            "upvotes_count": r.upvotes_count,
            "downvotes_count": r.downvotes_count,
            "user_voted": user_votes_map.get(r.id),
            "shop": {
                "seller_id": seller.id,
                "seller_username": seller.username or seller.email.split('@')[0],
                "shop_name": seller.shop_name or f"@{seller.username}'s Store",
                "profile_picture_url": seller.profile_picture_url or ""
            }
        })
    return result


@reviews_router.post("/{review_id}/vote", response=dict, auth=JWTCookieAuth())
def vote_on_review(request, review_id: uuid.UUID, data: ReviewVoteSchema):
    from apps.reviews.models import ReviewVote
    from django.db import transaction

    vote_type = data.vote_type.upper().strip()
    if vote_type not in ['UP', 'DOWN']:
        raise HttpError(400, "Invalid vote_type. Must be 'UP' or 'DOWN'.")

    review = get_object_or_404(SellerReview, id=review_id)
    user = request.user

    with transaction.atomic():
        existing_vote = ReviewVote.objects.filter(review=review, user=user).first()
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # User clicked same vote button again -> cancel vote
                existing_vote.delete()
                user_voted = None
                message = "Vote removed."
            else:
                # User switched vote
                existing_vote.vote_type = vote_type
                existing_vote.save(update_fields=['vote_type'])
                user_voted = vote_type
                message = f"Vote updated to {vote_type.capitalize()}."
        else:
            # New vote
            ReviewVote.objects.create(review=review, user=user, vote_type=vote_type)
            user_voted = vote_type
            message = f"Voted {vote_type.capitalize()}!"

        # Recalculate upvotes and downvotes counts
        up_count = ReviewVote.objects.filter(review=review, vote_type='UP').count()
        down_count = ReviewVote.objects.filter(review=review, vote_type='DOWN').count()

        review.upvotes_count = up_count
        review.downvotes_count = down_count
        review.save(update_fields=['upvotes_count', 'downvotes_count'])

    return {
        "message": message,
        "upvotes_count": up_count,
        "downvotes_count": down_count,
        "user_voted": user_voted
    }


