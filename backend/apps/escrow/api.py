from typing import List, Optional
import logging
import secrets
from decimal import Decimal
from django.conf import settings
from django.core.mail import send_mail
from ninja import Router, Schema
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from hendaxis_trust.auth import JWTCookieAuth
from apps.escrow.models import Transaction, TransactionStatus, PlatformSetting
from apps.escrow.payouts import execute_payout_for_transaction
from apps.core.ratelimit import rate_limit
from apps.users.models import User
import uuid
from django.db.models import Q
from datetime import datetime
from django.utils import timezone
from ninja.pagination import paginate, LimitOffsetPagination

logger = logging.getLogger(__name__)

escrow_router = Router(tags=["Escrow Transactions"], auth=JWTCookieAuth())

class ResolveDisputeSchema(Schema):
    resolution: str  # e.g., 'COMPLETED' or 'CANCELLED'

class MessageResponse(Schema):
    message: str

from typing import Optional

class SellerTransactionSchema(Schema):
    id: uuid.UUID
    status: str
    is_archived: bool = False
    total_amount_ghs: float
    platform_fee_ghs: Optional[float] = 0.0
    shipping_fee_ghs: Optional[float] = 0.0
    buyer_name: str
    buyer_phone: str
    buyer_email: str
    shipping_address: str
    title: str
    created_at: str
    paystack_reference: str
    link_id: uuid.UUID
    inspection_starts_at: Optional[str] = None
    delivery_method: Optional[str] = None
    dispatched_at: Optional[str] = None
    delivered_at: Optional[str] = None
    waybill_photo_url: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    buyer_dispute_reason: Optional[str] = None
    buyer_dispute_photos: Optional[list[str]] = []
    seller_dispute_response: Optional[str] = None
    seller_dispute_photos: Optional[list[str]] = []
    manager_dispute_notes: Optional[str] = None
    manager_dispute_photos: Optional[list[str]] = []
    shipping_timeout_days: int = 4
    inspection_hours_allowed: int = 24
    otp_reveal_delay_hours: int = 24

@escrow_router.get("/seller/transactions", response=list[SellerTransactionSchema])
@paginate(LimitOffsetPagination)
def get_seller_transactions(request, search: Optional[str] = None, status: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, include_archived: bool = False):
    """Get paginated, filtered, and searchable transactions for the logged-in seller."""
    from django.db.models import Prefetch
    from apps.delivery.models import DeliveryLog

    txns = Transaction.objects.filter(link__seller=request.user).select_related('link').prefetch_related(
        Prefetch('delivery_logs', queryset=DeliveryLog.objects.order_by('-created_at'))
    ).order_by('-created_at')

    if status == 'ARCHIVED':
        txns = txns.filter(is_archived=True)
    elif not include_archived:
        txns = txns.filter(is_archived=False)
        if status:
            txns = txns.filter(status=status)
    elif status:
        txns = txns.filter(status=status)
    
    if search:
        txns = txns.filter(
            Q(paystack_reference__icontains=search) | 
            Q(buyer_phone__icontains=search) | 
            Q(buyer_email__icontains=search) |
            Q(link__title__icontains=search)
        )
        
    if start_date:
        try:
            date_obj = datetime.strptime(start_date, '%Y-%m-%d')
            txns = txns.filter(created_at__gte=date_obj)
        except ValueError:
            pass
            
    if end_date:
        try:
            # Set to end of day
            date_obj = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            txns = txns.filter(created_at__lte=date_obj)
        except ValueError:
            pass

    cfg = get_platform_settings()
    timeout_days = cfg.get("shipping_timeout_days", 4)
    otp_delay_hrs = cfg.get("otp_reveal_delay_hours", 24)

    items = []
    for t in txns:
        logs = list(t.delivery_logs.all())
        latest_log = logs[0] if logs else None
        items.append({
            "id": t.id,
            "status": t.status,
            "is_archived": getattr(t, 'is_archived', False),
            "total_amount_ghs": float(t.total_amount_ghs),
            "platform_fee_ghs": float(t.platform_fee_ghs or 0.0),
            "shipping_fee_ghs": float(t.link.shipping_fee_ghs or 0.0),
            "buyer_name": t.buyer_name,
            "buyer_phone": t.buyer_phone,
            "buyer_email": t.buyer_email,
            "shipping_address": t.shipping_address,
            "title": t.link.title,
            "created_at": str(t.created_at),
            "paystack_reference": t.paystack_reference,
            "link_id": t.link.id,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "delivery_method": latest_log.delivery_method if latest_log else None,
            "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
            "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
            "waybill_photo_url": latest_log.waybill_photo_url if latest_log else None,
            "courier_name": latest_log.courier_name if latest_log else None,
            "tracking_number": latest_log.tracking_number if latest_log else None,
            "driver_phone": latest_log.driver_phone if latest_log else None,
            "driver_car_number": latest_log.driver_car_number if latest_log else None,
            "destination_station": latest_log.destination_station if latest_log else None,
            "buyer_dispute_reason": t.buyer_dispute_reason,
            "buyer_dispute_photos": t.buyer_dispute_photos or [],
            "seller_dispute_response": t.seller_dispute_response,
            "seller_dispute_photos": t.seller_dispute_photos or [],
            "manager_dispute_notes": t.manager_dispute_notes,
            "manager_dispute_photos": t.manager_dispute_photos or [],
            "otp_reveal_delay_hours": otp_delay_hrs,
            "shipping_timeout_days": timeout_days,
            "inspection_hours_allowed": get_inspection_hours_for_amount(t.total_amount_ghs),
        })
            
    return items



class SellerSummaryMetricsSchema(Schema):
    pending_transactions_count: int
    pending_gross_amount_ghs: float
    pending_net_due_seller_ghs: float
    awaiting_dispatch_count: int
    awaiting_dispatch_net_ghs: float
    in_delivery_count: int
    in_delivery_net_ghs: float
    in_inspection_count: int
    in_inspection_net_ghs: float
    in_dispute_count: int
    in_dispute_net_ghs: float
    completed_transactions_count: int
    completed_total_earned_ghs: float
    dispute_health: Optional[dict] = None


