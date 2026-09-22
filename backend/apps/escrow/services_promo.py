import re
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from typing import Optional, Tuple, Dict, Any

from django.db import transaction as db_transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.escrow.models import (
    BuyerIdentity,
    BuyerCreditEntryType,
    BuyerCreditLedgerEntry,
    SellerRewardEntryType,
    SellerRewardLedgerEntry,
    PromoCode,
    PromoDiscountType,
    PromoEligibleRole,
    PromoRedemption,
    SeasonalFeeCampaign,
    SeasonalFeeRuleType,
    TransactionRewardCampaign,
    RewardTargetRole,
    RewardCalculationType,
    Transaction,
    PlatformSetting,
)
from apps.users.models import User

logger = logging.getLogger(__name__)


# ─── Phone & Email Normalization ──────────────────────────────────────────────

def normalize_phone_number(raw_phone: str) -> str:
    """
    Normalizes Ghanaian and international phone numbers to canonical format (+233XXXXXXXXX or international E.164).
    Examples:
      '024 123 4567'    -> '+233241234567'
      '0241234567'      -> '+233241234567'
      '+233 24 1234567' -> '+233241234567'
      '233241234567'    -> '+233241234567'
    """
    if not raw_phone:
        return ""
    
    cleaned = re.sub(r'[\s\-\(\)\.]', '', str(raw_phone).strip())
    
    if cleaned.startswith('+'):
        return cleaned
    
    if cleaned.startswith('00'):
        return '+' + cleaned[2:]
        
    if cleaned.startswith('0') and len(cleaned) == 10:
        return '+233' + cleaned[1:]
        
    if cleaned.startswith('233') and len(cleaned) == 12:
        return '+' + cleaned
        
    return cleaned


def normalize_email(raw_email: str) -> str:
    if not raw_email:
        return ""
    return raw_email.strip().lower()


def get_or_create_buyer_identity(phone: str, email: str = '', name: str = '') -> BuyerIdentity:
    """
    Retrieves or atomically creates a persistent BuyerIdentity anchored on the normalized phone number.
    """
    norm_phone = normalize_phone_number(phone)
    norm_email = normalize_email(email)
    clean_name = (name or '').strip()

    if not norm_phone:
        raise ValueError("A valid phone number is required to resolve buyer identity.")

    with db_transaction.atomic():
        buyer, created = BuyerIdentity.objects.get_or_create(
            phone_number=norm_phone,
            defaults={
                'primary_email': norm_email,
                'name': clean_name,
                'available_credit_ghs': Decimal('0.00'),
                'lifetime_credit_earned_ghs': Decimal('0.00'),
                'lifetime_credit_redeemed_ghs': Decimal('0.00'),
            }
        )

        update_fields = []
        if norm_email and not buyer.primary_email:
            buyer.primary_email = norm_email
            update_fields.append('primary_email')
            
        if clean_name and not buyer.name:
            buyer.name = clean_name
            update_fields.append('name')

        if update_fields:
            buyer.save(update_fields=update_fields)

    return buyer


# ─── Promotion Settings Helpers ───────────────────────────────────────────────

def get_promotions_config() -> Dict[str, Any]:
    """
    Fetches global platform promotion configuration from PlatformSetting.
    """
    setting = PlatformSetting.objects.filter(key="system_config").first()
    cfg = setting.value if setting and isinstance(setting.value, dict) else {}
    
    now = timezone.now()
    raw_expires = cfg.get("promotions_expires_at")
    is_active = bool(cfg.get("promotions_active", False))

    if is_active and raw_expires:
        try:
            from django.utils.dateparse import parse_datetime
            expiry_dt = parse_datetime(raw_expires)
            if expiry_dt and expiry_dt <= now:
                is_active = False
        except Exception:
            pass

    return {
        "promotions_active": is_active,
        "promotions_expires_at": raw_expires,
        "buyer_reward_rate_percent": float(cfg.get("buyer_reward_rate_percent", 1.0)),
        "buyer_credit_validity_days": int(cfg.get("buyer_credit_validity_days", 90)),
        "seller_reward_per_completed_order_ghs": float(cfg.get("seller_reward_per_completed_order_ghs", 2.00)),
        "seller_credit_validity_days": int(cfg.get("seller_credit_validity_days", 180)),
        "max_promo_discount_cap_ghs": float(cfg.get("max_promo_discount_cap_ghs", 25.00)),
    }


