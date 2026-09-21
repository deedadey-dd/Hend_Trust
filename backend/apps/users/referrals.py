import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction as db_transaction
from apps.users.models import User, Referral, ReferralStatus

logger = logging.getLogger(__name__)

DEFAULT_REFERRER_REWARD_GHS = Decimal('15.00')
DEFAULT_REFEREE_REWARD_GHS = Decimal('10.00')


def get_referral_config() -> dict:
    """
    Fetches dynamic platform referral configuration from PlatformSetting.
    """
    from apps.escrow.models import PlatformSetting
    setting = PlatformSetting.objects.filter(key="referral_config").first()
    cfg = setting.value if setting and isinstance(setting.value, dict) else {}
    return {
        "referral_program_active": bool(cfg.get("referral_program_active", True)),
        "referrer_reward_ghs": Decimal(str(cfg.get("referrer_reward_ghs", DEFAULT_REFERRER_REWARD_GHS))),
        "referee_reward_ghs": Decimal(str(cfg.get("referee_reward_ghs", DEFAULT_REFEREE_REWARD_GHS))),
        "min_order_amount_for_referral_ghs": Decimal(str(cfg.get("min_order_amount_for_referral_ghs", "0.00"))),
        "max_referrals_per_user": int(cfg.get("max_referrals_per_user", 0)),
    }


def save_referral_config(data: dict) -> dict:
    """
    Persists updated dynamic referral configuration to PlatformSetting.
    """
    from apps.escrow.models import PlatformSetting
    cfg = {
        "referral_program_active": bool(data.get("referral_program_active", True)),
        "referrer_reward_ghs": str(Decimal(str(data.get("referrer_reward_ghs", DEFAULT_REFERRER_REWARD_GHS))).quantize(Decimal('0.01'))),
        "referee_reward_ghs": str(Decimal(str(data.get("referee_reward_ghs", DEFAULT_REFEREE_REWARD_GHS))).quantize(Decimal('0.01'))),
        "min_order_amount_for_referral_ghs": str(Decimal(str(data.get("min_order_amount_for_referral_ghs", "0.00"))).quantize(Decimal('0.01'))),
        "max_referrals_per_user": int(data.get("max_referrals_per_user", 0)),
    }
    PlatformSetting.objects.update_or_create(
        key="referral_config",
        defaults={"value": cfg}
    )
    return get_referral_config()


def get_user_referral_stats(user: User) -> dict:
    """
    Returns aggregated referral metrics and recent referrals for the user dashboard.
    """
    if not user.referral_code:
        user.save()

    cfg = get_referral_config()

    referrals_qs = Referral.objects.filter(referrer=user).select_related('referred_user').order_by('-created_at')
    total_count = referrals_qs.count()
    completed_count = referrals_qs.filter(status=ReferralStatus.COMPLETED).count()
    pending_count = referrals_qs.filter(status=ReferralStatus.PENDING).count()

    total_earned = sum(
        (ref.reward_amount_ghs for ref in referrals_qs if ref.status == ReferralStatus.COMPLETED),
        Decimal('0.00')
    )

    recent_list = []
    for ref in referrals_qs[:10]:
        recent_list.append({
            "id": str(ref.id),
            "referee_username": ref.referred_user.username,
            "status": ref.status,
            "reward_amount_ghs": float(ref.reward_amount_ghs),
            "created_at": ref.created_at.isoformat(),
            "rewarded_at": ref.rewarded_at.isoformat() if ref.rewarded_at else None,
        })

    return {
        "referral_code": user.referral_code or "",
        "wallet_bonus_credits_ghs": float(user.wallet_bonus_credits_ghs or 0.0),
        "total_referrals": total_count,
        "completed_referrals": completed_count,
        "pending_referrals": pending_count,
        "total_earned_ghs": float(total_earned),
        "reward_per_referral_ghs": float(cfg["referrer_reward_ghs"]),
        "referee_bonus_ghs": float(cfg["referee_reward_ghs"]),
        "referral_program_active": cfg["referral_program_active"],
        "min_order_amount_for_referral_ghs": float(cfg["min_order_amount_for_referral_ghs"]),
        "recent_referrals": recent_list,
    }