def compute_seller_dispute_health(seller_user) -> dict:
    from apps.escrow.models import Transaction, TransactionStatus
    from apps.links.models import PaymentLink
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Q
    from django.core.mail import send_mail

    # All paid transactions belonging to seller (if reinstated, only evaluate post-reinstatement orders)
    all_paid_txns = Transaction.objects.filter(
        link__seller=seller_user
    ).exclude(
        status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED]
    )

    reinstated_at = getattr(seller_user, 'reinstated_at', None)
    if reinstated_at:
        all_paid_txns = all_paid_txns.filter(created_at__gte=reinstated_at)

    total_paid_lifetime = all_paid_txns.count()

    def get_disputed_count(qs):
        return qs.filter(Q(status=TransactionStatus.DISPUTED) | ~Q(buyer_dispute_reason='')).count()

    def get_expired_dispatch_count(qs):
        return qs.filter(auto_cancelled_non_dispatch=True).count()

    # Dynamic platform configuration for dispute & dispatch governance
    cfg = get_platform_settings()
    min_sample_size = int(cfg.get("dispute_min_sample_size", 5))
    alert_threshold = float(cfg.get("dispute_alert_threshold", 20.0))
    warning_threshold = float(cfg.get("dispute_warning_threshold", 30.0))
    suspension_threshold = float(cfg.get("dispute_suspension_threshold", 40.0))

    dispatch_expiry_warning_threshold = float(cfg.get("dispatch_expiry_warning_threshold", 20.0))
    dispatch_expiry_suspension_threshold = float(cfg.get("dispatch_expiry_suspension_threshold", 35.0))

    # Set 1: Rolling 30-day window
    thirty_days_ago = timezone.now() - timedelta(days=30)
    paid_30d_qs = all_paid_txns.filter(created_at__gte=thirty_days_ago)
    paid_30d_count = paid_30d_qs.count()
    disputed_30d_count = get_disputed_count(paid_30d_qs)
    expired_30d_count = get_expired_dispatch_count(paid_30d_qs)

    # Set 2: Recent 15 paid transactions
    recent_15_ids = list(all_paid_txns.order_by('-created_at')[:15].values_list('id', flat=True))
    paid_15_qs = Transaction.objects.filter(id__in=recent_15_ids)
    paid_15_count = len(recent_15_ids)
    disputed_15_count = get_disputed_count(paid_15_qs)
    expired_15_count = get_expired_dispatch_count(paid_15_qs)

    # Set 3: Lifetime (or post-reinstatement) paid transactions
    disputed_lifetime_count = get_disputed_count(all_paid_txns)
    expired_lifetime_count = get_expired_dispatch_count(all_paid_txns)

    # Calculate dispute rates & dispatch expiry rates for sets where paid_count >= min_sample_size
    applicable_rates = []
    applicable_dispatch_rates = []
    
    if paid_30d_count >= min_sample_size:
        applicable_rates.append({
            'sample_name': '30-Day Window',
            'paid_count': paid_30d_count,
            'disputed_count': disputed_30d_count,
            'rate': round((disputed_30d_count / paid_30d_count) * 100.0, 1)
        })
        applicable_dispatch_rates.append({
            'sample_name': '30-Day Window',
            'paid_count': paid_30d_count,
            'expired_count': expired_30d_count,
            'rate': round((expired_30d_count / paid_30d_count) * 100.0, 1)
        })

    if paid_15_count >= min_sample_size:
        applicable_rates.append({
            'sample_name': 'Last 15 Transactions',
            'paid_count': paid_15_count,
            'disputed_count': disputed_15_count,
            'rate': round((disputed_15_count / paid_15_count) * 100.0, 1)
        })
        applicable_dispatch_rates.append({
            'sample_name': 'Last 15 Transactions',
            'paid_count': paid_15_count,
            'expired_count': expired_15_count,
            'rate': round((expired_15_count / paid_15_count) * 100.0, 1)
        })

    if total_paid_lifetime >= min_sample_size:
        applicable_rates.append({
            'sample_name': 'Lifetime' if not reinstated_at else 'Post-Reinstatement',
            'paid_count': total_paid_lifetime,
            'disputed_count': disputed_lifetime_count,
            'rate': round((disputed_lifetime_count / total_paid_lifetime) * 100.0, 1)
        })
        applicable_dispatch_rates.append({
            'sample_name': 'Lifetime' if not reinstated_at else 'Post-Reinstatement',
            'paid_count': total_paid_lifetime,
            'expired_count': expired_lifetime_count,
            'rate': round((expired_lifetime_count / total_paid_lifetime) * 100.0, 1)
        })

    # Pick the highest dispute rate among sets with >= min_sample_size paid transactions
    max_rate = 0.0
    highest_sample = None
    if applicable_rates:
        highest_sample = max(applicable_rates, key=lambda x: x['rate'])
        max_rate = highest_sample['rate']

    # Pick highest dispatch expiry rate
    max_dispatch_rate = 0.0
    highest_dispatch_sample = None
    if applicable_dispatch_rates:
        highest_dispatch_sample = max(applicable_dispatch_rates, key=lambda x: x['rate'])
        max_dispatch_rate = highest_dispatch_sample['rate']

    dispute_level = "NORMAL"
    is_suspended_now = False

    # ─── Rating-Based Governance Aggregation ─────────────────────────────────
    from apps.reviews.models import SellerReview
    from django.db.models import Avg

    rating_warning_threshold = float(cfg.get("seller_rating_warning_threshold", 3.0))
    rating_suspension_threshold = float(cfg.get("seller_rating_suspension_threshold", 2.0))

    active_reviews_qs = SellerReview.objects.filter(seller=seller_user, is_active=True)
    if reinstated_at:
        active_reviews_qs = active_reviews_qs.filter(created_at__gte=reinstated_at)

    total_reviews_count = active_reviews_qs.count()
    avg_rating = None
    if total_reviews_count >= 3:
        agg = active_reviews_qs.aggregate(avg=Avg('rating_overall'))
        avg_rating = round(float(agg['avg']), 2) if agg['avg'] is not None else None

    # ─── 1. Hard Suspension Checks (Independent Rails) ───────────────────────
    if seller_user.is_suspended:
        dispute_level = "SUSPENDED"
        is_suspended_now = True
    else:
        # A. Dispute Rate Auto-Suspension Check
        if highest_sample and max_rate >= suspension_threshold:
            dispute_level = "SUSPENDED"
            seller_user.is_suspended = True
            seller_user.suspension_reason = f"Automated Suspension: Dispute rate reached {max_rate}% (≥{suspension_threshold}%) in {highest_sample['sample_name']} sample set ({highest_sample['disputed_count']} of {highest_sample['paid_count']} transactions disputed)."
            seller_user.suspended_at = timezone.now()
            seller_user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at'])
            PaymentLink.objects.filter(seller=seller_user, is_active=True).update(is_active=False)
            is_suspended_now = True

            try:
                send_mail(
                    subject="ALERT: Your HendAxis Trust Seller Account Has Been Suspended",
                    message=f"Hi {seller_user.username},\n\nYour seller account has been suspended because your dispute rate reached {max_rate}% ({highest_sample['disputed_count']} of {highest_sample['paid_count']} paid transactions) in {highest_sample['sample_name']}.\n\nYour payment links have been disabled and you are currently blocked from creating new payment links.\n\nPlease log in to your dashboard to submit an appeal for manual review by our administration team.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending suspension email: {mail_err}")

        # B. Dispatch Expiry Rate Auto-Suspension Check
        elif highest_dispatch_sample and max_dispatch_rate >= dispatch_expiry_suspension_threshold:
            dispute_level = "SUSPENDED"
            seller_user.is_suspended = True
            seller_user.suspension_reason = f"Automated Suspension: Dispatch expiry rate reached {max_dispatch_rate}% (≥{dispatch_expiry_suspension_threshold}%) with {highest_dispatch_sample['expired_count']} of {highest_dispatch_sample['paid_count']} paid orders unfulfilled in {highest_dispatch_sample['sample_name']}."
            seller_user.suspended_at = timezone.now()
            seller_user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at'])
            PaymentLink.objects.filter(seller=seller_user, is_active=True).update(is_active=False)
            is_suspended_now = True

            try:
                send_mail(
                    subject="ALERT: Your HendAxis Trust Seller Account Has Been Suspended (Dispatch Defaults)",
                    message=f"Hi {seller_user.username},\n\nYour seller account has been suspended because your dispatch expiry rate reached {max_dispatch_rate}% ({highest_dispatch_sample['expired_count']} of {highest_dispatch_sample['paid_count']} paid orders expired undispatched) in {highest_dispatch_sample['sample_name']}.\n\nYour active payment links have been deactivated.\n\nPlease log in to your dashboard to submit an appeal for manual review by our administration team.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending dispatch suspension email: {mail_err}")

        # C. Rating Auto-Suspension Check
        elif avg_rating is not None and total_reviews_count >= 3 and avg_rating < rating_suspension_threshold:
            dispute_level = "SUSPENDED"
            suspension_msg = f"Automated Suspension: Aggregated seller rating fell to {avg_rating:.1f} ★ (below suspension threshold of {rating_suspension_threshold} ★ across {total_reviews_count} reviews)."
            seller_user.is_suspended = True
            seller_user.suspension_reason = suspension_msg
            seller_user.suspended_at = timezone.now()
            seller_user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at'])
            PaymentLink.objects.filter(seller=seller_user, is_active=True).update(is_active=False)
            is_suspended_now = True

            try:
                send_mail(
                    subject="ALERT: Your HendAxis Trust Seller Account Has Been Suspended",
                    message=(
                        f"Hi {seller_user.username},\n\n"
                        f"Your seller account has been automatically suspended because your aggregated "
                        f"seller rating fell to {avg_rating:.1f} stars — below our minimum threshold of "
                        f"{rating_suspension_threshold} stars across {total_reviews_count} reviews.\n\n"
                        f"Your payment links have been deactivated. Please log in to your dashboard to "
                        f"submit an appeal for manual review by our administration team."
                    ),
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending rating suspension email: {mail_err}")

    # ─── 2. Hybrid Model: Compound Risk & Compliance Review Flagging ─────────
    is_flagged_for_compliance_review = False
    compliance_review_reasons = []
    rating_warning = False

    if not is_suspended_now and not seller_user.is_suspended:
        dispute_in_warning = bool(highest_sample and max_rate >= warning_threshold)
        dispatch_in_warning = bool(highest_dispatch_sample and max_dispatch_rate >= dispatch_expiry_warning_threshold)
        rating_in_warning = bool(avg_rating is not None and total_reviews_count >= 3 and avg_rating < rating_warning_threshold)
        rating_warning = rating_in_warning

        if dispute_in_warning and highest_sample:
            compliance_review_reasons.append(
                f"Elevated Dispute Rate: {max_rate}% (≥{warning_threshold}%) in {highest_sample['sample_name']}"
            )
        if dispatch_in_warning and highest_dispatch_sample:
            compliance_review_reasons.append(
                f"High Dispatch Expiry Rate: {max_dispatch_rate}% (≥{dispatch_expiry_warning_threshold}%) in {highest_dispatch_sample['sample_name']}"
            )
        if rating_in_warning and avg_rating is not None:
            compliance_review_reasons.append(
                f"Low Seller Rating: {avg_rating:.1f} ★ (<{rating_warning_threshold} ★ across {total_reviews_count} reviews)"
            )

        # Multiple concurrent warnings trigger Compound Risk (Compliance Review)
        if len(compliance_review_reasons) >= 2:
            dispute_level = "COMPLIANCE_REVIEW"
            is_flagged_for_compliance_review = True
            try:
                send_mail(
                    subject="NOTICE: Your HendAxis Trust Account is Flagged for Compliance Review",
                    message=(
                        f"Hi {seller_user.username},\n\n"
                        f"Your seller account has been flagged for proactive compliance review because multiple "
                        f"risk indicators have reached warning levels simultaneously:\n"
                        + "\n".join([f"- {r}" for r in compliance_review_reasons]) + "\n\n"
                        f"To protect your account standing, please ensure you only create payment links for items "
                        f"physically in stock and ready to ship, dispatch all pending orders promptly, and resolve "
                        f"any customer issues immediately."
                    ),
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending compliance review email: {mail_err}")

        # Single Warning Conditions
        elif dispute_in_warning and highest_sample:
            dispute_level = "WARNING"
            try:
                send_mail(
                    subject="WARNING: Elevated Dispute Rate on Your HendAxis Trust Account",
                    message=f"Hi {seller_user.username},\n\nYour dispute rate has reached {max_rate}% ({highest_sample['disputed_count']} of {highest_sample['paid_count']} paid transactions) in {highest_sample['sample_name']}.\n\nPlease ensure high product quality and prompt customer support. Reaching {suspension_threshold}% will cause automatic account suspension.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending warning email: {mail_err}")

        elif dispatch_in_warning and highest_dispatch_sample:
            dispute_level = "DISPATCH_WARNING"
            try:
                send_mail(
                    subject="WARNING: High Dispatch Expiry Rate on Your HendAxis Trust Account",
                    message=f"Hi {seller_user.username},\n\nYour dispatch expiry rate has reached {max_dispatch_rate}% ({highest_dispatch_sample['expired_count']} of {highest_dispatch_sample['paid_count']} paid orders unfulfilled) in {highest_dispatch_sample['sample_name']}.\n\nPlease ensure you dispatch all orders within the shipping timeout window. Reaching {dispatch_expiry_suspension_threshold}% will cause automatic account suspension.",
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxis.com'),
                    recipient_list=[seller_user.email] if seller_user.email else [],
                    fail_silently=True
                )
            except Exception as mail_err:
                print(f"Error sending dispatch warning email: {mail_err}")

        elif rating_in_warning:
            dispute_level = "RATING_WARNING"

        elif highest_sample and max_rate >= alert_threshold:
            dispute_level = "ALERT"

    return {
        "total_paid_transactions": total_paid_lifetime,
        "disputed_transactions_count": disputed_lifetime_count,
        "dispute_rate_pct": max_rate,
        "dispute_level": dispute_level,
        "is_suspended": seller_user.is_suspended,
        "suspension_reason": seller_user.suspension_reason or "",
        "sample_evaluated": highest_sample['sample_name'] if highest_sample else f"Insufficient volume (<{min_sample_size} txns)",
        "sample_paid_count": highest_sample['paid_count'] if highest_sample else total_paid_lifetime,
        "sample_disputed_count": highest_sample['disputed_count'] if highest_sample else disputed_lifetime_count,
        # Dispute rate thresholds
        "dispute_alert_threshold": alert_threshold,
        "dispute_warning_threshold": warning_threshold,
        "dispute_suspension_threshold": suspension_threshold,
        "dispute_min_sample_size": min_sample_size,
        # Dispatch Expiry Governance Metrics
        "dispatch_expiry_rate_pct": max_dispatch_rate,
        "total_expired_dispatches": expired_lifetime_count,
        "dispatch_expiry_warning_threshold": dispatch_expiry_warning_threshold,
        "dispatch_expiry_suspension_threshold": dispatch_expiry_suspension_threshold,
        "reinstated_at": seller_user.reinstated_at.isoformat() if getattr(seller_user, 'reinstated_at', None) else None,
        # Rating metrics
        "avg_rating": avg_rating,
        "total_reviews_count": total_reviews_count,
        "rating_warning": rating_warning,
        "rating_warning_threshold": rating_warning_threshold,
        "rating_suspension_threshold": rating_suspension_threshold,
        # Hybrid Suspension Model: Compound Risk
        "is_flagged_for_compliance_review": is_flagged_for_compliance_review,
        "compliance_review_reasons": compliance_review_reasons,
        "compound_warning_count": len(compliance_review_reasons),
    }




@escrow_router.get("/seller/summary-metrics", response=SellerSummaryMetricsSchema)
def get_seller_summary_metrics(request):
    """
    Returns summary metrics for the logged-in seller, including pending transactions 
    (all statuses except COMPLETED/CANCELLED/REFUNDED) and total amounts due to the seller.
    """
    seller_txns = Transaction.objects.filter(link__seller=request.user)

    pending_txns = seller_txns.filter(is_archived=False).exclude(
        status__in=[
            TransactionStatus.AWAITING_PAYMENT,
            TransactionStatus.COMPLETED,
            TransactionStatus.CANCELLED,
            TransactionStatus.REFUNDED,
        ]
    )

    pending_count = pending_txns.count()
    
    pending_gross = 0.0
    pending_net = 0.0

    awaiting_dispatch_count = 0
    awaiting_dispatch_net = 0.0

    in_delivery_count = 0
    in_delivery_net = 0.0

    in_inspection_count = 0
    in_inspection_net = 0.0

    in_dispute_count = 0
    in_dispute_net = 0.0

    for t in pending_txns:
        gross = float(t.total_amount_ghs)
        fee = float(t.platform_fee_ghs or 0.0)
        net = gross - fee

        pending_gross += gross
        pending_net += net

        if t.status == TransactionStatus.PAYMENT_RECEIVED:
            awaiting_dispatch_count += 1
            awaiting_dispatch_net += net
        elif t.status == TransactionStatus.DELIVERY_IN_PROGRESS:
            in_delivery_count += 1
            in_delivery_net += net
        elif t.status == TransactionStatus.INSPECTION_PERIOD:
            in_inspection_count += 1
            in_inspection_net += net
        elif t.status == TransactionStatus.DISPUTED:
            in_dispute_count += 1
            in_dispute_net += net

    completed_txns = seller_txns.filter(status=TransactionStatus.COMPLETED)
    completed_count = completed_txns.count()
    completed_earned = 0.0
    for t in completed_txns:
        completed_earned += (float(t.total_amount_ghs) - float(t.platform_fee_ghs or 0.0))

    return {
        "pending_transactions_count": pending_count,
        "pending_gross_amount_ghs": round(pending_gross, 2),
        "pending_net_due_seller_ghs": round(pending_net, 2),
        "awaiting_dispatch_count": awaiting_dispatch_count,
        "awaiting_dispatch_net_ghs": round(awaiting_dispatch_net, 2),
        "in_delivery_count": in_delivery_count,
        "in_delivery_net_ghs": round(in_delivery_net, 2),
        "in_inspection_count": in_inspection_count,
        "in_inspection_net_ghs": round(in_inspection_net, 2),
        "in_dispute_count": in_dispute_count,
        "in_dispute_net_ghs": round(in_dispute_net, 2),
        "completed_transactions_count": completed_count,
        "completed_total_earned_ghs": round(completed_earned, 2),
        "dispute_health": compute_seller_dispute_health(request.user)
    }


class SellerDispatchSchema(Schema):
    delivery_method: str  # 'COURIER_API' or 'INFORMAL_BUS'
    # Path A fields
    courier_name: Optional[str] = None
    carrier_code: Optional[str] = 'OTHERS'
    tracking_number: Optional[str] = None
    # Path B fields
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    # Optional package/waybill photo
    waybill_photo_url: Optional[str] = None


@escrow_router.post("/seller/transactions/{transaction_id}/dispatch", response=MessageResponse)
def seller_dispatch(request, transaction_id: uuid.UUID, data: SellerDispatchSchema):
    """Dispatch a transaction via courier (Path A) or informal bus (Path B)."""
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.PAYMENT_RECEIVED:
        raise HttpError(400, "Only transactions in 'Awaiting Shipping' state can be dispatched.")

    from apps.delivery.services import transition_to_delivery, generate_delivery_otp
    from apps.delivery.models import DeliveryLog, DeliveryMethod
    from apps.delivery.tracking import generate_carrier_tracking_url

    settings_cfg = get_platform_settings()
    enabled_methods = settings_cfg.get('enabled_delivery_methods', ['COURIER_API', 'INFORMAL_BUS'])
    enabled_carriers = settings_cfg.get('enabled_carriers', ['DHL', 'FEDEX', 'UPS', 'EMS', 'SPEEDAF', 'OTHERS'])

    if data.delivery_method not in enabled_methods:
        raise HttpError(400, f"Delivery method '{data.delivery_method}' is currently disabled by system management.")

    waybill_photo = data.waybill_photo_url or ""
    if waybill_photo and waybill_photo.startswith('data:image'):
        opt = process_and_optimize_dispute_photos([waybill_photo])
        if opt:
            waybill_photo = opt[0]

    if data.delivery_method == 'COURIER_API':
        if not data.courier_name or not data.tracking_number:
            raise HttpError(400, "courier_name and tracking_number are required for courier dispatch.")
        
        carrier_code = (data.carrier_code or 'OTHERS').upper()
        if carrier_code not in enabled_carriers:
            raise HttpError(400, f"Courier carrier '{carrier_code}' is currently disabled by system management.")

        tracking_url = generate_carrier_tracking_url(
            carrier_code=carrier_code,
            tracking_number=data.tracking_number,
            courier_name=data.courier_name
        )

        transition_to_delivery(transaction)
        DeliveryLog.objects.create(
            transaction=transaction,
            delivery_method=DeliveryMethod.COURIER_API,
            courier_name=data.courier_name,
            carrier_code=carrier_code,
            tracking_number=data.tracking_number,
            carrier_tracking_url=tracking_url,
            waybill_photo_url=waybill_photo,
        )
        from apps.core.tasks import dispatch_sms_task, dispatch_email_task
        courier_msg = (
            f"Your HendAxis Trust order ({transaction.paystack_reference}) has been shipped via {data.courier_name}! "
            f"Tracking Number: {data.tracking_number}. "
            f"Track Package: {tracking_url}"
        )
        dispatch_sms_task.delay(transaction.buyer_phone, courier_msg)
        if transaction.buyer_email:
            dispatch_email_task.delay(transaction.buyer_email, "Order Shipped via Courier", courier_msg)

        return {"message": "Courier dispatched. Tracking URL generated and transaction state updated to DELIVERY_IN_PROGRESS."}

    elif data.delivery_method == 'INFORMAL_BUS':
        if not data.driver_phone or not data.destination_station:
            raise HttpError(400, "driver_phone and destination_station are required for informal delivery.")
        transition_to_delivery(transaction)
        DeliveryLog.objects.create(
            transaction=transaction,
            delivery_method=DeliveryMethod.INFORMAL_BUS,
            driver_phone=data.driver_phone,
            driver_car_number=data.driver_car_number,
            destination_station=data.destination_station,
            waybill_photo_url=waybill_photo,
        )
        generate_delivery_otp(str(transaction.id))
        return {"message": "Dispatched via informal bus. Buyer has been sent driver info and Secret OTP via SMS."}

    else:
        raise HttpError(400, "Invalid delivery_method. Use 'COURIER_API' or 'INFORMAL_BUS'.")


class SellerVerifyOtpSchema(Schema):
    otp_code: str
    buyer_id_photo_url: Optional[str] = None

@escrow_router.post("/seller/transactions/{transaction_id}/verify-delivery", response=MessageResponse)
def seller_verify_delivery_otp(request, transaction_id: uuid.UUID, data: SellerVerifyOtpSchema):
    """Seller submits the OTP shown by the buyer at pickup to confirm delivery (Path B)."""
    from apps.delivery.services import verify_delivery_otp, transition_to_inspection
    from apps.delivery.models import DeliveryLog
    
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "This transaction is not currently in delivery.")

    # Anti-fraud check: Ensure OTP delay period has elapsed since dispatch
    cfg = get_platform_settings()
    delay_hours = int(cfg.get("otp_reveal_delay_hours", 24))
    if delay_hours > 0 and transaction.dispatched_at:
        now = timezone.now()
        hours_passed = (now - transaction.dispatched_at).total_seconds() / 3600.0
        if hours_passed < delay_hours:
            rem_sec = (delay_hours - hours_passed) * 3600.0
            rem_h = int(rem_sec // 3600)
            rem_m = int((rem_sec % 3600) // 60)
            raise HttpError(400, f"Delivery OTP verification is locked for {delay_hours} hours after dispatch to protect buyers from premature OTP pressure. Time remaining: {rem_h}h {rem_m}m.")

    otp_code = data.otp_code
    if not verify_delivery_otp(str(transaction.id), otp_code):
        raise HttpError(400, "Invalid or expired delivery OTP.")

    # Update ID photo if provided
    buyer_id_photo_url = data.buyer_id_photo_url
    if buyer_id_photo_url:
        latest_log = transaction.delivery_logs.order_by('-created_at').first()
        if latest_log:
            latest_log.buyer_id_photo_url = buyer_id_photo_url
            latest_log.save(update_fields=['buyer_id_photo_url'])

    transition_to_inspection(transaction)

    from apps.core.tasks import dispatch_sms_task, dispatch_email_task, notify_seller_delivery_confirmed_task
    hours = get_inspection_hours_for_amount(transaction.total_amount_ghs)
    msg = (
        f"Your HendAxis Trust order ({transaction.paystack_reference}) has been delivered! "
        f"Your {hours}-hour inspection period has started. "
        f"Inspect your item and raise a dispute before the timer expires if there is a problem."
    )
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Inspection Period Started", msg)

    notify_seller_delivery_confirmed_task.delay(transaction.id)

    return {"message": "OTP verified. Delivery confirmed. Inspection period has started."}


@escrow_router.post("/seller/transactions/{transaction_id}/resend-otp", response=MessageResponse)
def seller_resend_otp(request, transaction_id: uuid.UUID):
    """Resend the delivery OTP to the buyer (Path B only)."""
    from apps.delivery.services import resend_delivery_otp
    from apps.delivery.models import DeliveryLog, DeliveryMethod
    transaction = get_object_or_404(
        Transaction.objects.select_related('link'),
        id=transaction_id,
        link__seller=request.user
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "OTP resend only applicable when delivery is in progress.")
    has_informal = DeliveryLog.objects.filter(
        transaction=transaction, delivery_method=DeliveryMethod.INFORMAL_BUS
    ).exists()
    if not has_informal:
        raise HttpError(400, "No informal bus delivery found for this transaction.")
    resend_delivery_otp(str(transaction.id))
    return {"message": "OTP resent to buyer's phone and email."}


class ForceCourierDeliveredResponse(Schema):
    """
    Returned by force-delivered endpoint.
    - completed=True means inspection started immediately (API confirmed delivery).
    - requires_reason=True means the API did NOT confirm delivery and the seller
      must resubmit with a `seller_reason` to override.
    """
    completed: bool = False
    requires_reason: bool = False
    courier_status: Optional[str] = None
    message: str = ""


def _check_courier_api_status(delivery_log) -> str:
    """
    Stub: Call the courier's API to get the latest parcel status.
    Returns a normalised status string. Replace with real integration per courier.
    """
    # TODO: Route to real courier API by `delivery_log.courier_name`.
    # For now we always return 'UNKNOWN' so the seller must provide a reason.
    return "UNKNOWN"


class ForceCourierDeliveredSchema(Schema):
    seller_reason: Optional[str] = None

@escrow_router.post(
    "/seller/transactions/{transaction_id}/force-delivered",
    response=ForceCourierDeliveredResponse,
)
def seller_force_courier_delivered(request, transaction_id: uuid.UUID, data: ForceCourierDeliveredSchema):
    """
    Path A — Force delivery confirmation for courier transactions stuck after 36 h.

    Step 1: Client posts {} (no reason). We check the courier API.
      - If courier API says DELIVERED → start inspection, return {completed: true}.
      - Otherwise → return {requires_reason: true, courier_status: '...'}.

    Step 2: Client re-posts with {seller_reason: '...'} → we log it and start inspection.
    """
    from apps.delivery.services import transition_to_inspection
    from apps.delivery.models import DeliveryLog, DeliveryMethod

    transaction = get_object_or_404(
        Transaction.objects.select_related("link").prefetch_related("delivery_logs"),
        id=transaction_id,
        link__seller=request.user,
    )
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "This transaction is not currently in delivery.")

    latest_log = transaction.delivery_logs.order_by("-created_at").first()
    if not latest_log or latest_log.delivery_method != DeliveryMethod.COURIER_API:
        raise HttpError(400, "No courier delivery found for this transaction.")

    seller_reason = data.seller_reason

    if not seller_reason:
        # Step 1: Try to fetch real status from the courier API
        courier_status = _check_courier_api_status(latest_log)

        if courier_status == "DELIVERED":
            # Auto-confirm — API agrees
            transition_to_inspection(transaction)
            _notify_buyer_inspection_started(transaction)
            return ForceCourierDeliveredResponse(
                completed=True,
                message="Courier API confirmed delivery. Inspection period started."
            )
        else:
            # API not yet showing delivered — ask seller for reason
            return ForceCourierDeliveredResponse(
                requires_reason=True,
                courier_status=courier_status,
                message=(
                    f"The courier API shows status '{courier_status}'. "
                    "Please provide a reason to override and mark as delivered."
                ),
            )

    # Step 2: Seller provided a reason — log it and proceed
    latest_log.waybill_photo_url = latest_log.waybill_photo_url or ""  # keep existing
    # Store reason in a notes field (we reuse buyer_id_photo_url as a note stub for now;
    # a dedicated `seller_override_reason` field can be added in a future migration)
    latest_log.buyer_id_photo_url = f"[OVERRIDE REASON]: {seller_reason}"
    latest_log.save(update_fields=["buyer_id_photo_url"])

    transition_to_inspection(transaction)
    _notify_buyer_inspection_started(transaction)

    return ForceCourierDeliveredResponse(
        completed=True,
        message="Delivery confirmed with seller override. Inspection period started.",
    )


def _notify_buyer_inspection_started(transaction: Transaction):
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    hours = get_inspection_hours_for_amount(transaction.total_amount_ghs)
    msg = (
        f"Your HendAxis Trust order ({transaction.paystack_reference}) has been marked as Delivered. "
        f"Your {hours}-hour inspection period has started. "
        f"Raise a dispute before the timer expires if there is a problem."
    )
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Inspection Period Started", msg)


@escrow_router.post("/seller/transactions/{transaction_id}/cancel", response=MessageResponse)
def seller_cancel(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id, link__seller=request.user)
    if transaction.status != TransactionStatus.PAYMENT_RECEIVED:
        raise HttpError(400, "Only transactions in 'Awaiting Shipping' state can be cancelled.")
    
    from apps.ledger.services import execute_full_refund
    execute_full_refund(
        reference_id=str(transaction.id), 
        seller_user_id=request.user.id, 
        gross_amount=transaction.total_amount_ghs, 
        platform_fee=transaction.platform_fee_ghs
    )
    transaction.status = TransactionStatus.CANCELLED
    transaction.save(update_fields=['status', 'updated_at'])
    
    # Trigger refund payout (deducts 1.95% Paystack fee)
    from apps.wallet.services import execute_refund_payout
    execute_refund_payout(
        buyer_phone=transaction.buyer_phone,
        buyer_email=transaction.buyer_email,
        refund_amount=transaction.total_amount_ghs,
        reference_id=str(transaction.id)
    )
    
    # Notifications
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    msg = f"Your order ({transaction.paystack_reference}) for {transaction.link.title} was cancelled by the seller. A full refund has been issued."
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Order Cancelled & Refunded", msg)
        
    return {"message": "Transaction cancelled. Buyer refunded and platform fee charged to your account."}


@escrow_router.post("/seller/transactions/{transaction_id}/verify-payment", response=dict)
def verify_seller_transaction_payment(request, transaction_id: uuid.UUID):
    """Seller endpoint to manually check payment gateway status for an AWAITING_PAYMENT transaction."""
    tx = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), id=transaction_id)
    if tx.link.seller != request.user and not (request.user.is_staff or request.user.is_superuser):
        raise HttpError(403, "You do not have permission to verify this transaction.")

    if tx.status != TransactionStatus.AWAITING_PAYMENT:
        return {
            "verified": True,
            "status": tx.status,
            "is_archived": tx.is_archived,
            "message": f"Transaction status is currently '{tx.get_status_display()}'."
        }

    from apps.escrow.services import verify_payment_gateway_status
    res = verify_payment_gateway_status(tx)
    tx.refresh_from_db()
    res["is_archived"] = tx.is_archived
    return res