# ─── Authoritative Server-Side Pricing Engine ─────────────────────────────────

def get_active_seasonal_fee_campaign(gross_total: Decimal) -> Optional[SeasonalFeeCampaign]:
    """
    Retrieves the current active SeasonalFeeCampaign if one exists for the given order volume.
    """
    now = timezone.now()
    return SeasonalFeeCampaign.objects.filter(
        is_active=True,
        start_date__lte=now,
        end_date__gte=now,
        min_order_amount_ghs__lte=gross_total
    ).order_by('-created_at').first()


def calculate_order_pricing(
    price_ghs: Decimal,
    shipping_fee_ghs: Decimal,
    fee_handling: str,
    promo_code_str: Optional[str] = None,
    buyer_credit_to_redeem_ghs: Decimal = Decimal('0.00'),
    seller_credit_to_redeem_ghs: Decimal = Decimal('0.00'),
    buyer_identity: Optional[BuyerIdentity] = None,
    seller_user: Optional[User] = None,
) -> Dict[str, Any]:
    """
    Single authoritative pricing calculation engine for HendAxis Trust.
    Guarantees that:
      1. Platform fee is exactly (Gross * 1.5%) + GHS 10.00.
      2. Seasonal fee waivers, promo discounts & credits ONLY reduce the Platform Escrow Fee.
      3. Merchandise price and shipping fee are 100% sacred and never reduced.
      4. Total fee subsidy cannot exceed the base platform fee.
    """
    price = Decimal(str(price_ghs or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    shipping = Decimal(str(shipping_fee_ghs or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    gross_merchandise_total = price + shipping

    # 1. Base Platform Escrow Fee (1.5% + GHS 10.00)
    base_platform_fee = ((gross_merchandise_total * Decimal('0.015')) + Decimal('10.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    config = get_promotions_config()
    is_promotions_enabled = config["promotions_active"]
    max_global_cap = Decimal(str(config["max_promo_discount_cap_ghs"]))

    # 2. Seasonal / Festive Platform Fee Campaign Evaluation
    seasonal_campaign = get_active_seasonal_fee_campaign(gross_merchandise_total)
    seasonal_fee_discount_ghs = Decimal('0.00')

    if seasonal_campaign:
        rule_type = seasonal_campaign.fee_rule_type
        val = seasonal_campaign.rule_value
        if rule_type == SeasonalFeeRuleType.WAIVED:
            raw_seasonal = base_platform_fee
        elif rule_type == SeasonalFeeRuleType.REDUCED_PERCENTAGE:
            new_var = gross_merchandise_total * (val / Decimal('100.00'))
            raw_seasonal = max(Decimal('0.00'), (gross_merchandise_total * Decimal('0.015')) - new_var)
        elif rule_type == SeasonalFeeRuleType.REDUCED_FIXED:
            raw_seasonal = max(Decimal('0.00'), Decimal('10.00') - val)
        elif rule_type == SeasonalFeeRuleType.PERCENTAGE_DISCOUNT:
            raw_seasonal = base_platform_fee * (val / Decimal('100.00'))
        elif rule_type == SeasonalFeeRuleType.FIXED_DISCOUNT:
            raw_seasonal = val
        else:
            raw_seasonal = Decimal('0.00')

        if seasonal_campaign.max_discount_cap_ghs:
            raw_seasonal = min(raw_seasonal, seasonal_campaign.max_discount_cap_ghs)

        seasonal_fee_discount_ghs = min(raw_seasonal, base_platform_fee).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    remaining_fee_capacity = max(Decimal('0.00'), base_platform_fee - seasonal_fee_discount_ghs)

    # 3. Evaluate Promo Code (if active and provided)
    promo_obj: Optional[PromoCode] = None
    promo_discount_ghs = Decimal('0.00')
    promo_error: Optional[str] = None

    if promo_code_str and is_promotions_enabled:
        code_clean = promo_code_str.strip().upper()
        now = timezone.now()
        promo_obj = PromoCode.objects.filter(code__iexact=code_clean, is_active=True).first()
        if not promo_obj:
            promo_error = "Invalid or inactive promo code."
        else:
            effective_usage = max(promo_obj.usage_count, promo_obj.redemptions.count())
            if promo_obj.expires_at and promo_obj.expires_at <= now:
                promo_error = "This promo code has expired."
            elif promo_obj.usage_limit and effective_usage >= promo_obj.usage_limit:
                promo_error = "This promo code is no longer valid."
            elif gross_merchandise_total < promo_obj.min_order_amount_ghs:
                promo_error = f"Minimum order of GHS {promo_obj.min_order_amount_ghs:.2f} required to use code {promo_obj.code}."
            elif buyer_identity and promo_obj.per_buyer_limit:
                prev_uses = PromoRedemption.objects.filter(
                    promo_code=promo_obj,
                    buyer_identity=buyer_identity
                ).count()
                if prev_uses >= promo_obj.per_buyer_limit:
                    promo_error = f"You have already redeemed promo code {promo_obj.code} the maximum allowed times."

            if not promo_error:
                # Calculate discount
                if promo_obj.discount_type == PromoDiscountType.PERCENTAGE:
                    raw_disc = (base_platform_fee * (promo_obj.discount_value / Decimal('100.00')))
                else: # FIXED_GHS
                    raw_disc = promo_obj.discount_value

                # Apply code cap and global cap
                effective_cap = min(promo_obj.max_discount_cap_ghs or max_global_cap, max_global_cap)
                promo_discount_ghs = min(raw_disc, effective_cap, remaining_fee_capacity).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                remaining_fee_capacity = max(Decimal('0.00'), remaining_fee_capacity - promo_discount_ghs)

    # 4. Evaluate Buyer Credit Redemption (Loyalty Credit)
    credit_discount_ghs = Decimal('0.00')
    buyer_req = Decimal(str(buyer_credit_to_redeem_ghs or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if buyer_req > Decimal('0.00') and is_promotions_enabled:
        available_buyer_credit = buyer_identity.available_credit_ghs if buyer_identity else Decimal('0.00')
        applicable_buyer_credit = min(buyer_req, available_buyer_credit, remaining_fee_capacity)
        credit_discount_ghs += applicable_buyer_credit
        remaining_fee_capacity = max(Decimal('0.00'), remaining_fee_capacity - applicable_buyer_credit)

    # 5. Evaluate Seller Fee Offset (when fee_handling == ABSORB_FEE)
    seller_fee_offset_applied_ghs = Decimal('0.00')
    if fee_handling == 'ABSORB_FEE':
        available_seller_credit = getattr(seller_user, 'wallet_bonus_credits_ghs', Decimal('0.00')) if seller_user else Decimal('0.00')
        if available_seller_credit and available_seller_credit > Decimal('0.00'):
            seller_req = Decimal(str(seller_credit_to_redeem_ghs or '0.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            # If explicit request is 0, auto-offset up to remaining capacity
            applicable_seller_offset = min(seller_req if seller_req > 0 else available_seller_credit, available_seller_credit, remaining_fee_capacity)
            seller_fee_offset_applied_ghs = applicable_seller_offset
            remaining_fee_capacity = max(Decimal('0.00'), remaining_fee_capacity - applicable_seller_offset)

    # 6. Total Platform Fee Subsidy & Effective Fee
    total_fee_subsidy_ghs = min(
        base_platform_fee,
        seasonal_fee_discount_ghs + promo_discount_ghs + credit_discount_ghs + seller_fee_offset_applied_ghs
    )
    effective_platform_fee = max(Decimal('0.00'), (base_platform_fee - total_fee_subsidy_ghs).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    # 7. Final Payable & Payout Amounts
    if fee_handling == 'PASS_TO_BUYER':
        total_buyer_pays = gross_merchandise_total + effective_platform_fee
        net_seller_receives = gross_merchandise_total
    else: # ABSORB_FEE
        total_buyer_pays = gross_merchandise_total
        net_seller_receives = gross_merchandise_total - effective_platform_fee

    return {
        "is_promotions_enabled": is_promotions_enabled,
        "gross_merchandise_total": gross_merchandise_total,
        "base_platform_fee": base_platform_fee,
        "seasonal_fee_campaign": seasonal_campaign,
        "seasonal_campaign_name": seasonal_campaign.name if seasonal_campaign else None,
        "seasonal_fee_discount_ghs": seasonal_fee_discount_ghs,
        "promo_code_applied": promo_obj.code if (promo_obj and not promo_error) else None,
        "promo_discount_ghs": promo_discount_ghs,
        "credit_discount_ghs": credit_discount_ghs,
        "seller_fee_offset_applied_ghs": seller_fee_offset_applied_ghs,
        "total_fee_subsidy_ghs": total_fee_subsidy_ghs,
        "effective_platform_fee": effective_platform_fee,
        "total_buyer_pays": total_buyer_pays,
        "net_seller_receives": net_seller_receives,
        "promo_error": promo_error
    }


# ─── Buyer Credit Ledger Transactions ─────────────────────────────────────────

@db_transaction.atomic
def reserve_buyer_credit(buyer: BuyerIdentity, amount_ghs: Decimal, reference_id: str) -> bool:
    """
    Atomically locks and reserves buyer promotional credit during checkout.
    """
    amount = Decimal(str(amount_ghs)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if amount <= Decimal('0.00'):
        return True

    b_locked = BuyerIdentity.objects.select_for_update().get(id=buyer.id)
    if b_locked.available_credit_ghs < amount:
        raise ValidationError(f"Insufficient credit balance (Available: GHS {b_locked.available_credit_ghs:.2f})")

    b_locked.available_credit_ghs -= amount
    b_locked.save(update_fields=['available_credit_ghs', 'updated_at'])

    BuyerCreditLedgerEntry.objects.create(
        buyer=b_locked,
        amount_ghs=amount,
        entry_type=BuyerCreditEntryType.RESERVED,
        reference_id=reference_id,
        notes=f"Reserved GHS {amount:.2f} for checkout ref {reference_id}"
    )
    return True


@db_transaction.atomic
def redeem_buyer_credit(buyer: BuyerIdentity, amount_ghs: Decimal, transaction: Transaction) -> bool:
    """
    Permanently redeems reserved promotional credit upon successful payment authorization.
    """
    amount = Decimal(str(amount_ghs)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if amount <= Decimal('0.00'):
        return True

    b_locked = BuyerIdentity.objects.select_for_update().get(id=buyer.id)
    b_locked.lifetime_credit_redeemed_ghs += amount
    b_locked.save(update_fields=['lifetime_credit_redeemed_ghs', 'updated_at'])

    BuyerCreditLedgerEntry.objects.create(
        buyer=b_locked,
        amount_ghs=amount,
        entry_type=BuyerCreditEntryType.REDEEMED,
        reference_id=str(transaction.id),
        notes=f"Redeemed GHS {amount:.2f} on Transaction {transaction.id}"
    )
    return True


@db_transaction.atomic
def apply_transaction_promotions_on_payment(transaction: Transaction):
    """
    Atomically processes promo code redemptions and finalizes buyer loyalty credits upon payment confirmation.
    1. If transaction has a promo_code, creates a PromoRedemption record and increments PromoCode.usage_count.
    2. If transaction has credit_discount_ghs, finalizes the reserved buyer credit ledger entry.
    Idempotent: Safe against multiple triggers.
    """
    from django.db.models import F

    # 1. Promo Code Redemption & Usage Counter
    if transaction.promo_code:
        disc = transaction.promo_discount_ghs or Decimal('0.00')
        if not PromoRedemption.objects.filter(transaction=transaction, promo_code=transaction.promo_code).exists():
            PromoRedemption.objects.create(
                promo_code=transaction.promo_code,
                transaction=transaction,
                buyer_identity=transaction.buyer_identity,
                seller=getattr(getattr(transaction, 'link', None), 'seller', None),
                discount_applied_ghs=disc
            )
            PromoCode.objects.filter(id=transaction.promo_code.id).update(
                usage_count=F('usage_count') + 1
            )
            try:
                transaction.promo_code.refresh_from_db(fields=['usage_count'])
            except Exception:
                pass

    # 2. Buyer Loyalty Credit Redemption Finalization
    if transaction.credit_discount_ghs and transaction.credit_discount_ghs > Decimal('0.00') and transaction.buyer_identity:
        credit_ref = str(transaction.id)
        if not BuyerCreditLedgerEntry.objects.filter(reference_id=credit_ref, entry_type=BuyerCreditEntryType.REDEEMED).exists():
            redeem_buyer_credit(transaction.buyer_identity, transaction.credit_discount_ghs, transaction)


@db_transaction.atomic
def release_reserved_buyer_credit(buyer: BuyerIdentity, amount_ghs: Decimal, reference_id: str) -> bool:
    """
    Restores reserved credit if a checkout attempt was abandoned or failed.
    """
    amount = Decimal(str(amount_ghs)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if amount <= Decimal('0.00'):
        return True

    b_locked = BuyerIdentity.objects.select_for_update().get(id=buyer.id)
    b_locked.available_credit_ghs += amount
    b_locked.save(update_fields=['available_credit_ghs', 'updated_at'])

    BuyerCreditLedgerEntry.objects.create(
        buyer=b_locked,
        amount_ghs=amount,
        entry_type=BuyerCreditEntryType.RELEASED,
        reference_id=reference_id,
        notes=f"Released reserved GHS {amount:.2f} from abandoned/failed checkout {reference_id}"
    )
    return True


# ─── Post-Completion Promotional Reward Grants ────────────────────────────────

@db_transaction.atomic
def award_buyer_loyalty_reward(transaction: Transaction) -> Optional[Decimal]:
    """
    Awards loyalty reward credit to guest buyer upon verified transaction completion.
    Idempotent: Database reference check prevents duplicate reward issues.
    """
    config = get_promotions_config()
    if not config["promotions_active"]:
        return None

    if not transaction.buyer_phone:
        return None

    ref_key = f"TX_BUYER_REWARD_{transaction.id}"
    if BuyerCreditLedgerEntry.objects.filter(reference_id=ref_key).exists():
        logger.info(f"Buyer loyalty reward already granted for Tx {transaction.id}")
        return None

    rate_percent = Decimal(str(config["buyer_reward_rate_percent"]))
    reward_amount = (transaction.total_amount_ghs * (rate_percent / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    if reward_amount <= Decimal('0.00'):
        return None

    buyer = transaction.buyer_identity or get_or_create_buyer_identity(
        phone=transaction.buyer_phone,
        email=transaction.buyer_email,
        name=transaction.buyer_name
    )

    if not transaction.buyer_identity:
        transaction.buyer_identity = buyer
        transaction.save(update_fields=['buyer_identity'])

    b_locked = BuyerIdentity.objects.select_for_update().get(id=buyer.id)
    b_locked.available_credit_ghs += reward_amount
    b_locked.lifetime_credit_earned_ghs += reward_amount
    b_locked.save(update_fields=['available_credit_ghs', 'lifetime_credit_earned_ghs', 'updated_at'])

    validity_days = config["buyer_credit_validity_days"]
    expires_at = timezone.now() + timedelta(days=validity_days)

    BuyerCreditLedgerEntry.objects.create(
        buyer=b_locked,
        amount_ghs=reward_amount,
        entry_type=BuyerCreditEntryType.EARNED,
        reference_id=ref_key,
        expires_at=expires_at,
        notes=f"Earned {rate_percent}% loyalty credit on Order {transaction.paystack_reference}"
    )

    logger.info(f"Awarded GHS {reward_amount:.2f} loyalty credit to buyer {b_locked.phone_number} on Tx {transaction.id}")

    # Notify buyer
    try:
        from apps.core.tasks import dispatch_sms_task
        msg = f"🎉 HendAxis Trust: You've earned GHS {reward_amount:.2f} in loyalty credit from your recent completed order! Use it on your next escrow purchase."
        dispatch_sms_task.delay(b_locked.phone_number, msg)
    except Exception as e:
        logger.warning(f"Failed to dispatch buyer reward SMS: {e}")

    return reward_amount


@db_transaction.atomic
def award_seller_milestone_reward(transaction: Transaction) -> Optional[Decimal]:
    """
    Awards milestone fee credit to seller upon verified transaction completion.
    """
    config = get_promotions_config()
    if not config["promotions_active"]:
        return None

    seller = getattr(transaction.link, 'seller', None)
    if not seller:
        return None

    ref_key = f"TX_SELLER_REWARD_{transaction.id}"
    if SellerRewardLedgerEntry.objects.filter(reference_id=ref_key).exists():
        return None

    reward_amount = Decimal(str(config["seller_reward_per_completed_order_ghs"])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if reward_amount <= Decimal('0.00'):
        return None

    s_locked = User.objects.select_for_update().get(id=seller.id)
    s_locked.wallet_bonus_credits_ghs = (s_locked.wallet_bonus_credits_ghs or Decimal('0.00')) + reward_amount
    s_locked.save(update_fields=['wallet_bonus_credits_ghs'])

    validity_days = config["seller_credit_validity_days"]
    expires_at = timezone.now() + timedelta(days=validity_days)

    SellerRewardLedgerEntry.objects.create(
        seller=s_locked,
        amount_ghs=reward_amount,
        entry_type=SellerRewardEntryType.EARNED,
        reference_id=ref_key,
        expires_at=expires_at,
        notes=f"Earned GHS {reward_amount:.2f} fee credit on completed Order {transaction.paystack_reference}"
    )

    logger.info(f"Awarded GHS {reward_amount:.2f} seller fee credit to @{s_locked.username} on Tx {transaction.id}")
    return reward_amount


@db_transaction.atomic
def award_transaction_reward_campaigns(transaction: Transaction) -> list:
    """
    Evaluates all active TransactionRewardCampaigns upon transaction completion.
    Credits seller fee offset bonus and/or buyer loyalty credits.
    """
    now = timezone.now()
    active_campaigns = TransactionRewardCampaign.objects.filter(
        is_active=True,
        min_order_amount_ghs__lte=transaction.total_amount_ghs
    )

    eligible_campaigns = []
    for camp in active_campaigns:
        if camp.start_date and camp.start_date > now:
            continue
        if camp.end_date and camp.end_date < now:
            continue
        eligible_campaigns.append(camp)

    awarded = []
    seller = getattr(getattr(transaction, 'link', None), 'seller', None)

    for camp in eligible_campaigns:
        # 1. Seller Reward
        if camp.target_role in [RewardTargetRole.SELLER, RewardTargetRole.ALL] and seller:
            ref_key = f"TX_REWARD_CAMP_{camp.id}_{transaction.id}_SELLER"
            if not SellerRewardLedgerEntry.objects.filter(reference_id=ref_key).exists():
                if camp.reward_type == RewardCalculationType.FIXED_GHS:
                    raw_reward = camp.reward_value
                elif camp.reward_type == RewardCalculationType.PERCENTAGE_OF_ORDER:
                    raw_reward = transaction.total_amount_ghs * (camp.reward_value / Decimal('100.00'))
                else: # PERCENTAGE_OF_FEE
                    base_fee = transaction.platform_fee_ghs + (transaction.promo_discount_ghs or Decimal('0.00')) + (transaction.seasonal_fee_discount_ghs or Decimal('0.00')) + (transaction.seller_fee_offset_applied_ghs or Decimal('0.00'))
                    raw_reward = base_fee * (camp.reward_value / Decimal('100.00'))

                if camp.max_reward_cap_ghs:
                    raw_reward = min(raw_reward, camp.max_reward_cap_ghs)

                reward_amt = Decimal(str(raw_reward)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if reward_amt > Decimal('0.00'):
                    s_locked = User.objects.select_for_update().get(id=seller.id)
                    s_locked.wallet_bonus_credits_ghs = (s_locked.wallet_bonus_credits_ghs or Decimal('0.00')) + reward_amt
                    s_locked.save(update_fields=['wallet_bonus_credits_ghs'])

                    expires_at = now + timedelta(days=camp.validity_days)
                    SellerRewardLedgerEntry.objects.create(
                        seller=s_locked,
                        amount_ghs=reward_amt,
                        entry_type=SellerRewardEntryType.EARNED,
                        reference_id=ref_key,
                        expires_at=expires_at,
                        notes=f"Earned GHS {reward_amt:.2f} fee credit via Campaign '{camp.name}' on Order {transaction.paystack_reference}"
                    )
                    awarded.append(f"Seller Reward: GHS {reward_amt:.2f} from {camp.name}")

        # 2. Buyer Reward
        if camp.target_role in [RewardTargetRole.BUYER, RewardTargetRole.ALL] and transaction.buyer_phone:
            ref_key = f"TX_REWARD_CAMP_{camp.id}_{transaction.id}_BUYER"
            if not BuyerCreditLedgerEntry.objects.filter(reference_id=ref_key).exists():
                if camp.reward_type == RewardCalculationType.FIXED_GHS:
                    raw_reward = camp.reward_value
                elif camp.reward_type == RewardCalculationType.PERCENTAGE_OF_ORDER:
                    raw_reward = transaction.total_amount_ghs * (camp.reward_value / Decimal('100.00'))
                else: # PERCENTAGE_OF_FEE
                    base_fee = transaction.platform_fee_ghs + (transaction.promo_discount_ghs or Decimal('0.00')) + (transaction.seasonal_fee_discount_ghs or Decimal('0.00')) + (transaction.seller_fee_offset_applied_ghs or Decimal('0.00'))
                    raw_reward = base_fee * (camp.reward_value / Decimal('100.00'))

                if camp.max_reward_cap_ghs:
                    raw_reward = min(raw_reward, camp.max_reward_cap_ghs)

                reward_amt = Decimal(str(raw_reward)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if reward_amt > Decimal('0.00'):
                    buyer = transaction.buyer_identity or get_or_create_buyer_identity(
                        phone=transaction.buyer_phone,
                        email=transaction.buyer_email,
                        name=transaction.buyer_name
                    )
                    b_locked = BuyerIdentity.objects.select_for_update().get(id=buyer.id)
                    b_locked.available_credit_ghs += reward_amt
                    b_locked.lifetime_credit_earned_ghs += reward_amt
                    b_locked.save(update_fields=['available_credit_ghs', 'lifetime_credit_earned_ghs', 'updated_at'])

                    expires_at = now + timedelta(days=camp.validity_days)
                    BuyerCreditLedgerEntry.objects.create(
                        buyer=b_locked,
                        amount_ghs=reward_amt,
                        entry_type=BuyerCreditEntryType.EARNED,
                        reference_id=ref_key,
                        expires_at=expires_at,
                        notes=f"Earned GHS {reward_amt:.2f} credit via Campaign '{camp.name}' on Order {transaction.paystack_reference}"
                    )
                    awarded.append(f"Buyer Reward: GHS {reward_amt:.2f} from {camp.name}")

    return awarded


@db_transaction.atomic
def reverse_promotional_rewards(transaction: Transaction):
    """
    Handles refund / cancellation reversal of promotional discounts and rewards.
    """
    # 1. Restore redeemed buyer credit if transaction is refunded
    if transaction.credit_discount_ghs > Decimal('0.00') and transaction.buyer_identity:
        amount = transaction.credit_discount_ghs
        b_locked = BuyerIdentity.objects.select_for_update().get(id=transaction.buyer_identity.id)
        b_locked.available_credit_ghs += amount
        b_locked.save(update_fields=['available_credit_ghs', 'updated_at'])

        BuyerCreditLedgerEntry.objects.create(
            buyer=b_locked,
            amount_ghs=amount,
            entry_type=BuyerCreditEntryType.REVERSED,
            reference_id=str(transaction.id),
            notes=f"Restored GHS {amount:.2f} redeemed credit due to transaction refund"
        )
        logger.info(f"Restored GHS {amount:.2f} credit to buyer {b_locked.phone_number} on refund of Tx {transaction.id}")

    # 2. Restore seller fee offset credits if refunded
    if transaction.seller_fee_offset_applied_ghs > Decimal('0.00'):
        seller = getattr(getattr(transaction, 'link', None), 'seller', None)
        if seller:
            s_locked = User.objects.select_for_update().get(id=seller.id)
            s_locked.wallet_bonus_credits_ghs = (s_locked.wallet_bonus_credits_ghs or Decimal('0.00')) + transaction.seller_fee_offset_applied_ghs
            s_locked.save(update_fields=['wallet_bonus_credits_ghs'])

            SellerRewardLedgerEntry.objects.create(
                seller=s_locked,
                amount_ghs=transaction.seller_fee_offset_applied_ghs,
                entry_type=SellerRewardEntryType.REVERSED,
                reference_id=str(transaction.id),
                notes=f"Restored GHS {transaction.seller_fee_offset_applied_ghs:.2f} fee credit due to transaction refund"
            )
            logger.info(f"Restored GHS {transaction.seller_fee_offset_applied_ghs:.2f} fee credit to seller @{seller.username} on refund of Tx {transaction.id}")