def apply_referral_code(user: User, code: str) -> dict:
    """
    Applies a referral code to a user who doesn't yet have an attributed referrer.
    """
    cfg = get_referral_config()
    if not cfg["referral_program_active"]:
        return {"success": False, "message": "The referral program is currently not active."}

    clean_code = (code or "").strip()
    if not clean_code:
        return {"success": False, "message": "Please provide a valid referral code."}

    if user.referred_by:
        return {"success": False, "message": "You have already applied a referral code."}

    if user.referral_code and user.referral_code.upper() == clean_code.upper():
        return {"success": False, "message": "You cannot use your own referral code."}

    referrer = User.objects.filter(referral_code__iexact=clean_code).first()
    if not referrer:
        return {"success": False, "message": "Invalid referral code. Please verify and try again."}

    if referrer.id == user.id:
        return {"success": False, "message": "You cannot use your own referral code."}

    # Check max referrals limit per user if configured
    max_refs = cfg["max_referrals_per_user"]
    if max_refs > 0:
        existing_refs_count = Referral.objects.filter(referrer=referrer).count()
        if existing_refs_count >= max_refs:
            return {"success": False, "message": "This referral code has reached its maximum global redemptions."}

    # Check if a Referral record already exists
    if Referral.objects.filter(referred_user=user).exists():
        return {"success": False, "message": "Referral tracking is already linked to your account."}

    with db_transaction.atomic():
        user.referred_by = referrer
        user.save(update_fields=['referred_by'])

        Referral.objects.create(
            referrer=referrer,
            referred_user=user,
            code_used=clean_code.upper(),
            status=ReferralStatus.PENDING,
            reward_amount_ghs=cfg["referrer_reward_ghs"],
            referee_discount_ghs=cfg["referee_reward_ghs"],
        )

    logger.info(f"Referral applied: User {user.username} referred by {referrer.username} via code {clean_code}")
    return {
        "success": True,
        "message": f"Referral code applied! You and @{referrer.username} will both receive rewards upon your first qualifying completed transaction.",
        "referrer_username": referrer.username,
    }


def process_transaction_referral_rewards(transaction) -> list:
    """
    Triggered when a transaction reaches COMPLETED state.
    Checks if the seller or buyer has a PENDING referral and awards credits.
    """
    cfg = get_referral_config()
    if not cfg["referral_program_active"]:
        return []

    min_order = cfg["min_order_amount_for_referral_ghs"]
    if transaction.total_amount_ghs < min_order:
        logger.info(f"Transaction {transaction.id} amount (GHS {transaction.total_amount_ghs}) below min referral threshold (GHS {min_order})")
        return []

    rewarded = []

    # 1. Check Seller
    seller = getattr(getattr(transaction, 'link', None), 'seller', None)
    if seller:
        seller_ref = Referral.objects.filter(
            referred_user=seller,
            status=ReferralStatus.PENDING
        ).first()

        if seller_ref:
            _award_referral(seller_ref, transaction)
            rewarded.append(f"Seller Referral ({seller_ref.referrer.username} -> {seller.username})")

    # 2. Check Buyer (if registered)
    buyer_user = None
    if transaction.buyer_phone:
        buyer_user = User.objects.filter(phone_number=transaction.buyer_phone).first()
    if not buyer_user and transaction.buyer_email:
        buyer_user = User.objects.filter(email__iexact=transaction.buyer_email).first()

    if buyer_user and buyer_user != seller:
        buyer_ref = Referral.objects.filter(
            referred_user=buyer_user,
            status=ReferralStatus.PENDING
        ).first()

        if buyer_ref:
            _award_referral(buyer_ref, transaction)
            rewarded.append(f"Buyer Referral ({buyer_ref.referrer.username} -> {buyer_user.username})")

    return rewarded