@escrow_router.post("/seller/transactions/{transaction_id}/archive", response=dict)
def archive_seller_transaction(request, transaction_id: uuid.UUID):
    """Seller endpoint to manually archive a transaction."""
    tx = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), id=transaction_id)
    if tx.link.seller != request.user and not (request.user.is_staff or request.user.is_superuser):
        raise HttpError(403, "You do not have permission to modify this transaction.")

    tx.is_archived = True
    tx.save(update_fields=['is_archived', 'updated_at'])
    return {"message": "Transaction archived successfully.", "is_archived": True}


@escrow_router.post("/seller/transactions/{transaction_id}/unarchive", response=dict)
def unarchive_seller_transaction(request, transaction_id: uuid.UUID):
    """Seller endpoint to manually unarchive a transaction."""
    tx = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), id=transaction_id)
    if tx.link.seller != request.user and not (request.user.is_staff or request.user.is_superuser):
        raise HttpError(403, "You do not have permission to modify this transaction.")

    tx.is_archived = False
    tx.save(update_fields=['is_archived', 'updated_at'])
    return {"message": "Transaction unarchived successfully.", "is_archived": False}


@escrow_router.post("/{transaction_id}/dispute", response=MessageResponse, auth=JWTCookieAuth())
def open_dispute(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id)

    # Only the buyer's seller or an admin may use this endpoint.
    # Buyers use the unauthenticated raise-dispute endpoint instead.
    from apps.core.permissions import is_admin_user
    is_seller_owner = (
        hasattr(transaction, 'link') and
        transaction.link is not None and
        transaction.link.seller == request.user
    )
    is_admin = (
        request.user.is_staff or
        request.user.is_superuser or
        getattr(request.user, 'role', '') in ('ADMIN', 'SUPPORT_AGENT')
    )
    if not (is_seller_owner or is_admin):
        raise HttpError(403, "You are not authorized to dispute this transaction.")

    if transaction.status not in [TransactionStatus.INSPECTION_PERIOD, TransactionStatus.DELIVERY_IN_PROGRESS]:
        raise HttpError(400, f"Cannot dispute transaction in {transaction.status} state.")
        
    if transaction.status == TransactionStatus.INSPECTION_PERIOD and transaction.inspection_starts_at:
        from django.utils import timezone
        from datetime import timedelta
        
        amount = transaction.total_amount_ghs
        if amount < 2000:
            duration = timedelta(hours=24)
        elif amount < 10000:
            duration = timedelta(hours=48)
        else:
            duration = timedelta(hours=72)
            
        if (transaction.inspection_starts_at + duration) <= timezone.now():
            raise HttpError(400, "The inspection period has expired. You can no longer dispute this transaction.")

    transaction.status = TransactionStatus.DISPUTED
    transaction.save(update_fields=['status', 'updated_at'])

    return {"message": "Transaction has been disputed. Auto-payouts are paused."}

class ConfirmReceiptSchema(Schema):
    confirmation_code: str

@escrow_router.post("/{transaction_id}/send-confirmation-code", response=MessageResponse, auth=None)
@rate_limit('send_confirmation_code', max_calls=5, window_seconds=300)
def send_confirmation_code(request, transaction_id: uuid.UUID):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.status not in [TransactionStatus.INSPECTION_PERIOD, TransactionStatus.DELIVERY_IN_PROGRESS]:
        raise HttpError(400, "Cannot send confirmation code for this transaction state.")

    import time
    from django.core.cache import cache
    now_ts = int(time.time())
    sent_key = f"delivery_conf_sent_at_{transaction.id}"
    last_sent_ts = cache.get(sent_key)
    COOLDOWN_SECONDS = 60

    if last_sent_ts and (now_ts - last_sent_ts) < COOLDOWN_SECONDS and transaction.delivery_confirmation_code:
        remaining = COOLDOWN_SECONDS - (now_ts - last_sent_ts)
        return {
            "message": f"Confirmation code already sent recently. Please check your phone/email. (Resend available in {remaining}s)."
        }

    # Generate fresh code if outside cooldown or no code set
    code = str(secrets.randbelow(900000) + 100000)
    transaction.delivery_confirmation_code = code
    transaction.save(update_fields=['delivery_confirmation_code'])
    cache.set(sent_key, now_ts, timeout=300)
    
    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*50)
        print(f"DEV CONFIRMATION CODE FOR {transaction.buyer_phone}: {code}")
        print("="*50 + "\n")

    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    msg = f"Your HendAxis Trust order ({transaction.paystack_reference}) delivery confirmation code is: {code}"
    dispatch_sms_task.delay(transaction.buyer_phone, msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Delivery Confirmation Code", msg)
        
    return {"message": "Confirmation code sent to your phone and email."}

@escrow_router.post("/{transaction_id}/confirm-receipt", response=MessageResponse, auth=None)
def confirm_receipt(request, transaction_id: uuid.UUID, data: ConfirmReceiptSchema):
    """Buyer confirms they received the item - triggers payout to seller."""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, f"Cannot confirm receipt in {transaction.status} state. Only applicable when in transit.")
        
    from apps.delivery.services import verify_delivery_otp
    is_valid_code = (transaction.delivery_confirmation_code and transaction.delivery_confirmation_code == data.confirmation_code)
    is_valid_otp = verify_delivery_otp(str(transaction.id), data.confirmation_code)
    
    if not (is_valid_code or is_valid_otp):
        raise HttpError(400, "Invalid confirmation code or delivery OTP.")
        
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    from django.utils import timezone
    transaction.inspection_starts_at = timezone.now()
    transaction.save(update_fields=['status', 'inspection_starts_at', 'updated_at'])

    _notify_buyer_inspection_started(transaction)
    from apps.core.tasks import notify_seller_delivery_confirmed_task
    notify_seller_delivery_confirmed_task.delay(transaction.id)
    return {"message": "Receipt confirmed. Inspection period started."}
    
def process_and_optimize_dispute_photos(photos: list[str], max_dim: int = 1200, quality: int = 75) -> list[str]:
    """
    Converts list of base64 image strings to optimized WebP format (data:image/webp;base64,...),
    resizing to max_dim pixels if necessary. Reduces storage cost and network payload size.
    """
    import io
    import base64
    from PIL import Image

    if not photos:
        return []

    optimized_photos = []
    for raw_photo in photos:
        if not isinstance(raw_photo, str) or not raw_photo.strip():
            continue
        if not raw_photo.startswith('data:image'):
            optimized_photos.append(raw_photo)
            continue
        try:
            header, encoded = raw_photo.split(',', 1) if ',' in raw_photo else ('data:image/jpeg;base64', raw_photo)
            img_data = base64.b64decode(encoded)
            img = Image.open(io.BytesIO(img_data))

            w, h = img.size
            if w > max_dim or h > max_dim:
                if w > h:
                    new_h = max(1, int(h * (max_dim / w)))
                    new_w = max_dim
                else:
                    new_w = max(1, int(w * (max_dim / h)))
                    new_h = max_dim
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')

            buf = io.BytesIO()
            img.save(buf, format='WEBP', quality=quality, method=4)
            b64_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            optimized_photos.append(f"data:image/webp;base64,{b64_str}")
        except Exception as e:
            print(f"Error optimizing photo to WebP: {e}")
            optimized_photos.append(raw_photo)

    return optimized_photos


def compress_dispute_images_total_1mb(transaction):
    """
    Compresses all dispute evidence photos (buyer, seller, and manager photos)
    on the transaction after dispute resolution so that their combined total 
    Base64 size is 1MB (1,048,576 bytes) or less.
    """
    import io
    import base64
    from PIL import Image

    buyer_photos = list(transaction.buyer_dispute_photos or [])
    seller_photos = list(transaction.seller_dispute_photos or [])
    manager_photos = list(transaction.manager_dispute_photos or [])

    all_lists = [buyer_photos, seller_photos, manager_photos]
    
    items = []
    for l_idx, photo_list in enumerate(all_lists):
        for p_idx, photo in enumerate(photo_list):
            if isinstance(photo, str) and photo.startswith('data:image'):
                items.append((l_idx, p_idx, photo))

    if not items:
        return

    MAX_TOTAL_BYTES = 1048576  # 1MB in Base64 characters

    def total_size(lists):
        return sum(len(p) for l in lists for p in l if isinstance(p, str))

    if total_size(all_lists) <= MAX_TOTAL_BYTES:
        return

    settings = [
        (800, 60),
        (600, 50),
        (400, 40),
        (300, 30),
        (200, 20)
    ]

    new_lists = [list(buyer_photos), list(seller_photos), list(manager_photos)]

    for max_dim, quality in settings:
        new_lists = [list(buyer_photos), list(seller_photos), list(manager_photos)]
        for l_idx, p_idx, raw_b64 in items:
            try:
                header, encoded = raw_b64.split(',', 1) if ',' in raw_b64 else ('data:image/jpeg;base64', raw_b64)
                img_data = base64.b64decode(encoded)
                img = Image.open(io.BytesIO(img_data))
                if img.mode in ('RGBA', 'P', 'LA'):
                    img = img.convert('RGB')

                w, h = img.size
                if w > max_dim or h > max_dim:
                    if w > h:
                        new_h = max(1, int(h * (max_dim / w)))
                        new_w = max_dim
                    else:
                        new_w = max(1, int(w * (max_dim / h)))
                        new_h = max_dim
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=quality, optimize=True)
                new_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
                new_lists[l_idx][p_idx] = new_b64
            except Exception as e:
                print(f"Error compressing dispute image: {e}")

        if total_size(new_lists) <= MAX_TOTAL_BYTES:
            transaction.buyer_dispute_photos = new_lists[0]
            transaction.seller_dispute_photos = new_lists[1]
            transaction.manager_dispute_photos = new_lists[2]
            transaction.save(update_fields=['buyer_dispute_photos', 'seller_dispute_photos', 'manager_dispute_photos'])
            return

    # Fallback to last iteration if still over 1MB
    transaction.buyer_dispute_photos = new_lists[0]
    transaction.seller_dispute_photos = new_lists[1]
    transaction.manager_dispute_photos = new_lists[2]
    transaction.save(update_fields=['buyer_dispute_photos', 'seller_dispute_photos', 'manager_dispute_photos'])


@escrow_router.post("/{transaction_id}/resolve-dispute", response=MessageResponse)
def resolve_dispute(request, transaction_id: uuid.UUID, data: ResolveDisputeSchema):
    from apps.core.permissions import is_admin_user
    is_admin_user(request)  # Only admins/managers may resolve disputes

    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, "Transaction is not currently disputed.")
        
    from apps.core.tasks import notify_dispute_resolution_task
    if data.resolution == 'COMPLETED':
        transaction.status = TransactionStatus.COMPLETED
        transaction.save(update_fields=['status', 'updated_at'])
        
        # Trigger payout immediately as requested
        execute_payout_for_transaction(transaction)
        notify_dispute_resolution_task.delay(transaction.id, "RELEASE_TO_SELLER", data.resolution)
        
        compress_dispute_images_total_1mb(transaction)
        return {"message": "Dispute resolved to COMPLETED. Funds transferred to seller."}
        
    elif data.resolution == 'CANCELLED':
        transaction.status = 'CANCELLED'
        transaction.save(update_fields=['status', 'updated_at'])
        notify_dispute_resolution_task.delay(transaction.id, "FULL_REFUND_TO_BUYER", data.resolution)
        compress_dispute_images_total_1mb(transaction)
        return {"message": "Dispute resolved to CANCELLED. Funds hold."}
        
    raise HttpError(400, "Invalid resolution. Use 'COMPLETED' or 'CANCELLED'.")

from ninja_jwt.authentication import JWTAuth
from apps.core.permissions import is_admin_user, is_superuser_user
from apps.ledger.models import LedgerAccount
from django.db.models import Sum

admin_router = Router(tags=["Admin Operations"], auth=JWTCookieAuth())

class DisputeResolutionAdminSchema(Schema):
    action: str  # 'RELEASE_TO_SELLER', 'FULL_REFUND_TO_BUYER', 'PARTIAL_REFUND_TO_BUYER', 'REQUIRE_RETURN_FROM_BUYER'
    refund_amount_ghs: Optional[float] = 0.0
    seller_amount_ghs: Optional[float] = 0.0
    platform_retained_fee_ghs: Optional[float] = 0.0
    admin_notes: Optional[str] = None
    manager_photos: Optional[List[str]] = []

class DispatchReturnSchema(Schema):
    delivery_method: str  # 'COURIER_API' or 'INFORMAL_BUS'
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier_code: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_car_number: Optional[str] = None
    destination_station: Optional[str] = None
    waybill_photo_url: Optional[str] = None

class ConfirmReturnSchema(Schema):
    confirmation_code: Optional[str] = None

class RaiseDisputeSchema(Schema):
    reason: str
    photos: Optional[List[str]] = []

class SellerDisputeResponseSchema(Schema):
    response: str
    photos: Optional[List[str]] = []

@escrow_router.post("/{transaction_id}/raise-dispute", response=MessageResponse, auth=None)
def raise_dispute_buyer(request, transaction_id: uuid.UUID, data: RaiseDisputeSchema):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.status in [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED, TransactionStatus.CANCELLED]:
        raise HttpError(400, f"Cannot raise dispute when transaction is in {transaction.status} status.")
    
    new_photos = data.photos or []
    if len(new_photos) > 5:
        raise HttpError(400, "Maximum of 5 evidence photos allowed per submission.")
        
    optimized_new_photos = process_and_optimize_dispute_photos(new_photos[:5])
    is_subsequent_update = (transaction.status == TransactionStatus.DISPUTED)
    now_ts = timezone.now().strftime("%b %d, %Y %I:%M %p")

    if is_subsequent_update:
        # Append reason with timestamp
        if transaction.buyer_dispute_reason:
            transaction.buyer_dispute_reason = f"{transaction.buyer_dispute_reason}\n\n--- [Buyer Update ({now_ts})] ---\n{data.reason}"
        else:
            transaction.buyer_dispute_reason = data.reason
            
        # Accumulate photos up to max 5 total
        existing_photos = transaction.buyer_dispute_photos or []
        combined_photos = existing_photos + [p for p in optimized_new_photos if p not in existing_photos]
        transaction.buyer_dispute_photos = combined_photos[:5]
    else:
        # Initial dispute
        transaction.status = TransactionStatus.DISPUTED
        transaction.buyer_dispute_reason = data.reason
        transaction.buyer_dispute_photos = optimized_new_photos[:5]

    transaction.save(update_fields=['status', 'buyer_dispute_reason', 'buyer_dispute_photos', 'updated_at'])
    
    # Auto-clear/Deactivate any review submitted by the buyer for this transaction
    if hasattr(transaction, 'review') and transaction.review:
        transaction.review.is_active = False
        transaction.review.save(update_fields=['is_active'])
    
    # Notify Seller
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    from django.conf import settings
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    dash_link = f"{frontend_url}/dashboard?search={transaction.paystack_reference}"
    
    action_title = "Dispute Update" if is_subsequent_update else "Dispute Raised"
    s_sms = (
        f"{action_title}: Buyer submitted {'additional details' if is_subsequent_update else 'a dispute'} for order {transaction.paystack_reference} ({transaction.link.title}). "
        f"Details: {data.reason}. Log in to seller dashboard to review."
    )
    
    s_email_body = (
        f"Action Required: {action_title} on order {transaction.paystack_reference} ({transaction.link.title}).\n\n"
        f"Buyer Details:\n\"{data.reason}\"\n\n"
        f"Please log in to your seller dashboard to review the dispute claim, view buyer evidence photos, and submit counter-evidence.\n\n"
        f"Review Dispute Now: {dash_link}"
    )
    
    seller = transaction.link.seller
    s_phone = getattr(seller, 'phone_number', None)
    s_email = getattr(seller, 'email', None)
    if s_phone:
        dispatch_sms_task.delay(s_phone, s_sms)
    if s_email:
        dispatch_email_task.delay(
            s_email, 
            f"{action_title} on Order {transaction.paystack_reference}", 
            s_email_body
        )
    
    return {"message": "Additional dispute details and evidence photos submitted successfully." if is_subsequent_update else "Dispute and evidence photos submitted successfully."}

@escrow_router.post("/{transaction_id}/seller-dispute-response", response=MessageResponse, auth=JWTCookieAuth())
def seller_dispute_response(request, transaction_id: uuid.UUID, data: SellerDisputeResponseSchema):
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.link.seller != request.user:
        raise HttpError(403, "You are not authorized to respond to this dispute.")
        
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, "Transaction is not currently in DISPUTED status.")
        
    new_photos = data.photos or []
    if len(new_photos) > 5:
        raise HttpError(400, "Maximum of 5 evidence photos allowed per submission.")
        
    optimized_new_photos = process_and_optimize_dispute_photos(new_photos[:5])
    now_ts = timezone.now().strftime("%b %d, %Y %I:%M %p")

    # Append response text with timestamp if previous response exists
    if transaction.seller_dispute_response:
        transaction.seller_dispute_response = f"{transaction.seller_dispute_response}\n\n--- [Seller Response ({now_ts})] ---\n{data.response}"
    else:
        transaction.seller_dispute_response = data.response

    # Accumulate evidence photos up to max 5 total
    existing_photos = transaction.seller_dispute_photos or []
    combined_photos = existing_photos + [p for p in optimized_new_photos if p not in existing_photos]
    transaction.seller_dispute_photos = combined_photos[:5]

    transaction.save(update_fields=['seller_dispute_response', 'seller_dispute_photos', 'updated_at'])
    
    # Notify Buyer
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    from django.conf import settings
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    track_link = f"{frontend_url}/l/{transaction.link.id}?reference={transaction.paystack_reference}"

    b_sms = f"Dispute Update: Seller submitted a counter-response on order {transaction.paystack_reference}. Track your order online to review details."
    b_email_body = (
        f"Dispute Update: The seller has responded to your dispute on order {transaction.paystack_reference} ({transaction.link.title}).\n\n"
        f"Seller Response:\n\"{data.response}\"\n\n"
        f"You can view the full counter-evidence photos and order details online:\n{track_link}"
    )

    if transaction.buyer_phone:
        dispatch_sms_task.delay(transaction.buyer_phone, b_sms)
    if transaction.buyer_email:
        dispatch_email_task.delay(
            transaction.buyer_email,
            f"Dispute Response from Seller - Order {transaction.paystack_reference}",
            b_email_body
        )

    return {"message": "Dispute response and evidence photos recorded successfully."}


@escrow_router.post("/{transaction_id}/retract-dispute", response=MessageResponse, auth=None)
def retract_dispute_buyer(request, transaction_id: uuid.UUID):
    """
    Allows the buyer to retract their dispute and settle privately with the seller.
    Funds are scheduled to be released to the seller after the platform's configured grace period (default 24h).
    Ratings remain voided permanently to prevent review coercion.
    """
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, f"Cannot retract dispute when transaction is in {transaction.status} status.")

    cfg = get_platform_settings()
    retract_hours = int(cfg.get("dispute_retraction_release_hours", 24))

    now = timezone.now()
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    transaction.dispute_retracted_at = now
    transaction.inspection_starts_at = now
    transaction.save(update_fields=['status', 'dispute_retracted_at', 'inspection_starts_at', 'updated_at'])

    # Permanently void / deactivate any review
    if hasattr(transaction, 'review') and transaction.review:
        transaction.review.is_active = False
        transaction.review.save(update_fields=['is_active'])

    # Notify Seller
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    from django.conf import settings
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    dash_link = f"{frontend_url}/dashboard?search={transaction.paystack_reference}"

    seller = transaction.link.seller
    s_phone = getattr(seller, 'phone_number', None)
    s_email = getattr(seller, 'email', None)

    s_sms = (
        f"Dispute Retracted: The buyer has retracted the dispute for order {transaction.paystack_reference}. "
        f"Funds will be automatically released to your wallet in {retract_hours} hours."
    )
    s_email_body = (
        f"Dispute Retracted & Settled: The buyer has retracted their dispute for order {transaction.paystack_reference} ({transaction.link.title}).\n\n"
        f"As per escrow policy, the funds will be automatically released and settled to your wallet in {retract_hours} hours.\n\n"
        f"View Transaction: {dash_link}"
    )

    if s_phone:
        dispatch_sms_task.delay(s_phone, s_sms)
    if s_email:
        dispatch_email_task.delay(
            s_email,
            f"Dispute Retracted on Order {transaction.paystack_reference}",
            s_email_body
        )

    # Notify Buyer
    b_sms = f"Dispute Retracted: You retracted your dispute for order {transaction.paystack_reference}. Funds will be released to the seller in {retract_hours} hours."
    if transaction.buyer_phone:
        dispatch_sms_task.delay(transaction.buyer_phone, b_sms)

    return {"message": f"Dispute retracted successfully. Funds will be released to the seller in {retract_hours} hours."}


@escrow_router.post("/{transaction_id}/dispatch-return", response=MessageResponse, auth=None)
def dispatch_return(request, transaction_id: uuid.UUID, data: DispatchReturnSchema):
    """Buyer dispatches the returned item back to the seller via Courier or Informal Bus."""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    if transaction.status not in [TransactionStatus.RETURN_IN_PROGRESS, TransactionStatus.DISPUTED]:
        raise HttpError(400, f"Cannot dispatch return for transaction in state {transaction.status}.")

    waybill_photo = data.waybill_photo_url or ""
    if waybill_photo and waybill_photo.startswith('data:image'):
        opt = process_and_optimize_dispute_photos([waybill_photo])
        if opt:
            waybill_photo = opt[0]

    from django.utils import timezone
    transaction.return_delivery_method = data.delivery_method
    transaction.return_waybill_photo_url = waybill_photo
    transaction.return_dispatched_at = timezone.now()

    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    seller = transaction.link.seller
    s_phone = getattr(seller, 'phone_number', None)
    s_email = getattr(seller, 'email', None)

    if data.delivery_method == 'COURIER_API':
        if not data.courier_name or not data.tracking_number:
            raise HttpError(400, "courier_name and tracking_number are required for courier return.")

        from apps.delivery.tracking import generate_carrier_tracking_url
        carrier_code = (data.carrier_code or 'OTHERS').upper()
        tracking_url = generate_carrier_tracking_url(
            carrier_code=carrier_code,
            tracking_number=data.tracking_number,
            courier_name=data.courier_name
        )

        transaction.return_courier_name = data.courier_name
        transaction.return_tracking_number = data.tracking_number
        transaction.return_carrier_tracking_url = tracking_url
        transaction.status = TransactionStatus.RETURN_IN_PROGRESS
        transaction.save()

        s_msg = (
            f"Item Return Shipped! Buyer has dispatched order {transaction.paystack_reference} ({transaction.link.title}) "
            f"via {data.courier_name} (Tracking: {data.tracking_number}). Track Package: {tracking_url}"
        )

    elif data.delivery_method == 'INFORMAL_BUS':
        if not data.driver_phone or not data.destination_station:
            raise HttpError(400, "driver_phone and destination_station are required for informal bus return.")

        import secrets
        otp = str(secrets.randbelow(900000) + 100000)
        transaction.return_driver_phone = data.driver_phone
        transaction.return_driver_car_number = data.driver_car_number or ""
        transaction.return_destination_station = data.destination_station
        transaction.return_confirmation_code = otp
        transaction.status = TransactionStatus.RETURN_IN_PROGRESS
        transaction.save()

        s_msg = (
            f"Item Return Dispatched via Bus! Order {transaction.paystack_reference} ({transaction.link.title}) is on its way back to {data.destination_station}. "
            f"Driver: {data.driver_phone}. Car No: {data.driver_car_number or 'N/A'}. "
            f"Reverse Pickup OTP: {otp}. Show this OTP to the driver at pickup."
        )
    else:
        raise HttpError(400, "Invalid delivery_method. Use 'COURIER_API' or 'INFORMAL_BUS'.")

    if s_phone:
        dispatch_sms_task.delay(s_phone, s_msg)
    if s_email:
        dispatch_email_task.delay(s_email, f"Item Return Dispatched - Order #{transaction.paystack_reference}", s_msg)

    return {"message": "Return shipment recorded successfully. Seller has been notified of return tracking details."}


@escrow_router.post("/seller/transactions/{transaction_id}/confirm-return", response=MessageResponse, auth=JWTCookieAuth())
def seller_confirm_return(request, transaction_id: uuid.UUID, data: ConfirmReturnSchema):
    """Seller confirms receipt of returned item (or submits Reverse OTP for bus pickup). Triggers full refund to buyer."""
    transaction = get_object_or_404(Transaction, id=transaction_id, link__seller=request.user)
    if transaction.status != TransactionStatus.RETURN_IN_PROGRESS:
        raise HttpError(400, "Transaction is not currently in RETURN_IN_PROGRESS state.")

    if transaction.return_delivery_method == 'INFORMAL_BUS':
        import secrets
        if not data.confirmation_code or not secrets.compare_digest(str(transaction.return_confirmation_code), str(data.confirmation_code).strip()):
            raise HttpError(400, "Invalid Reverse Pickup OTP code.")

    # Execute full refund to buyer
    from apps.ledger.services import execute_full_refund
    execute_full_refund(
        reference_id=str(transaction.id),
        seller_user_id=request.user.id,
        gross_amount=transaction.total_amount_ghs,
        platform_fee=transaction.platform_fee_ghs
    )

    transaction.status = TransactionStatus.REFUNDED
    transaction.save(update_fields=['status', 'updated_at'])

    # Execute refund payout to buyer's payment method / account
    from apps.wallet.services import execute_refund_payout
    execute_refund_payout(
        buyer_phone=transaction.buyer_phone,
        buyer_email=transaction.buyer_email,
        refund_amount=transaction.total_amount_ghs,
        reference_id=str(transaction.id)
    )

    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    buyer_greeting_name = transaction.buyer_name.strip().split()[0] if transaction.buyer_name and transaction.buyer_name.strip() else "Buyer"
    b_msg = f"Hello {buyer_greeting_name}, your return for order #{transaction.paystack_reference} ({transaction.link.title}) has been confirmed by the seller. A full refund of GHS {transaction.total_amount_ghs:.2f} has been processed back to your original payment method. Thank you for using HendAxis Trust."
    dispatch_sms_task.delay(transaction.buyer_phone, b_msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, f"Item Return Confirmed & Refund Issued - Order #{transaction.paystack_reference}", b_msg)

    return {"message": "Return confirmed. Escrow refund issued to buyer."}

class BroadcastMessageSchema(Schema):
    target_group: str  # 'ALL_USERS', 'ALL_SELLERS', 'ALL_BUYERS', 'USERS_WITH_ACTIVE_ESCROW', 'USERS_WITH_DISPUTES', 'CUSTOM'
    channels: str  # 'SMS', 'EMAIL', 'BOTH'
    subject: Optional[str] = "Important Notification from HendAxis Trust"
    message: str
    custom_recipients: Optional[str] = None  # Comma-separated list of phone numbers or emails