def _award_referral(referral: Referral, transaction):
    """
    Executes the atomic credit of referral bonus to both parties and logs audit ledger entries.
    """
    now = timezone.now()
    with db_transaction.atomic():
        referral.status = ReferralStatus.COMPLETED
        referral.completed_transaction = transaction
        referral.rewarded_at = now
        referral.save(update_fields=['status', 'completed_transaction', 'rewarded_at'])

        # Credit Referrer
        referrer = referral.referrer
        referrer.wallet_bonus_credits_ghs = (referrer.wallet_bonus_credits_ghs or Decimal('0.00')) + referral.reward_amount_ghs
        referrer.save(update_fields=['wallet_bonus_credits_ghs'])

        # Create SellerRewardLedgerEntry for Referrer
        try:
            from apps.escrow.models import SellerRewardLedgerEntry, SellerRewardEntryType
            ref_order_str = transaction.paystack_reference if transaction else str(referral.id)
            SellerRewardLedgerEntry.objects.create(
                seller=referrer,
                amount_ghs=referral.reward_amount_ghs,
                entry_type=SellerRewardEntryType.REFERRAL_BONUS,
                reference_id=f"REF_BONUS_{referral.id}_{ref_order_str}",
                notes=f"Referral reward earned from @{referral.referred_user.username}'s first completed order ({ref_order_str})"
            )
        except Exception as err:
            logger.warning(f"Failed to create referrer reward ledger entry: {err}")

        # Credit Referee
        referee = referral.referred_user
        referee.wallet_bonus_credits_ghs = (referee.wallet_bonus_credits_ghs or Decimal('0.00')) + referral.referee_discount_ghs
        referee.save(update_fields=['wallet_bonus_credits_ghs'])

        # Create SellerRewardLedgerEntry for Referee
        try:
            from apps.escrow.models import SellerRewardLedgerEntry, SellerRewardEntryType
            SellerRewardLedgerEntry.objects.create(
                seller=referee,
                amount_ghs=referral.referee_discount_ghs,
                entry_type=SellerRewardEntryType.REFERRAL_BONUS,
                reference_id=f"REF_WELCOME_{referral.id}_{ref_order_str}",
                notes=f"Welcome bonus credit from referral by @{referrer.username} on first order ({ref_order_str})"
            )
        except Exception as err:
            logger.warning(f"Failed to create referee reward ledger entry: {err}")

        logger.info(
            f"Referral rewarded! Referrer @{referrer.username} earned +GHS {referral.reward_amount_ghs}, "
            f"Referee @{referee.username} earned +GHS {referral.referee_discount_ghs} on Tx {transaction.id}"
        )


def validate_public_referral_code(code: str) -> dict:
    """
    Validates a referral code or phone number and returns the referrer identity preview.
    """
    cfg = get_referral_config()
    if not cfg["referral_program_active"]:
        return {
            "valid": False,
            "message": "The platform referral program is currently disabled."
        }

    clean_code = (code or "").strip()
    if not clean_code:
        return {
            "valid": False,
            "message": "Please provide a referral code or phone number."
        }

    # 1. Match by referral_code
    referrer = User.objects.filter(referral_code__iexact=clean_code).first()

    # 2. Match by username
    if not referrer:
        referrer = User.objects.filter(username__iexact=clean_code).first()

    # 3. Match by phone number
    if not referrer:
        normalized_phone = clean_code
        if not normalized_phone.startswith('+') and not normalized_phone.startswith('0'):
            normalized_phone = f"+{normalized_phone}"
        referrer = User.objects.filter(phone_number__icontains=clean_code).first()

    if not referrer:
        return {
            "valid": False,
            "message": f"Referral code '{clean_code}' is not recognized."
        }

    display_name = referrer.get_full_name() or referrer.username
    return {
        "valid": True,
        "referrer_username": referrer.username,
        "referrer_name": display_name,
        "referral_code": referrer.referral_code or referrer.username,
        "welcome_bonus_ghs": float(cfg["referee_reward_ghs"]),
        "referrer_reward_ghs": float(cfg["referrer_reward_ghs"]),
        "message": f"Valid referral from @{referrer.username}! You will both receive GHS {cfg['referee_reward_ghs']} rewards on your first qualifying trade."
    }