@admin_router.get("/metrics")
def get_platform_metrics(request):
    is_admin_user(request)
    
    revenue = LedgerAccount.objects.filter(name='PLATFORM_FEE_REVENUE').aggregate(total=Sum('balance'))['total'] or 0
    liabilities = LedgerAccount.objects.filter(name='BUYER_ESCROW_DEPOSIT').aggregate(total=Sum('balance'))['total'] or 0
    
    gmv = Transaction.objects.exclude(
        status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]
    ).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
    
    counts = {
        status[0]: Transaction.objects.filter(status=status[0]).count()
        for status in TransactionStatus.choices
    }
    
    from apps.users.models import User
    total_sellers = User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct().count()
    total_buyers = Transaction.objects.values('buyer_phone').distinct().count()
    total_transactions = Transaction.objects.count()
    active_disputes = Transaction.objects.filter(status=TransactionStatus.DISPUTED).count()

    return {
        "gmv_ghs": float(gmv),
        "platform_revenue_ghs": float(revenue),
        "active_escrow_liabilities_ghs": float(liabilities),
        "total_sellers": total_sellers,
        "total_buyers": total_buyers,
        "total_transactions": total_transactions,
        "active_disputes": active_disputes,
        "transaction_counts": counts
    }

@admin_router.get("/disputes")
def get_disputes(request):
    is_admin_user(request)
    txns = Transaction.objects.filter(status=TransactionStatus.DISPUTED).select_related('link', 'link__seller').prefetch_related('delivery_logs')
    res = []
    for t in txns:
        log = t.delivery_logs.order_by('-created_at').first()
        res.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "link_title": t.link.title,
            "seller_id": str(t.link.seller.id),
            "seller_username": t.link.seller.username,
            "shop_name": t.link.seller.shop_name or f"@{t.link.seller.username}'s Store",
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
            "buyer_name": t.buyer_name,
            "buyer_phone": t.buyer_phone,
            "buyer_email": t.buyer_email,
            "total_amount_ghs": float(t.total_amount_ghs),
            "platform_fee_ghs": float(t.platform_fee_ghs),
            "status": t.status,
            "buyer_dispute_reason": t.buyer_dispute_reason,
            "buyer_dispute_photos": t.buyer_dispute_photos or [],
            "seller_dispute_response": t.seller_dispute_response,
            "seller_dispute_photos": t.seller_dispute_photos or [],
            "manager_dispute_notes": t.manager_dispute_notes,
            "manager_dispute_photos": t.manager_dispute_photos or [],
            "created_at": t.created_at.isoformat(),
            "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
            "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "delivery_method": log.delivery_method if log else None,
            "courier_name": log.courier_name if log else None,
            "tracking_number": log.tracking_number if log else None,
            "driver_phone": log.driver_phone if log else None,
            "destination_station": log.destination_station if log else None,
            "waybill_photo_url": log.waybill_photo_url if log else None,
            "buyer_id_photo_url": log.buyer_id_photo_url if log else None,
        })
    return res

@admin_router.post("/disputes/{id}/resolve")
def resolve_dispute_admin(request, id: uuid.UUID, data: DisputeResolutionAdminSchema):
    is_admin_user(request)
    transaction = get_object_or_404(Transaction, id=id)
    if transaction.status != TransactionStatus.DISPUTED:
        raise HttpError(400, "Transaction is not in a DISPUTED state")

    manager_photos = data.manager_photos or []
    if len(manager_photos) > 5:
        raise HttpError(400, "Managers can upload a maximum of 5 ruling photos.")

    if data.admin_notes:
        transaction.manager_dispute_notes = data.admin_notes
    if manager_photos:
        transaction.manager_dispute_photos = process_and_optimize_dispute_photos(manager_photos[:5])
        
    from apps.core.tasks import notify_dispute_resolution_task
    if data.action == "RELEASE_TO_SELLER":
        transaction.status = TransactionStatus.COMPLETED
        transaction.save()
        execute_payout_for_transaction(transaction)
        notify_dispute_resolution_task.delay(transaction.id, "RELEASE_TO_SELLER", data.admin_notes)
        compress_dispute_images_total_1mb(transaction)
        return {"message": "Funds released to seller."}
        
    elif data.action == "FULL_REFUND_TO_BUYER":
        from apps.ledger.services import execute_full_refund
        execute_full_refund(
            reference_id=str(transaction.id),
            seller_user_id=transaction.link.seller.id,
            gross_amount=transaction.total_amount_ghs,
            platform_fee=transaction.platform_fee_ghs
        )
        transaction.status = TransactionStatus.REFUNDED
        transaction.save()
        notify_dispute_resolution_task.delay(transaction.id, "FULL_REFUND_TO_BUYER", data.admin_notes)
        compress_dispute_images_total_1mb(transaction)
        return {"message": "Full refund issued to buyer. Seller charged for platform fee."}
        
    elif data.action in ["PARTIAL_REFUND_TO_BUYER", "PARTIAL_REFUND"]:
        from decimal import Decimal
        refund_val = Decimal(str(data.refund_amount_ghs or 0.0))
        seller_val = Decimal(str(data.seller_amount_ghs or 0.0))
        requested_fee = Decimal(str(data.platform_retained_fee_ghs or 0.0))
        
        total_split = refund_val + seller_val + requested_fee
        if total_split > transaction.total_amount_ghs:
            raise HttpError(
                400, 
                f"The total allocated (GHS {total_split:.2f}) exceeds the total amount paid by the buyer (GHS {transaction.total_amount_ghs:.2f})."
            )
            
        fee_val = requested_fee + max(Decimal('0.00'), transaction.total_amount_ghs - total_split)

        from apps.ledger.services import execute_partial_refund
        execute_partial_refund(
            reference_id=str(transaction.id),
            seller_user_id=transaction.link.seller.id,
            refund_amount_ghs=refund_val,
            seller_amount_ghs=seller_val,
            platform_retained_fee_ghs=fee_val
        )
        transaction.status = TransactionStatus.REFUNDED
        transaction.save()
        
        notify_dispute_resolution_task.delay(
            transaction.id,
            "PARTIAL_REFUND_TO_BUYER",
            data.admin_notes,
            float(refund_val),
            float(seller_val)
        )

        compress_dispute_images_total_1mb(transaction)
        return {"message": f"Dispute settlement processed successfully. Payouts scheduled within 24 hours: GHS {refund_val:.2f} to buyer via original payment method, GHS {seller_val:.2f} to seller."}
        
    elif data.action in ["REQUIRE_RETURN_FROM_BUYER", "RETURN_IN_PROGRESS"]:
        transaction.status = TransactionStatus.RETURN_IN_PROGRESS
        transaction.save()

        cfg = get_platform_settings()
        return_days = cfg.get("return_dispatch_days", 3)

        notify_dispute_resolution_task.delay(transaction.id, "REQUIRE_RETURN_FROM_BUYER", data.admin_notes)

        compress_dispute_images_total_1mb(transaction)
        return {"message": f"Dispute marked as Return Required ({return_days}-day limit). Buyer notified to dispatch return shipment."}
    
    raise HttpError(400, "Invalid action")

@admin_router.get("/transactions")
def get_all_transactions_admin(request, status: Optional[str] = None, search: Optional[str] = None, limit: int = 50, offset: int = 0):
    is_admin_user(request)
    qs = Transaction.objects.select_related('link', 'link__seller').prefetch_related('delivery_logs').order_by('-created_at')
    
    if status and status != 'ALL':
        qs = qs.filter(status=status)
        
    if search:
        qs = qs.filter(
            Q(paystack_reference__icontains=search) |
            Q(buyer_name__icontains=search) |
            Q(buyer_phone__icontains=search) |
            Q(buyer_email__icontains=search) |
            Q(link__title__icontains=search) |
            Q(link__seller__username__icontains=search)
        )
        
    total_count = qs.count()
    txns = list(qs[offset:offset+limit])
    
    items = []
    for t in txns:
        log = t.delivery_logs.order_by('-created_at').first()
        items.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "title": t.link.title,
            "seller_username": t.link.seller.username,
            "shop_name": t.link.seller.shop_name or f"@{t.link.seller.username}'s Store",
            "seller_email": getattr(t.link.seller, 'email', ''),
            "seller_phone": getattr(t.link.seller, 'phone_number', ''),
            "buyer_name": t.buyer_name,
            "buyer_phone": t.buyer_phone,
            "buyer_email": t.buyer_email,
            "shipping_address": t.shipping_address,
            "total_amount_ghs": float(t.total_amount_ghs),
            "platform_fee_ghs": float(t.platform_fee_ghs),
            "fee_handling": t.link.fee_handling,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
            "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
            "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
            "delivery_method": log.delivery_method if log else None,
            "courier_name": log.courier_name if log else None,
            "tracking_number": log.tracking_number if log else None,
            "driver_phone": log.driver_phone if log else None,
            "driver_car_number": log.driver_car_number if log else None,
            "destination_station": log.destination_station if log else None,
        })
        
    return {"total_count": total_count, "items": items}

@admin_router.get("/transactions/{id}")
def get_transaction_detail_admin(request, id: uuid.UUID):
    is_admin_user(request)
    t = get_object_or_404(Transaction.objects.select_related('link', 'link__seller').prefetch_related('delivery_logs'), id=id)
    
    logs = [{
        "id": str(l.id),
        "delivery_method": l.delivery_method,
        "courier_name": l.courier_name,
        "tracking_number": l.tracking_number,
        "driver_phone": l.driver_phone,
        "driver_car_number": l.driver_car_number,
        "destination_station": l.destination_station,
        "waybill_photo_url": l.waybill_photo_url,
        "buyer_id_photo_url": l.buyer_id_photo_url,
        "created_at": l.created_at.isoformat(),
    } for l in t.delivery_logs.order_by('-created_at')]
    
    from apps.ledger.models import LedgerEntry
    entries_qs = LedgerEntry.objects.filter(reference_id=t.id).select_related('debit_account', 'credit_account').order_by('timestamp')
    ledger_entries = [{
        "id": str(e.id),
        "entry_type": e.entry_type,
        "debit_account": e.debit_account.name if e.debit_account else "N/A",
        "credit_account": e.credit_account.name if e.credit_account else "N/A",
        "amount_ghs": float(e.amount_ghs),
        "created_at": e.timestamp.isoformat(),
    } for e in entries_qs]
    
    latest_log = t.delivery_logs.order_by('-created_at').first()
    waybill_url = latest_log.waybill_photo_url if latest_log else None
    
    return {
        "id": str(t.id),
        "paystack_reference": t.paystack_reference,
        "title": t.link.title,
        "description": t.link.description,
        "shipping_fee_ghs": float(t.link.shipping_fee_ghs or 0.0),
        "waybill_photo_url": waybill_url,
        "seller": {
            "id": str(t.link.seller.id),
            "username": t.link.seller.username,
            "shop_name": t.link.seller.shop_name or f"@{t.link.seller.username}'s Store",
            "email": getattr(t.link.seller, 'email', ''),
            "phone_number": getattr(t.link.seller, 'phone_number', ''),
        },
        "buyer": {
            "name": t.buyer_name,
            "phone": t.buyer_phone,
            "email": t.buyer_email,
            "shipping_address": t.shipping_address,
        },
        "total_amount_ghs": float(t.total_amount_ghs),
        "platform_fee_ghs": float(t.platform_fee_ghs),
        "status": t.status,
        "buyer_dispute_reason": t.buyer_dispute_reason,
        "buyer_dispute_photos": t.buyer_dispute_photos or [],
        "seller_dispute_response": t.seller_dispute_response,
        "seller_dispute_photos": t.seller_dispute_photos or [],
        "manager_dispute_notes": t.manager_dispute_notes,
        "manager_dispute_photos": t.manager_dispute_photos or [],
        "created_at": t.created_at.isoformat(),
        "dispatched_at": t.dispatched_at.isoformat() if t.dispatched_at else None,
        "delivered_at": t.delivered_at.isoformat() if t.delivered_at else None,
        "inspection_starts_at": t.inspection_starts_at.isoformat() if t.inspection_starts_at else None,
        "delivery_logs": logs,
        "ledger_entries": ledger_entries,
    }

@admin_router.get("/sellers")
def get_sellers_admin(request, search: Optional[str] = None):
    is_admin_user(request)
    from apps.users.models import User
    from apps.wallet.models import SellerWallet
    from apps.reviews.models import SellerReview
    from django.db.models import Avg
    
    sellers = User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct()
    
    if search:
        sellers = sellers.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(shop_name__icontains=search)
        )
        
    res = []
    for s in sellers:
        links_count = s.payment_links.count()
        txns = Transaction.objects.filter(link__seller=s)
        total_txns = txns.count()
        
        completed_gmv = txns.filter(status=TransactionStatus.COMPLETED).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
        
        wallet = SellerWallet.objects.filter(user=s).first()
        wallet_balance = float(wallet.available_balance_ghs) if wallet else 0.0
        payout_mode = getattr(s, 'payout_mode', 'INSTANT')

        dh = compute_seller_dispute_health(s)
        reviews_count = SellerReview.objects.filter(seller=s, is_active=True).count()
        
        res.append({
            "id": str(s.id),
            "username": s.username,
            "email": getattr(s, 'email', ''),
            "phone_number": getattr(s, 'phone_number', ''),
            "shop_name": getattr(s, 'shop_name', ''),
            "shop_description": getattr(s, 'shop_description', ''),
            "shop_category": getattr(s, 'shop_category', 'General'),
            "profile_picture_url": getattr(s, 'profile_picture_url', ''),
            "banner_url": getattr(s, 'banner_url', ''),
            "verification_status": getattr(s, 'verification_status', 'UNSUBMITTED'),
            "payout_mode": payout_mode,
            "created_at": s.created_at.isoformat() if hasattr(s, 'created_at') and s.created_at else (s.date_joined.isoformat() if hasattr(s, 'date_joined') and s.date_joined else None),
            "payment_links_count": links_count,
            "total_transactions_count": total_txns,
            "total_reviews_count": reviews_count,
            "completed_gmv_ghs": float(completed_gmv),
            "wallet_balance_ghs": wallet_balance,
            "is_suspended": s.is_suspended,
            "suspension_reason": s.suspension_reason or "",
            "dispute_health": dh
        })
        
    return res


@admin_router.get("/sellers/{seller_id}/details", response=dict)
@escrow_router.get("/admin/sellers/{seller_id}/details", response=dict)
def get_seller_details_admin(request, seller_id: uuid.UUID):
    """
    Comprehensive administrative summary and deep-dive for a single seller.
    Includes ratings, review comments, active links, top performing links, shop profile, and wallet metrics.
    """
    is_admin_user(request)
    from apps.users.models import User
    from apps.wallet.models import SellerWallet
    from apps.reviews.models import SellerReview
    from apps.links.models import PaymentLink
    from django.db.models import Avg, Count

    seller = get_object_or_404(User, id=seller_id)

    # 1. Dispute Health
    dh = compute_seller_dispute_health(seller)

    # 2. Wallet
    wallet = SellerWallet.objects.filter(user=seller).first()
    wallet_data = {
        "available_balance_ghs": float(wallet.available_balance_ghs) if wallet else 0.0,
        "preferred_payout_type": getattr(wallet, 'preferred_payout_type', 'MOMO') if wallet else 'MOMO',
        "momo_number": getattr(wallet, 'momo_number', '') if wallet else '',
        "bank_account_number": getattr(wallet, 'bank_account_number', '') if wallet else '',
        "bank_name": getattr(wallet, 'bank_name', '') if wallet else '',
        "bank_code": getattr(wallet, 'bank_code', '') if wallet else '',
        "bank_account_name": getattr(wallet, 'bank_account_name', '') if wallet else '',
        "total_paystack_fees_ghs": float(wallet.total_paystack_fees_ghs) if wallet else 0.0,
    }

    # 3. Links Summary & Top Performing Links
    links_qs = PaymentLink.objects.filter(seller=seller)
    total_links = links_qs.count()
    active_links = links_qs.filter(is_active=True, is_archived=False).count()
    archived_links = links_qs.filter(is_archived=True).count()

    top_links = []
    for link in links_qs.annotate(tx_count=Count('transactions')).order_by('-tx_count')[:6]:
        link_txns = Transaction.objects.filter(link=link)
        completed_vol = link_txns.filter(status=TransactionStatus.COMPLETED).count()
        completed_rev = link_txns.filter(status=TransactionStatus.COMPLETED).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
        disputed_cnt = link_txns.filter(status=TransactionStatus.DISPUTED).count()
        top_links.append({
            "id": str(link.id),
            "title": link.title,
            "description": link.description or '',
            "price_ghs": float(link.price_ghs),
            "shipping_fee_ghs": float(link.shipping_fee_ghs),
            "image_url": link.image_url or '',
            "is_active": link.is_active,
            "is_archived": link.is_archived,
            "created_at": link.created_at.isoformat(),
            "total_transactions": link_txns.count(),
            "completed_transactions": completed_vol,
            "completed_revenue_ghs": float(completed_rev),
            "disputed_transactions": disputed_cnt,
        })

    # 4. Transactions summary
    seller_txns = Transaction.objects.filter(link__seller=seller)
    total_txns = seller_txns.count()
    completed_txns = seller_txns.filter(status=TransactionStatus.COMPLETED).count()
    disputed_txns = seller_txns.filter(status=TransactionStatus.DISPUTED).count()
    cancelled_txns = seller_txns.filter(status=TransactionStatus.CANCELLED).count()
    refunded_txns = seller_txns.filter(status=TransactionStatus.REFUNDED).count()
    completed_gmv = seller_txns.filter(status=TransactionStatus.COMPLETED).aggregate(total=Sum('total_amount_ghs'))['total'] or 0

    # 5. Reviews & Comments
    reviews_qs = SellerReview.objects.filter(seller=seller).order_by('-created_at')
    total_reviews = reviews_qs.count()
    active_reviews = reviews_qs.filter(is_active=True)
    reviews_agg = active_reviews.aggregate(
        avg_overall=Avg('rating_overall'),
        avg_speed=Avg('rating_speed'),
        avg_comm=Avg('rating_communication')
    )
    avg_overall = round(float(reviews_agg['avg_overall']), 2) if reviews_agg['avg_overall'] is not None else None
    avg_speed = round(float(reviews_agg['avg_speed']), 2) if reviews_agg['avg_speed'] is not None else None
    avg_comm = round(float(reviews_agg['avg_comm']), 2) if reviews_agg['avg_comm'] is not None else None

    reviews_list = []
    for r in reviews_qs[:15]:
        reviews_list.append({
            "id": str(r.id),
            "buyer_name": r.buyer_name,
            "rating_overall": r.rating_overall,
            "rating_speed": r.rating_speed,
            "rating_communication": r.rating_communication,
            "comment": r.comment or '',
            "image_url": r.image_url or '',
            "seller_reply": r.seller_reply or '',
            "seller_replied_at": r.seller_replied_at.isoformat() if r.seller_replied_at else None,
            "is_active": r.is_active,
            "created_at": r.created_at.isoformat(),
        })

    return {
        "seller": {
            "id": str(seller.id),
            "username": seller.username,
            "email": getattr(seller, 'email', ''),
            "phone_number": getattr(seller, 'phone_number', ''),
            "role": seller.role,
            "payout_mode": getattr(seller, 'payout_mode', 'INSTANT'),
            "shop_name": getattr(seller, 'shop_name', ''),
            "shop_description": getattr(seller, 'shop_description', ''),
            "shop_category": getattr(seller, 'shop_category', 'General'),
            "shop_categories": getattr(seller, 'shop_categories', []),
            "advertised_until": seller.advertised_until.isoformat() if getattr(seller, 'advertised_until', None) else None,
            "profile_picture_url": getattr(seller, 'profile_picture_url', ''),
            "banner_url": getattr(seller, 'banner_url', ''),
            "verification_status": getattr(seller, 'verification_status', 'UNSUBMITTED'),
            "verified_at": seller.verified_at.isoformat() if getattr(seller, 'verified_at', None) else None,
            "is_suspended": seller.is_suspended,
            "suspension_reason": seller.suspension_reason or "",
            "suspended_at": seller.suspended_at.isoformat() if getattr(seller, 'suspended_at', None) else None,
            "reinstated_at": seller.reinstated_at.isoformat() if getattr(seller, 'reinstated_at', None) else None,
            "is_email_verified": getattr(seller, 'is_email_verified', False),
            "is_phone_verified": getattr(seller, 'is_phone_verified', False),
            "date_joined": seller.date_joined.isoformat() if hasattr(seller, 'date_joined') and seller.date_joined else None,
        },
        "dispute_health": dh,
        "wallet": wallet_data,
        "links_summary": {
            "total_links": total_links,
            "active_links": active_links,
            "archived_links": archived_links,
            "top_links": top_links,
        },
        "transactions_summary": {
            "total_orders": total_txns,
            "completed_orders": completed_txns,
            "disputed_orders": disputed_txns,
            "cancelled_orders": cancelled_txns,
            "refunded_orders": refunded_txns,
            "completed_gmv_ghs": float(completed_gmv),
        },
        "reviews_summary": {
            "total_reviews_count": total_reviews,
            "avg_rating_overall": avg_overall,
            "avg_rating_speed": avg_speed,
            "avg_rating_communication": avg_comm,
            "reviews": reviews_list,
        }
    }

class AdminSuspendSellerSchema(Schema):
    reason: Optional[str] = "Manual administrative suspension by management."

@admin_router.post("/sellers/{seller_id}/suspend", response=dict)
@escrow_router.post("/admin/sellers/{seller_id}/suspend", response=dict)
def admin_suspend_seller(request, seller_id: uuid.UUID, data: AdminSuspendSellerSchema):
    is_admin_user(request)
    from apps.users.models import User
    from apps.links.models import PaymentLink

    seller = get_object_or_404(User, id=seller_id)
    reason = data.reason.strip() if data.reason else "Manual administrative suspension"

    seller.is_suspended = True
    seller.suspension_reason = reason
    seller.suspended_at = timezone.now()
    seller.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at'])

    # Deactivate all active payment links for this seller
    PaymentLink.objects.filter(seller=seller, is_active=True).update(is_active=False)

    return {
        "message": f"Seller @{seller.username} has been suspended.",
        "seller_id": str(seller.id),
        "is_suspended": True,
        "suspension_reason": seller.suspension_reason
    }

@admin_router.post("/sellers/{seller_id}/reinstate", response=dict)
@escrow_router.post("/admin/sellers/{seller_id}/reinstate", response=dict)
def admin_reinstate_seller(request, seller_id: uuid.UUID):
    is_admin_user(request)
    from apps.users.models import User

    seller = get_object_or_404(User, id=seller_id)
    seller.is_suspended = False
    seller.suspension_reason = ""
    seller.suspended_at = None
    seller.reinstated_at = timezone.now()
    seller.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at', 'reinstated_at'])

    return {
        "message": f"Seller @{seller.username} has been reinstated successfully.",
        "seller_id": str(seller.id),
        "is_suspended": False
    }


# ─── Admin: Suspension Appeals Review ─────────────────────────────────────────

class ReviewSuspensionAppealSchema(Schema):
    decision: str
    admin_notes: Optional[str] = ""


@admin_router.get("/appeals", response=List[dict])
def list_suspension_appeals(request, status: Optional[str] = None):
    is_admin_user(request)
    from apps.users.models import SuspensionAppeal
    qs = SuspensionAppeal.objects.select_related('user', 'reviewed_by').all().order_by('-created_at')
    if status and status.upper() in ['PENDING', 'APPROVED', 'REJECTED']:
        qs = qs.filter(status=status.upper())

    return [
        {
            "id": str(appeal.id),
            "user_id": str(appeal.user.id),
            "username": appeal.user.username,
            "shop_name": appeal.user.shop_name or "",
            "email": appeal.user.email or "",
            "phone_number": appeal.user.phone_number or "",
            "is_suspended": appeal.user.is_suspended,
            "suspension_reason": appeal.user.suspension_reason or "",
            "suspended_at": appeal.user.suspended_at.isoformat() if appeal.user.suspended_at else None,
            "reason": appeal.reason,
            "status": appeal.status,
            "admin_notes": appeal.admin_notes or "",
            "reviewed_by_name": appeal.reviewed_by.username if appeal.reviewed_by else None,
            "created_at": appeal.created_at.isoformat(),
            "reviewed_at": appeal.reviewed_at.isoformat() if appeal.reviewed_at else None,
        }
        for appeal in qs
    ]


@admin_router.post("/appeals/{appeal_id}/review", response=dict)
def review_suspension_appeal(request, appeal_id: uuid.UUID, data: ReviewSuspensionAppealSchema):
    is_admin_user(request)
    from apps.users.models import SuspensionAppeal, AppealStatus
    appeal = get_object_or_404(SuspensionAppeal.objects.select_related('user'), id=appeal_id)

    decision = data.decision.upper().strip()
    if decision not in ["APPROVE", "REJECT"]:
        raise HttpError(400, "Decision must be either 'APPROVE' or 'REJECT'.")

    user = appeal.user
    if decision == "APPROVE":
        appeal.status = AppealStatus.APPROVED
        user.is_suspended = False
        user.suspension_reason = ""
        user.suspended_at = None
        user.reinstated_at = timezone.now()
        user.save(update_fields=['is_suspended', 'suspension_reason', 'suspended_at', 'reinstated_at'])
    else:
        appeal.status = AppealStatus.REJECTED

    appeal.admin_notes = (data.admin_notes or "").strip()
    appeal.reviewed_by = request.user
    appeal.reviewed_at = timezone.now()
    appeal.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at'])

    return {
        "message": f"Appeal has been {'approved and user reinstated' if decision == 'APPROVE' else 'rejected'}.",
        "appeal_id": str(appeal.id),
        "status": appeal.status,
        "is_suspended": user.is_suspended
    }


@admin_router.get("/buyers")
def get_buyers_admin(request, search: Optional[str] = None):
    is_admin_user(request)
    
    qs = Transaction.objects.all()
    if search:
        qs = qs.filter(
            Q(buyer_phone__icontains=search) |
            Q(buyer_name__icontains=search) |
            Q(buyer_email__icontains=search)
        )
        
    buyer_phones = qs.values_list('buyer_phone', flat=True).distinct()
    
    res = []
    for phone in buyer_phones:
        if not phone:
            continue
        b_txns = Transaction.objects.filter(buyer_phone=phone).order_by('-created_at')
        latest = b_txns.first()
        
        total_orders = b_txns.count()
        active_escrow = b_txns.filter(status__in=[TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.INSPECTION_PERIOD]).count()
        disputed_orders = b_txns.filter(status=TransactionStatus.DISPUTED).count()
        completed_orders = b_txns.filter(status=TransactionStatus.COMPLETED).count()
        total_spent = b_txns.exclude(status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]).aggregate(total=Sum('total_amount_ghs'))['total'] or 0
        
        res.append({
            "buyer_phone": phone,
            "buyer_name": latest.buyer_name if latest else 'Unknown',
            "buyer_email": latest.buyer_email if latest else '',
            "total_orders": total_orders,
            "active_escrow_orders": active_escrow,
            "disputed_orders": disputed_orders,
            "completed_orders": completed_orders,
            "total_spent_ghs": float(total_spent),
            "last_order_at": latest.created_at.isoformat() if latest else None,
        })
        
    return res


@admin_router.get("/buyers/intelligence", response=dict)
@escrow_router.get("/admin/buyers/intelligence", response=dict)
def get_buyer_intelligence_admin(request, phone: Optional[str] = None, email: Optional[str] = None, user_id: Optional[str] = None):
    is_admin_user(request)
    from apps.users.models import User
    from apps.reviews.models import SellerReview

    query_filters = Q()
    if phone and phone.strip():
        clean_phone = phone.strip()
        query_filters |= Q(buyer_phone__iexact=clean_phone) | Q(buyer_phone__icontains=clean_phone)
    if email and email.strip():
        clean_email = email.strip()
        query_filters |= Q(buyer_email__iexact=clean_email)
    
    user_account = None
    if user_id and user_id.strip():
        try:
            user_account = User.objects.filter(id=user_id.strip()).first()
        except Exception:
            pass
    if not user_account:
        if phone and phone.strip():
            user_account = User.objects.filter(phone_number__iexact=phone.strip()).first()
        if not user_account and email and email.strip():
            user_account = User.objects.filter(email__iexact=email.strip()).first()
            
    if user_account:
        query_filters |= Q(buyer_phone__iexact=user_account.phone_number)
        if user_account.email:
            query_filters |= Q(buyer_email__iexact=user_account.email)

    if not query_filters:
        raise HttpError(400, "Please provide at least a phone number, email address, or user ID to query intelligence.")

    txns = Transaction.objects.filter(query_filters).select_related('link', 'link__seller').prefetch_related('delivery_logs').order_by('-created_at')
    latest_txn = txns.first()
    
    total_orders = txns.count()
    completed_orders = txns.filter(status=TransactionStatus.COMPLETED).count()
    active_escrow = txns.filter(status__in=[
        TransactionStatus.PAYMENT_RECEIVED,
        TransactionStatus.DELIVERY_IN_PROGRESS,
        TransactionStatus.INSPECTION_PERIOD,
        TransactionStatus.RETURN_IN_PROGRESS
    ]).count()
    disputed_orders = txns.filter(status=TransactionStatus.DISPUTED).count()
    all_disputes_raised = txns.filter(Q(buyer_dispute_reason__gt='') | Q(status=TransactionStatus.DISPUTED) | Q(dispute_retracted_at__isnull=False)).count()
    retracted_disputes = txns.filter(dispute_retracted_at__isnull=False).count()
    refunded_orders = txns.filter(status=TransactionStatus.REFUNDED).count()
    cancelled_orders = txns.filter(status=TransactionStatus.CANCELLED).count()
    total_spent = txns.exclude(status__in=[TransactionStatus.AWAITING_PAYMENT, TransactionStatus.CANCELLED, TransactionStatus.REFUNDED]).aggregate(total=Sum('total_amount_ghs'))['total'] or 0

    dispute_rate_pct = round((all_disputes_raised / total_orders * 100), 1) if total_orders > 0 else 0.0

    # Known unique addresses
    known_addresses = []
    seen_addresses = set()
    for t in txns:
        if t.shipping_address and t.shipping_address.strip():
            addr = t.shipping_address.strip()
            if addr.lower() not in seen_addresses:
                seen_addresses.add(addr.lower())
                known_addresses.append(addr)

    # Reviews submitted by this buyer
    review_filters = Q()
    if phone and phone.strip():
        review_filters |= Q(buyer_phone__iexact=phone.strip())
    if user_account and user_account.phone_number:
        review_filters |= Q(buyer_phone__iexact=user_account.phone_number)
    
    reviews_given = []
    if review_filters:
        rev_qs = SellerReview.objects.filter(review_filters).select_related('seller').order_by('-created_at')[:20]
        for r in rev_qs:
            reviews_given.append({
                "id": str(r.id),
                "seller_username": r.seller.username,
                "shop_name": r.seller.shop_name or f"@{r.seller.username}",
                "rating_overall": float(r.rating_overall),
                "rating_speed": float(r.rating_speed),
                "rating_communication": float(r.rating_communication),
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
                "edit_count": r.edit_count,
            })

    # Recent Transactions
    recent_transactions = []
    for t in txns[:25]:
        log = t.delivery_logs.order_by('-created_at').first()
        recent_transactions.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "title": t.link.title,
            "seller_id": str(t.link.seller.id),
            "seller_username": t.link.seller.username,
            "shop_name": t.link.seller.shop_name or f"@{t.link.seller.username}'s Store",
            "amount_ghs": float(t.total_amount_ghs),
            "status": t.status,
            "has_dispute": bool(t.buyer_dispute_reason or t.status == TransactionStatus.DISPUTED or t.dispute_retracted_at),
            "dispute_retracted": bool(t.dispute_retracted_at),
            "created_at": t.created_at.isoformat(),
            "shipping_address": t.shipping_address,
            "delivery_method": log.delivery_method if log else None,
            "courier_name": log.courier_name if log else None,
        })

    # Dispute History
    disputes_history = []
    for t in txns.filter(Q(buyer_dispute_reason__gt='') | Q(status=TransactionStatus.DISPUTED) | Q(dispute_retracted_at__isnull=False)):
        disputes_history.append({
            "id": str(t.id),
            "paystack_reference": t.paystack_reference,
            "title": t.link.title,
            "seller_id": str(t.link.seller.id),
            "seller_username": t.link.seller.username,
            "shop_name": t.link.seller.shop_name or f"@{t.link.seller.username}",
            "amount_ghs": float(t.total_amount_ghs),
            "status": t.status,
            "buyer_dispute_reason": t.buyer_dispute_reason,
            "seller_dispute_response": t.seller_dispute_response,
            "manager_dispute_notes": t.manager_dispute_notes,
            "dispute_retracted_at": t.dispute_retracted_at.isoformat() if t.dispute_retracted_at else None,
            "created_at": t.created_at.isoformat(),
        })

    user_data = None
    if user_account:
        user_data = {
            "id": str(user_account.id),
            "username": user_account.username,
            "email": user_account.email,
            "phone_number": user_account.phone_number,
            "role": user_account.role,
            "is_active": user_account.is_active,
            "is_suspended": getattr(user_account, 'is_suspended', False),
            "verification_status": getattr(user_account, 'verification_status', 'UNSUBMITTED'),
            "is_email_verified": getattr(user_account, 'is_email_verified', False),
            "is_phone_verified": getattr(user_account, 'is_phone_verified', False),
            "date_joined": user_account.date_joined.isoformat() if user_account.date_joined else None,
        }

    return {
        "buyer_name": user_account.get_full_name() if (user_account and user_account.get_full_name()) else (latest_txn.buyer_name if latest_txn else (user_account.username if user_account else 'Verified Buyer')),
        "buyer_phone": phone or (user_account.phone_number if user_account else (latest_txn.buyer_phone if latest_txn else '')),
        "buyer_email": email or (user_account.email if user_account else (latest_txn.buyer_email if latest_txn else '')),
        "is_registered_user": bool(user_account),
        "user_account": user_data,
        "summary": {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "active_escrow_orders": active_escrow,
            "disputed_orders": disputed_orders,
            "all_disputes_raised_count": all_disputes_raised,
            "retracted_disputes_count": retracted_disputes,
            "refunded_orders": refunded_orders,
            "cancelled_orders": cancelled_orders,
            "dispute_rate_pct": dispute_rate_pct,
            "total_spent_ghs": float(total_spent),
            "first_order_at": txns.last().created_at.isoformat() if txns.exists() else None,
            "last_order_at": latest_txn.created_at.isoformat() if latest_txn else None,
            "known_shipping_addresses": known_addresses,
        },
        "recent_transactions": recent_transactions,
        "disputes_history": disputes_history,
        "reviews_given": reviews_given,
    }