def get_buyer_phone_referral_stats(phone_number: str) -> dict:
    """
    Retrieves or calculates referral statistics and credit wallet balance for a buyer identified by phone.
    """
    clean_phone = (phone_number or "").strip()
    if not clean_phone:
        return {
            "success": False,
            "message": "Phone number is required."
        }

    cfg = get_referral_config()

    # Find or link BuyerIdentity
    from apps.escrow.models import BuyerIdentity, BuyerCreditLedgerEntry
    buyer_ident = BuyerIdentity.objects.filter(phone_number=clean_phone).first()
    if not buyer_ident:
        buyer_ident = BuyerIdentity.objects.filter(phone_number__icontains=clean_phone[-9:]).first()

    available_credit = float(buyer_ident.available_credit_ghs) if buyer_ident else 0.0

    # Look up registered user with same phone if any
    matching_user = User.objects.filter(phone_number=clean_phone).first()
    if not matching_user and buyer_ident:
        matching_user = User.objects.filter(phone_number=buyer_ident.phone_number).first()

    referrals_qs = []
    if matching_user:
        referrals_qs = list(Referral.objects.filter(referrer=matching_user).select_related('referred_user').order_by('-created_at'))
        if matching_user.wallet_bonus_credits_ghs:
            available_credit = max(available_credit, float(matching_user.wallet_bonus_credits_ghs))

    total_count = len(referrals_qs)
    completed_count = sum(1 for r in referrals_qs if r.status == ReferralStatus.COMPLETED)
    pending_count = sum(1 for r in referrals_qs if r.status == ReferralStatus.PENDING)
    total_earned = sum(float(r.reward_amount_ghs) for r in referrals_qs if r.status == ReferralStatus.COMPLETED)

    # Clean sharing code
    user_ref_code = matching_user.referral_code if matching_user else clean_phone.replace('+', '')

    # Fetch recent buyer credit ledger
    credit_history = []
    if buyer_ident:
        entries = BuyerCreditLedgerEntry.objects.filter(buyer=buyer_ident).order_by('-created_at')[:10]
        for e in entries:
            credit_history.append({
                "id": str(e.id),
                "amount_ghs": float(e.amount_ghs),
                "entry_type": e.entry_type,
                "notes": e.notes,
                "created_at": e.created_at.isoformat()
            })

    return {
        "success": True,
        "phone_number": clean_phone,
        "referral_code": user_ref_code,
        "available_credit_ghs": available_credit,
        "total_referrals": total_count,
        "completed_referrals": completed_count,
        "pending_referrals": pending_count,
        "total_earned_ghs": total_earned,
        "reward_per_referral_ghs": float(cfg["referrer_reward_ghs"]),
        "referee_bonus_ghs": float(cfg["referee_reward_ghs"]),
        "referral_program_active": cfg["referral_program_active"],
        "credit_history": credit_history,
        "recent_referrals": [
            {
                "id": str(r.id),
                "referee_username": r.referred_user.username,
                "status": r.status,
                "reward_amount_ghs": float(r.reward_amount_ghs),
                "created_at": r.created_at.isoformat(),
                "rewarded_at": r.rewarded_at.isoformat() if r.rewarded_at else None,
            }
            for r in referrals_qs[:10]
        ]
    }


def get_seller_rewards_breakdown(user: User) -> dict:
    """
    Returns itemized promotional earnings and platform fee offset redemption breakdown for a seller.
    """
    from apps.escrow.models import SellerRewardLedgerEntry, SellerRewardEntryType
    entries = SellerRewardLedgerEntry.objects.filter(seller=user).order_by('-created_at')

    total_earned = Decimal('0.00')
    total_redeemed = Decimal('0.00')
    referral_rewards = Decimal('0.00')
    campaign_rewards = Decimal('0.00')
    admin_grants = Decimal('0.00')

    history_list = []
    import re
    ref_pattern = re.compile(r'(?:HT-TX-[A-Za-z0-9_-]+|HT-[A-Za-z0-9_-]+|TXN-[A-Za-z0-9_-]+)')

    for e in entries:
        amt = e.amount_ghs
        if e.entry_type in [SellerRewardEntryType.EARNED, SellerRewardEntryType.REFERRAL_BONUS, SellerRewardEntryType.ADMIN_GRANT]:
            total_earned += amt
            if e.entry_type == SellerRewardEntryType.REFERRAL_BONUS:
                referral_rewards += amt
            elif e.entry_type == SellerRewardEntryType.ADMIN_GRANT:
                admin_grants += amt
            else:
                campaign_rewards += amt
        elif e.entry_type == SellerRewardEntryType.REDEEMED:
            total_redeemed += amt

        # Find clean order reference in reference_id or notes
        found_ref = None
        matched_refs = ref_pattern.findall(f"{e.reference_id} {e.notes}")
        if matched_refs:
            found_ref = matched_refs[0]

        history_list.append({
            "id": str(e.id),
            "amount_ghs": float(e.amount_ghs),
            "entry_type": e.entry_type,
            "reference_id": e.reference_id,
            "order_reference": found_ref,
            "notes": e.notes,
            "expires_at": e.expires_at.isoformat() if e.expires_at else None,
            "created_at": e.created_at.isoformat()
        })

    available_balance = float(user.wallet_bonus_credits_ghs or Decimal('0.00'))

    return {
        "available_balance_ghs": available_balance,
        "total_earned_ghs": float(total_earned),
        "total_redeemed_ghs": float(total_redeemed),
        "breakdown": {
            "referral_rewards_ghs": float(referral_rewards),
            "transaction_campaigns_ghs": float(campaign_rewards),
            "admin_grants_ghs": float(admin_grants),
        },
        "history": history_list
    }