@admin_router.post("/broadcast-message")
def broadcast_message_admin(request, data: BroadcastMessageSchema):
    is_admin_user(request)
    from apps.notifications.models import BroadcastCampaign, BroadcastCampaignStatus
    from apps.core.tasks import process_broadcast_campaign_task
    import threading

    campaign = BroadcastCampaign.objects.create(
        subject=data.subject or "Notification from HendAxis Trust",
        message=data.message,
        target_group=data.target_group,
        channels=data.channels,
        custom_recipients=data.custom_recipients or '',
        created_by=request.user,
        status=BroadcastCampaignStatus.PENDING
    )

    queued_via_celery = False
    try:
        task_res = process_broadcast_campaign_task.delay(str(campaign.id))
        tid = getattr(task_res, 'id', '')
        if tid:
            campaign.celery_task_id = str(tid)
            campaign.save(update_fields=['celery_task_id'])
            queued_via_celery = True
    except Exception as e:
        logger.warning(f"Celery dispatch unavailable for campaign {campaign.id}: {e}. Falling back to async background thread.")

    if not queued_via_celery:
        thread = threading.Thread(
            target=process_broadcast_campaign_task.run,
            args=(str(campaign.id),),
            daemon=True
        )
        thread.start()

    return {
        "message": f"Broadcast campaign '{campaign.subject}' created and queued for delivery.",
        "campaign_id": str(campaign.id),
        "status": campaign.status
    }

@admin_router.get("/broadcast-campaigns")
def list_broadcast_campaigns(request):
    is_admin_user(request)
    from apps.notifications.models import BroadcastCampaign
    campaigns = BroadcastCampaign.objects.all()[:20]
    res = []
    for c in campaigns:
        res.append({
            "id": str(c.id),
            "subject": c.subject,
            "message": c.message,
            "target_group": c.target_group,
            "channels": c.channels,
            "status": c.status,
            "total_recipients": c.total_recipients,
            "sent_sms_count": c.sent_sms_count,
            "sent_email_count": c.sent_email_count,
            "failed_count": c.failed_count,
            "created_at": c.created_at.isoformat(),
            "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            "created_by": c.created_by.username if c.created_by else "Admin"
        })
    return res

@admin_router.post("/broadcast-campaigns/{campaign_id}/cancel")
def cancel_broadcast_campaign(request, campaign_id: uuid.UUID):
    is_admin_user(request)
    from apps.notifications.models import BroadcastCampaign, BroadcastCampaignStatus
    from hendaxis_trust.celery import app as celery_app
    from django.conf import settings

    campaign = get_object_or_404(BroadcastCampaign, id=campaign_id)
    if campaign.status in [BroadcastCampaignStatus.COMPLETED, BroadcastCampaignStatus.CANCELLED]:
        raise HttpError(400, f"Cannot cancel campaign in {campaign.status} status.")

    campaign.status = BroadcastCampaignStatus.CANCELLED
    campaign.save(update_fields=['status'])

    if campaign.celery_task_id and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
        try:
            celery_app.control.revoke(campaign.celery_task_id, terminate=True)
        except Exception as e:
            logger.warning(f"Could not revoke Celery task {campaign.celery_task_id}: {e}")

    return {
        "message": f"Broadcast campaign '{campaign.subject}' was successfully cancelled.",
        "campaign_id": str(campaign.id),
        "status": campaign.status
    }


class RejectVerificationSchema(Schema):
    reason: str

@admin_router.get("/verifications", response=List[dict])
def get_pending_seller_verifications(request):
    is_admin_user(request)
    from apps.users.models import User
    users = User.objects.exclude(verification_status='UNSUBMITTED').order_by('-date_joined')
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "email": u.email or "",
            "phone_number": u.phone_number,
            "shop_name": u.shop_name or f"@{u.username}'s Shop",
            "shop_description": u.shop_description or "",
            "shop_categories": u.shop_categories if isinstance(u.shop_categories, list) else [],
            "verification_status": u.verification_status,
            "national_id_number": u.national_id_number,
            "national_id_photo_url": u.national_id_photo_url,
            "business_license_photo_url": u.business_license_photo_url,
            "verification_rejection_reason": u.verification_rejection_reason,
            "verified_at": u.verified_at.isoformat() if u.verified_at else None,
            "joined_at": u.date_joined.isoformat()
        } for u in users
    ]

@admin_router.post("/verifications/{user_id}/approve", response=dict)
def approve_seller_verification(request, user_id: uuid.UUID):
    is_admin_user(request)
    from apps.users.models import User, VerificationStatus
    seller = get_object_or_404(User, id=user_id)
    from apps.users.models import VerificationStatus
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    from django.utils import timezone
    seller.verification_status = VerificationStatus.APPROVED
    seller.verified_at = timezone.now()
    seller.verification_rejection_reason = ""
    seller.save(update_fields=['verification_status', 'verified_at', 'verification_rejection_reason'])
    
    # Send SMS & Email notification to seller
    dispatch_sms_task.delay(
        seller.phone_number, 
        f"Congratulations! Your seller verification documents for {seller.shop_name or seller.username} have been approved by management. Your account has earned the Verified Seller badge."
    )
    if seller.email:
        dispatch_email_task.delay(
            seller.email,
            "Verification Approved - HendAxis Trust",
            f"Dear @{seller.username},\n\nYour identity and business verification documents have been officially approved by management. Your store now features the Verified Seller badge on all payment links and directory listings."
        )

    return {"message": f"Seller @{seller.username} has been verified and granted the Verified Seller badge."}

@admin_router.post("/verifications/{user_id}/reject", response=dict)
def reject_seller_verification(request, user_id: uuid.UUID, data: RejectVerificationSchema):
    is_admin_user(request)
    seller = get_object_or_404(User, id=user_id)
    from apps.users.models import VerificationStatus
    from apps.core.tasks import dispatch_sms_task
    seller.verification_status = VerificationStatus.REJECTED
    seller.verification_rejection_reason = data.reason or "Submitted documents were unclear or invalid."
    seller.save(update_fields=['verification_status', 'verification_rejection_reason'])

    dispatch_sms_task.delay(
        seller.phone_number,
        f"Your verification documents for {seller.shop_name or seller.username} were rejected. Reason: {seller.verification_rejection_reason}"
    )

    return {"message": f"Seller @{seller.username} verification rejected."}

@admin_router.post("/verifications/{user_id}/auto-verify", response=dict)
def auto_verify_seller_verification(request, user_id: uuid.UUID):
    is_admin_user(request)
    from apps.users.models import User, VerificationStatus
    from apps.users.ghana_card import verify_ghana_card
    from django.utils import timezone
    seller = get_object_or_404(User, id=user_id)

    if not seller.national_id_number:
        raise HttpError(400, f"Seller @{seller.username} has not submitted a Ghana Card number.")

    full_name = f"{seller.first_name} {seller.last_name}".strip() or seller.username
    is_verified, msg, _data = verify_ghana_card(
        card_number=seller.national_id_number,
        full_name=full_name,
        phone=seller.phone_number
    )

    if is_verified:
        seller.verification_status = VerificationStatus.APPROVED
        seller.verified_at = timezone.now()
        seller.verification_rejection_reason = ""
        seller.save(update_fields=['verification_status', 'verified_at', 'verification_rejection_reason'])
        return {"success": True, "message": f"Auto-verification succeeded! Seller @{seller.username} approved via NIA/Identity API."}
    else:
        return {"success": False, "message": f"Auto-verification failed: {msg}"}


@admin_router.get("/funds/accounts", response=dict)
def get_platform_accounts_summary(request):
    is_admin_user(request)
    from apps.ledger.models import LedgerAccount
    from django.db.models import Sum

    accounts = LedgerAccount.objects.all().select_related('user').order_by('account_type', 'name')

    sys_bank = LedgerAccount.objects.filter(name='SYSTEM_BANK_ASSET').aggregate(total=Sum('balance'))['total'] or 0
    buyer_escrow = LedgerAccount.objects.filter(name='BUYER_ESCROW_DEPOSIT').aggregate(total=Sum('balance'))['total'] or 0
    platform_revenue = LedgerAccount.objects.filter(name='PLATFORM_FEE_REVENUE').aggregate(total=Sum('balance'))['total'] or 0
    paystack_expense = LedgerAccount.objects.filter(name='PAYSTACK_FEE_EXPENSE').aggregate(total=Sum('balance'))['total'] or 0

    seller_wallets_total = LedgerAccount.objects.filter(
        name__startswith='SELLER_INTERNAL_WALLET'
    ).aggregate(total=Sum('balance'))['total'] or 0

    total_assets = sys_bank
    total_liabilities = buyer_escrow + seller_wallets_total
    total_revenue = platform_revenue
    total_expenses = paystack_expense
    net_profit = platform_revenue - paystack_expense

    account_list = []
    for acc in accounts:
        account_list.append({
            "id": str(acc.id),
            "name": acc.name,
            "account_type": acc.account_type,
            "balance": float(acc.balance),
            "user_username": acc.user.username if acc.user else None,
            "user_id": str(acc.user.id) if acc.user else None,
        })

    return {
        "summary": {
            "system_bank_asset_ghs": float(sys_bank),
            "buyer_escrow_deposit_ghs": float(buyer_escrow),
            "seller_wallets_liabilities_ghs": float(seller_wallets_total),
            "platform_revenue_ghs": float(platform_revenue),
            "paystack_expense_ghs": float(paystack_expense),
            "net_platform_profit_ghs": float(net_profit),
            "total_assets_ghs": float(total_assets),
            "total_liabilities_ghs": float(total_liabilities),
            "is_ledger_balanced": bool(total_assets >= total_liabilities)
        },
        "accounts": account_list
    }


@admin_router.get("/funds/ledger", response=dict)
def get_platform_ledger_entries(
    request, 
    entry_type: Optional[str] = None, 
    account_type: Optional[str] = None,
    account_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = 'timestamp',
    order: Optional[str] = 'desc',
    limit: int = 50,
    offset: int = 0
):
    is_admin_user(request)
    from apps.ledger.models import LedgerEntry
    from django.db.models import Q, Sum

    qs = LedgerEntry.objects.select_related('debit_account', 'credit_account').all()

    if entry_type and entry_type.upper() != 'ALL':
        qs = qs.filter(entry_type__iexact=entry_type.strip())

    if account_type and account_type.upper() != 'ALL':
        qs = qs.filter(
            Q(debit_account__account_type__iexact=account_type.strip()) |
            Q(credit_account__account_type__iexact=account_type.strip())
        )

    if account_id and account_id.strip():
        qs = qs.filter(
            Q(debit_account__id=account_id) |
            Q(credit_account__id=account_id) |
            Q(debit_account__name__icontains=account_id) |
            Q(credit_account__name__icontains=account_id)
        )

    if start_date:
        qs = qs.filter(timestamp__gte=start_date)

    if end_date:
        target_end = end_date
        if 'T' not in target_end and len(target_end) == 10:
            target_end = f"{target_end}T23:59:59"
        qs = qs.filter(timestamp__lte=target_end)

    if search and search.strip():
        q_str = search.strip()
        qs = qs.filter(
            Q(reference_id__icontains=q_str) |
            Q(entry_type__icontains=q_str) |
            Q(debit_account__name__icontains=q_str) |
            Q(credit_account__name__icontains=q_str)
        )

    # Sorting
    sort_field = 'timestamp'
    if sort_by in ['timestamp', 'amount_ghs', 'entry_type']:
        sort_field = sort_by
    elif sort_by == 'debit_account':
        sort_field = 'debit_account__name'
    elif sort_by == 'credit_account':
        sort_field = 'credit_account__name'

    if order == 'desc':
        sort_field = f"-{sort_field}"

    qs = qs.order_by(sort_field)

    total_count = qs.count()
    total_volume_ghs = qs.aggregate(total=Sum('amount_ghs'))['total'] or 0

    entries = list(qs[offset:offset+limit])

    items = [
        {
            "id": str(e.id),
            "reference_id": str(e.reference_id),
            "entry_type": e.entry_type,
            "debit_account_name": e.debit_account.name,
            "debit_account_type": e.debit_account.account_type,
            "credit_account_name": e.credit_account.name,
            "credit_account_type": e.credit_account.account_type,
            "amount_ghs": float(e.amount_ghs),
            "timestamp": e.timestamp.isoformat(),
            "payout_destination_type": e.payout_destination_type or "",
            "payout_account_number": e.payout_account_number or "",
            "payout_bank_name": e.payout_bank_name or "",
            "payout_bank_code": e.payout_bank_code or "",
            "payout_account_name": e.payout_account_name or "",
            "payout_name_matched": e.payout_name_matched,
            "payout_gateway": e.payout_gateway or "",
        } for e in entries
    ]

    return {
        "total_count": total_count,
        "total_volume_ghs": float(total_volume_ghs),
        "items": items
    }


# ─── Admin Platform Settings Controls ───────────────────────────────────────

from apps.escrow.models import PlatformSetting

DEFAULT_SYSTEM_SETTINGS = {
    "active_payment_gateway": "PAYSTACK",
    "enabled_delivery_methods": ["COURIER_API", "INFORMAL_BUS"],
    "enabled_carriers": ["DHL", "FEDEX", "UPS", "EMS", "SPEEDAF", "OTHERS"],
    "shipping_timeout_days": 4,
    "auto_delivery_hours": 48,
    "otp_reveal_delay_hours": 24,
    "return_dispatch_days": 2,
    "return_auto_refund_hours": 48,
    "unpaid_auto_archive_days": 3,
    "inspection_tier1_threshold": 2000.0,
    "inspection_tier1_hours": 24,
    "inspection_tier2_threshold": 10000.0,
    "inspection_tier2_hours": 48,
    "inspection_tier3_hours": 72,
    # Seller Rating Governance Thresholds
    "seller_rating_warning_threshold": 3.0,
    "seller_rating_suspension_threshold": 2.0,
    # Seller Dispute Rate Governance Thresholds
    "dispute_min_sample_size": 5,
    "dispute_alert_threshold": 20.0,
    "dispute_warning_threshold": 30.0,
    "dispute_suspension_threshold": 40.0,
    "dispute_retraction_release_hours": 24,
    # Seller Dispatch Expiry Governance Thresholds
    "dispatch_expiry_warning_threshold": 20.0,
    "dispatch_expiry_suspension_threshold": 35.0,
}


def get_platform_settings():
    admin_url = getattr(settings, 'DJANGO_ADMIN_URL', 'admin/').strip('/') + '/'
    try:
        setting = PlatformSetting.objects.filter(key="system_config").first()
        if not setting or not setting.value:
            res = DEFAULT_SYSTEM_SETTINGS.copy()
        else:
            res = DEFAULT_SYSTEM_SETTINGS.copy()
            res.update(setting.value)
        res['django_admin_url'] = admin_url
        return res
    except Exception:
        res = DEFAULT_SYSTEM_SETTINGS.copy()
        res['django_admin_url'] = admin_url
        return res


def get_inspection_hours_for_amount(amount) -> int:
    cfg = get_platform_settings()
    t1_thresh = float(cfg.get("inspection_tier1_threshold", 2000.0))
    t1_hrs = int(cfg.get("inspection_tier1_hours", 24))
    t2_thresh = float(cfg.get("inspection_tier2_threshold", 10000.0))
    t2_hrs = int(cfg.get("inspection_tier2_hours", 48))
    t3_hrs = int(cfg.get("inspection_tier3_hours", 72))

    amt_val = float(amount or 0)
    if amt_val < t1_thresh:
        return t1_hrs
    elif amt_val < t2_thresh:
        return t2_hrs
    else:
        return t3_hrs


class PublicPlatformSettingsSchema(Schema):
    active_payment_gateway: str
    enabled_delivery_methods: List[str]
    enabled_carriers: List[str]
    shipping_timeout_days: int = 4
    auto_delivery_hours: int = 48
    otp_reveal_delay_hours: int = 24
    return_dispatch_days: int = 2
    return_auto_refund_hours: int = 48
    unpaid_auto_archive_days: int = 3
    inspection_tier1_threshold: float = 2000.0
    inspection_tier1_hours: int = 24
    inspection_tier2_threshold: float = 10000.0
    inspection_tier2_hours: int = 48
    inspection_tier3_hours: int = 72
    seller_rating_warning_threshold: float = 3.0
    seller_rating_suspension_threshold: float = 2.0
    dispute_min_sample_size: int = 5
    dispute_alert_threshold: float = 20.0
    dispute_warning_threshold: float = 30.0
    dispute_suspension_threshold: float = 40.0
    dispute_retraction_release_hours: int = 24
    dispatch_expiry_warning_threshold: float = 20.0
    dispatch_expiry_suspension_threshold: float = 35.0


class PlatformSettingsSchema(Schema):
    active_payment_gateway: str
    enabled_delivery_methods: List[str]
    enabled_carriers: List[str]
    shipping_timeout_days: int = 4
    auto_delivery_hours: int = 48
    otp_reveal_delay_hours: int = 24
    return_dispatch_days: int = 2
    return_auto_refund_hours: int = 48
    unpaid_auto_archive_days: int = 3
    inspection_tier1_threshold: float = 2000.0
    inspection_tier1_hours: int = 24
    inspection_tier2_threshold: float = 10000.0
    inspection_tier2_hours: int = 48
    inspection_tier3_hours: int = 72
    seller_rating_warning_threshold: float = 3.0
    seller_rating_suspension_threshold: float = 2.0
    dispute_min_sample_size: int = 5
    dispute_alert_threshold: float = 20.0
    dispute_warning_threshold: float = 30.0
    dispute_suspension_threshold: float = 40.0
    dispute_retraction_release_hours: int = 24
    dispatch_expiry_warning_threshold: float = 20.0
    dispatch_expiry_suspension_threshold: float = 35.0
    django_admin_url: Optional[str] = 'admin/'


class UpdatePlatformSettingsSchema(Schema):
    active_payment_gateway: Optional[str] = None
    enabled_delivery_methods: Optional[List[str]] = None
    enabled_carriers: Optional[List[str]] = None
    shipping_timeout_days: Optional[int] = None
    auto_delivery_hours: Optional[int] = None
    otp_reveal_delay_hours: Optional[int] = None
    return_dispatch_days: Optional[int] = None
    return_auto_refund_hours: Optional[int] = None
    unpaid_auto_archive_days: Optional[int] = None
    inspection_tier1_threshold: Optional[float] = None
    inspection_tier1_hours: Optional[int] = None
    inspection_tier2_threshold: Optional[float] = None
    inspection_tier2_hours: Optional[int] = None
    inspection_tier3_hours: Optional[int] = None
    seller_rating_warning_threshold: Optional[float] = None
    seller_rating_suspension_threshold: Optional[float] = None
    dispute_min_sample_size: Optional[int] = None
    dispute_alert_threshold: Optional[float] = None
    dispute_warning_threshold: Optional[float] = None
    dispute_suspension_threshold: Optional[float] = None
    dispatch_expiry_warning_threshold: Optional[float] = None
    dispatch_expiry_suspension_threshold: Optional[float] = None



@escrow_router.get("/public-settings", response=PublicPlatformSettingsSchema, auth=None)
def get_public_settings(request):
    """Public endpoint to fetch current platform configuration (timeout days, delivery methods, carriers)."""
    return get_platform_settings()


@escrow_router.get("/admin/settings", response=PlatformSettingsSchema)
def get_admin_settings(request):
    """Retrieve current platform settings (Superuser only)."""
    from apps.core.permissions import is_superuser_user
    is_superuser_user(request)
    return get_platform_settings()


@escrow_router.post("/admin/settings", response=PlatformSettingsSchema)
def update_admin_settings(request, data: UpdatePlatformSettingsSchema):
    """Superuser endpoint to update active payment gateway, delivery channels/carriers, shipping timeouts & inspection tiers."""
    from apps.core.permissions import is_superuser_user
    user = is_superuser_user(request)

    current = get_platform_settings()
    if data.active_payment_gateway:
        gw = data.active_payment_gateway.upper()
        if gw not in ["PAYSTACK", "APPSNMOBILE", "HUBTEL"]:
            raise HttpError(400, "Invalid payment gateway choice.")
        current["active_payment_gateway"] = gw

    if data.enabled_delivery_methods is not None:
        current["enabled_delivery_methods"] = data.enabled_delivery_methods

    if data.enabled_carriers is not None:
        current["enabled_carriers"] = [c.upper() for c in data.enabled_carriers]

    if data.shipping_timeout_days is not None:
        current["shipping_timeout_days"] = max(1, data.shipping_timeout_days)

    if data.auto_delivery_hours is not None:
        current["auto_delivery_hours"] = max(1, data.auto_delivery_hours)

    if data.otp_reveal_delay_hours is not None:
        current["otp_reveal_delay_hours"] = max(0, data.otp_reveal_delay_hours)

    if data.return_dispatch_days is not None:
        current["return_dispatch_days"] = max(1, data.return_dispatch_days)

    if data.return_auto_refund_hours is not None:
        current["return_auto_refund_hours"] = max(1, data.return_auto_refund_hours)

    if data.unpaid_auto_archive_days is not None:
        current["unpaid_auto_archive_days"] = max(1, data.unpaid_auto_archive_days)


    if data.inspection_tier1_threshold is not None:
        current["inspection_tier1_threshold"] = float(data.inspection_tier1_threshold)

    if data.inspection_tier1_hours is not None:
        current["inspection_tier1_hours"] = max(1, data.inspection_tier1_hours)

    if data.inspection_tier2_threshold is not None:
        current["inspection_tier2_threshold"] = float(data.inspection_tier2_threshold)

    if data.inspection_tier2_hours is not None:
        current["inspection_tier2_hours"] = max(1, data.inspection_tier2_hours)

    if data.inspection_tier3_hours is not None:
        current["inspection_tier3_hours"] = max(1, data.inspection_tier3_hours)

    if data.seller_rating_warning_threshold is not None:
        warn_thresh = float(data.seller_rating_warning_threshold)
        if warn_thresh < 1.0 or warn_thresh > 5.0:
            raise HttpError(400, "seller_rating_warning_threshold must be between 1.0 and 5.0 stars.")
        current["seller_rating_warning_threshold"] = warn_thresh

    if data.seller_rating_suspension_threshold is not None:
        susp_thresh = float(data.seller_rating_suspension_threshold)
        if susp_thresh < 1.0 or susp_thresh > 5.0:
            raise HttpError(400, "seller_rating_suspension_threshold must be between 1.0 and 5.0 stars.")
        current["seller_rating_suspension_threshold"] = susp_thresh

    # Validate ordering: suspension threshold must be lower than warning threshold
    if float(current.get("seller_rating_suspension_threshold", 2.0)) >= float(current.get("seller_rating_warning_threshold", 3.0)):
        raise HttpError(400, "seller_rating_suspension_threshold must be strictly less than seller_rating_warning_threshold.")

    if data.dispute_min_sample_size is not None:
        current["dispute_min_sample_size"] = max(1, int(data.dispute_min_sample_size))

    if data.dispute_alert_threshold is not None:
        alert_val = float(data.dispute_alert_threshold)
        if alert_val < 1.0 or alert_val > 100.0:
            raise HttpError(400, "dispute_alert_threshold must be between 1.0% and 100.0%.")
        current["dispute_alert_threshold"] = alert_val

    if data.dispute_warning_threshold is not None:
        warn_val = float(data.dispute_warning_threshold)
        if warn_val < 1.0 or warn_val > 100.0:
            raise HttpError(400, "dispute_warning_threshold must be between 1.0% and 100.0%.")
        current["dispute_warning_threshold"] = warn_val

    if data.dispute_suspension_threshold is not None:
        susp_val = float(data.dispute_suspension_threshold)
        if susp_val < 1.0 or susp_val > 100.0:
            raise HttpError(400, "dispute_suspension_threshold must be between 1.0% and 100.0%.")
        current["dispute_suspension_threshold"] = susp_val

    # Validate dispute thresholds ordering: alert < warning < suspension
    cur_alert = float(current.get("dispute_alert_threshold", 20.0))
    cur_warn = float(current.get("dispute_warning_threshold", 30.0))
    cur_susp = float(current.get("dispute_suspension_threshold", 40.0))
    if not (cur_alert < cur_warn < cur_susp):
        raise HttpError(400, "Dispute thresholds must strictly satisfy: Alert Rate < Warning Rate < Auto-Suspension Rate.")

    if data.dispatch_expiry_warning_threshold is not None:
        d_warn = float(data.dispatch_expiry_warning_threshold)
        if d_warn < 1.0 or d_warn > 100.0:
            raise HttpError(400, "dispatch_expiry_warning_threshold must be between 1.0% and 100.0%.")
        current["dispatch_expiry_warning_threshold"] = d_warn

    if data.dispatch_expiry_suspension_threshold is not None:
        d_susp = float(data.dispatch_expiry_suspension_threshold)
        if d_susp < 1.0 or d_susp > 100.0:
            raise HttpError(400, "dispatch_expiry_suspension_threshold must be between 1.0% and 100.0%.")
        current["dispatch_expiry_suspension_threshold"] = d_susp

    cur_d_warn = float(current.get("dispatch_expiry_warning_threshold", 20.0))
    cur_d_susp = float(current.get("dispatch_expiry_suspension_threshold", 35.0))
    if cur_d_warn >= cur_d_susp:
        raise HttpError(400, "dispatch_expiry_warning_threshold must be strictly less than dispatch_expiry_suspension_threshold.")

    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = current
    setting.save()

    return current


class AdvanceStatusSchema(Schema):
    target_status: str


@escrow_router.post("/admin/transactions/{transaction_id}/advance-status", response=MessageResponse)
def advance_transaction_status(request, transaction_id: uuid.UUID, data: AdvanceStatusSchema):
    """
    Dev & Admin endpoint to forcibly transition a transaction to any state during testing.
    """
    from apps.core.permissions import is_admin_user
    is_admin_user(request)

    transaction = get_object_or_404(Transaction.objects.select_related('link', 'link__seller'), id=transaction_id)
    target = data.target_status.upper()

    if target not in [s.value for s in TransactionStatus]:
        raise HttpError(400, f"Invalid target status '{target}'.")

    old_status = transaction.status

    if target == TransactionStatus.PAYMENT_RECEIVED:
        transaction.status = TransactionStatus.PAYMENT_RECEIVED
        transaction.save(update_fields=['status', 'updated_at'])
        from apps.ledger.services import record_buyer_deposit
        try:
            record_buyer_deposit(reference_id=str(transaction.id), gross_amount=transaction.total_amount_ghs, gateway_fee=transaction.total_amount_ghs * Decimal('0.0195'))
        except Exception:
            pass

    elif target == TransactionStatus.DELIVERY_IN_PROGRESS:
        from apps.delivery.services import transition_to_delivery
        from apps.delivery.models import DeliveryLog, DeliveryMethod, CarrierChoice
        from apps.delivery.tracking import generate_carrier_tracking_url

        if transaction.status == TransactionStatus.AWAITING_PAYMENT:
            transaction.status = TransactionStatus.PAYMENT_RECEIVED
            transaction.save(update_fields=['status', 'updated_at'])

        transition_to_delivery(transaction)
        if not transaction.delivery_logs.exists():
            DeliveryLog.objects.create(
                transaction=transaction,
                delivery_method=DeliveryMethod.COURIER_API,
                courier_name="DHL Express (Dev Test)",
                carrier_code=CarrierChoice.DHL,
                tracking_number="DEV123456789",
                carrier_tracking_url=generate_carrier_tracking_url('DHL', 'DEV123456789')
            )

    elif target == TransactionStatus.INSPECTION_PERIOD:
        from apps.delivery.services import transition_to_inspection
        if transaction.status == TransactionStatus.AWAITING_PAYMENT:
            transaction.status = TransactionStatus.PAYMENT_RECEIVED
            transaction.save(update_fields=['status', 'updated_at'])
        if transaction.status == TransactionStatus.PAYMENT_RECEIVED:
            from apps.delivery.services import transition_to_delivery
            transition_to_delivery(transaction)
        transition_to_inspection(transaction)

    elif target == TransactionStatus.COMPLETED:
        if transaction.status != TransactionStatus.INSPECTION_PERIOD:
            transaction.status = TransactionStatus.INSPECTION_PERIOD
            transaction.save(update_fields=['status', 'updated_at'])
        transaction.status = TransactionStatus.COMPLETED
        transaction.save(update_fields=['status', 'updated_at'])
        execute_payout_for_transaction(transaction)

    else:
        transaction.status = target
        transaction.save(update_fields=['status', 'updated_at'])

    return {"message": f"Transaction state successfully advanced from {old_status} to {target}."}


@admin_router.get("/ad-invoices", response=dict)
def list_admin_ad_invoices(request, search: Optional[str] = None, limit: int = 50, offset: int = 0):
    is_admin_user(request)
    from apps.reviews.models import ShopAdInvoice
    from django.db.models import Q

    qs = ShopAdInvoice.objects.select_related('seller').all().order_by('-created_at')

    if search and search.strip():
        q_str = search.strip()
        qs = qs.filter(
            Q(invoice_number__icontains=q_str) |
            Q(reference_code__icontains=q_str) |
            Q(seller__username__icontains=q_str) |
            Q(seller__email__icontains=q_str) |
            Q(seller__phone_number__icontains=q_str)
        )

    total_count = qs.count()
    invoices_page = list(qs[offset:offset + limit])

    items = [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "seller_id": str(inv.seller.id),
            "seller_username": inv.seller.username,
            "seller_email": inv.seller.email or "",
            "seller_phone": inv.seller.phone_number or "",
            "duration_days": inv.duration_days,
            "amount_ghs": float(inv.amount_ghs),
            "payment_method": inv.payment_method,
            "reference_code": inv.reference_code,
            "advertised_from": inv.advertised_from.isoformat(),
            "advertised_until": inv.advertised_until.isoformat(),
            "created_at": inv.created_at.isoformat()
        } for inv in invoices_page
    ]

    return {
        "total_count": total_count,
        "items": items
    }


@admin_router.post("/ad-invoices/{invoice_id}/resend-email", response=dict)
def admin_resend_ad_invoice_email(request, invoice_id: uuid.UUID):
    is_admin_user(request)
    from apps.reviews.models import ShopAdInvoice
    from apps.reviews.services import send_ad_invoice_email

    invoice = get_object_or_404(ShopAdInvoice.objects.select_related('seller'), id=invoice_id)
    
    if not invoice.seller or not invoice.seller.email:
        raise HttpError(400, "Seller associated with this invoice does not have a valid email address.")

    sent = send_ad_invoice_email(invoice)
    if not sent:
        raise HttpError(400, "Failed to send invoice email.")

    return {
        "message": f"Official invoice receipt #{invoice.invoice_number} has been resent to {invoice.seller.email}."
    }



