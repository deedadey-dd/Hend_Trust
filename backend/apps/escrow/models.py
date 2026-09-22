import secrets
import uuid6
from django.db import models
from apps.links.models import PaymentLink

def generate_uuid7():
    return uuid6.uuid7()

class TransactionStatus(models.TextChoices):
    AWAITING_PAYMENT = 'AWAITING_PAYMENT', 'Awaiting Payment'
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED', 'Payment Received'
    DELIVERY_IN_PROGRESS = 'DELIVERY_IN_PROGRESS', 'Delivery In Progress'
    INSPECTION_PERIOD = 'INSPECTION_PERIOD', 'Inspection Period'
    COMPLETED = 'COMPLETED', 'Completed'
    DISPUTED = 'DISPUTED', 'Disputed'
    RETURN_IN_PROGRESS = 'RETURN_IN_PROGRESS', 'Return In Progress'
    CANCELLED = 'CANCELLED', 'Cancelled'
    REFUNDED = 'REFUNDED', 'Refunded'


class BuyerIdentity(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    primary_email = models.EmailField(blank=True, db_index=True)
    name = models.CharField(max_length=255, blank=True)
    
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    
    available_credit_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    lifetime_credit_earned_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    lifetime_credit_redeemed_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Buyer {self.phone_number} (GHS {self.available_credit_ghs} credit)"


class BuyerCreditEntryType(models.TextChoices):
    EARNED = 'EARNED', 'Loyalty Reward Earned'
    REFERRAL_BONUS = 'REFERRAL_BONUS', 'Referral Bonus'
    ADMIN_GRANT = 'ADMIN_GRANT', 'Admin Discretionary Grant'
    RESERVED = 'RESERVED', 'Reserved for Checkout'
    REDEEMED = 'REDEEMED', 'Redeemed at Checkout'
    RELEASED = 'RELEASED', 'Released from Abandoned Checkout'
    EXPIRED = 'EXPIRED', 'Expired'
    REVERSED = 'REVERSED', 'Reversed on Refund'


class BuyerCreditLedgerEntry(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    buyer = models.ForeignKey(BuyerIdentity, on_delete=models.CASCADE, related_name='credit_ledger_entries')
    amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    entry_type = models.CharField(max_length=30, choices=BuyerCreditEntryType.choices)
    reference_id = models.CharField(max_length=150, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"BuyerCredit {self.entry_type} | GHS {self.amount_ghs} | {self.buyer.phone_number}"


class SellerRewardEntryType(models.TextChoices):
    EARNED = 'EARNED', 'Milestone Fee Reward Earned'
    REFERRAL_BONUS = 'REFERRAL_BONUS', 'Referral Bonus'
    ADMIN_GRANT = 'ADMIN_GRANT', 'Admin Discretionary Grant'
    REDEEMED = 'REDEEMED', 'Redeemed to Offset Platform Fee'
    EXPIRED = 'EXPIRED', 'Expired'
    REVERSED = 'REVERSED', 'Reversed on Refund'


class SellerRewardLedgerEntry(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    seller = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='reward_ledger_entries')
    amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    entry_type = models.CharField(max_length=30, choices=SellerRewardEntryType.choices)
    reference_id = models.CharField(max_length=150, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SellerReward {self.entry_type} | GHS {self.amount_ghs} | @{self.seller.username}"


class PromoDiscountType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', 'Percentage on Platform Fee'
    FIXED_GHS = 'FIXED_GHS', 'Fixed Amount (GHS)'


class PromoEligibleRole(models.TextChoices):
    ALL = 'ALL', 'All Users & Buyers'
    BUYER_ONLY = 'BUYER_ONLY', 'Buyers Only'
    SELLER_ONLY = 'SELLER_ONLY', 'Sellers Only'


class PromoCode(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    code = models.CharField(max_length=30, unique=True, db_index=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=PromoDiscountType.choices, default=PromoDiscountType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount_cap_ghs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_order_amount_ghs = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    usage_limit = models.IntegerField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    per_buyer_limit = models.IntegerField(default=1)
    eligible_role = models.CharField(max_length=20, choices=PromoEligibleRole.choices, default=PromoEligibleRole.ALL)
    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_promo_codes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Promo {self.code} ({self.discount_value}{'%' if self.discount_type == PromoDiscountType.PERCENTAGE else ' GHS'})"


class SeasonalFeeRuleType(models.TextChoices):
    WAIVED = 'WAIVED', '100% Waived (Zero Platform Fee)'
    REDUCED_PERCENTAGE = 'REDUCED_PERCENTAGE', 'Reduced Variable Fee %'
    REDUCED_FIXED = 'REDUCED_FIXED', 'Reduced Fixed Fee GHS'
    PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT', 'Percentage Discount on Total Fee'
    FIXED_DISCOUNT = 'FIXED_DISCOUNT', 'Fixed GHS Discount on Total Fee'


class SeasonalFeeCampaign(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    name = models.CharField(max_length=150, db_index=True)
    description = models.TextField(blank=True)
    fee_rule_type = models.CharField(max_length=30, choices=SeasonalFeeRuleType.choices, default=SeasonalFeeRuleType.WAIVED)
    rule_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    min_order_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    max_discount_cap_ghs = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateTimeField(db_index=True)
    end_date = models.DateTimeField(db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_seasonal_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"Seasonal Campaign {self.name} ({self.fee_rule_type})"


class RewardTargetRole(models.TextChoices):
    SELLER = 'SELLER', 'Sellers Only'
    BUYER = 'BUYER', 'Buyers Only'
    ALL = 'ALL', 'All Participants'


class RewardCalculationType(models.TextChoices):
    FIXED_GHS = 'FIXED_GHS', 'Fixed Amount (GHS) per Order'
    PERCENTAGE_OF_ORDER = 'PERCENTAGE_OF_ORDER', 'Percentage of Order Total'
    PERCENTAGE_OF_FEE = 'PERCENTAGE_OF_FEE', 'Percentage of Platform Fee'


class TransactionRewardCampaign(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    name = models.CharField(max_length=150, db_index=True)
    description = models.TextField(blank=True)
    target_role = models.CharField(max_length=20, choices=RewardTargetRole.choices, default=RewardTargetRole.SELLER)
    reward_type = models.CharField(max_length=30, choices=RewardCalculationType.choices, default=RewardCalculationType.FIXED_GHS)
    reward_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    max_reward_cap_ghs = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    validity_days = models.IntegerField(default=180)
    start_date = models.DateTimeField(null=True, blank=True, db_index=True)
    end_date = models.DateTimeField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_reward_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reward Campaign {self.name} ({self.target_role}: {self.reward_value})"


class Transaction(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    link = models.ForeignKey(PaymentLink, on_delete=models.PROTECT, related_name='transactions')
    buyer_identity = models.ForeignKey(BuyerIdentity, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    buyer_name = models.CharField(max_length=255, blank=True)
    buyer_phone = models.CharField(max_length=20, db_index=True)
    buyer_email = models.EmailField(blank=True, db_index=True)
    shipping_address = models.TextField(blank=True)
    total_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Promotional discounts applied
    promo_code = models.ForeignKey(PromoCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    promo_discount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    credit_discount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    seasonal_fee_campaign = models.ForeignKey(
        SeasonalFeeCampaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    seasonal_fee_discount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    seller_fee_offset_applied_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    status = models.CharField(max_length=30, choices=TransactionStatus.choices, default=TransactionStatus.AWAITING_PAYMENT, db_index=True)
    paystack_reference = models.CharField(max_length=100, unique=True, db_index=True)
    buyer_review_token: models.CharField | str = models.CharField(max_length=64, blank=True, db_index=True)
    
    # State tracking timestamps
    dispatched_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    inspection_starts_at = models.DateTimeField(null=True, blank=True)
    return_dispatched_at = models.DateTimeField(null=True, blank=True)

    # 6-digit confirmation code shared by seller → buyer to confirm delivery
    delivery_confirmation_code = models.CharField(max_length=6, blank=True)

    # Return tracking logistics fields
    return_delivery_method = models.CharField(max_length=30, blank=True)
    return_courier_name = models.CharField(max_length=100, blank=True)
    return_tracking_number = models.CharField(max_length=100, blank=True)
    return_carrier_tracking_url = models.TextField(blank=True)
    return_driver_phone = models.CharField(max_length=20, blank=True)
    return_driver_car_number = models.CharField(max_length=50, blank=True)
    return_destination_station = models.CharField(max_length=255, blank=True)
    return_confirmation_code = models.CharField(max_length=6, blank=True)  # Reverse Pickup OTP
    return_waybill_photo_url = models.TextField(blank=True)
    
    # Reminder tracking
    reminder_24h_dispatch_sent = models.BooleanField(default=False)
    reminder_6h_dispatch_sent = models.BooleanField(default=False)
    reminder_30h_sent = models.BooleanField(default=False)
    reminder_36h_sent = models.BooleanField(default=False)
    reminder_42h_sent = models.BooleanField(default=False)
    reminder_6h_inspection_sent = models.BooleanField(default=False)
    auto_cancelled_non_dispatch = models.BooleanField(default=False, db_index=True)
    # Dispute Evidence & Resolution Photos (Max 5 photos per party)
    buyer_dispute_reason = models.TextField(blank=True)
    buyer_dispute_photos = models.JSONField(default=list, blank=True)
    seller_dispute_response = models.TextField(blank=True)
    seller_dispute_photos = models.JSONField(default=list, blank=True)
    manager_dispute_notes = models.TextField(blank=True)
    manager_dispute_photos = models.JSONField(default=list, blank=True)
    dispute_retracted_at = models.DateTimeField(null=True, blank=True)
    assigned_arbiter = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_dispute_transactions'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['status', 'is_archived', 'created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.buyer_review_token:
            self.buyer_review_token = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Tx {self.id} | {self.status} | {self.total_amount_ghs} GHS"


class PromoRedemption(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    promo_code = models.ForeignKey(PromoCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='redemptions')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='promo_redemptions')
    buyer_identity = models.ForeignKey(BuyerIdentity, on_delete=models.SET_NULL, null=True, blank=True, related_name='promo_redemptions')
    seller = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='seller_promo_redemptions')
    discount_applied_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        code_str = self.promo_code.code if self.promo_code else "Direct Credit"
        return f"Redemption {code_str} | GHS {self.discount_applied_ghs} on Tx {self.transaction.id}"


class PlatformSetting(models.Model):
    objects = models.Manager()

    key = models.CharField(max_length=50, primary_key=True)
    value = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Setting: {self.key}"


class DisputeActionType(models.TextChoices):
    ASSIGNED = 'ASSIGNED', 'Arbiter Assigned'
    MESSAGE_APPENDED = 'MESSAGE_APPENDED', 'Message / Evidence Appended'
    RELEASE_TO_SELLER = 'RELEASE_TO_SELLER', 'Released to Seller'
    FULL_REFUND_TO_BUYER = 'FULL_REFUND_TO_BUYER', 'Full Refund to Buyer'
    PARTIAL_REFUND_TO_BUYER = 'PARTIAL_REFUND_TO_BUYER', 'Partial Refund Settlement'
    REQUIRE_RETURN_FROM_BUYER = 'REQUIRE_RETURN_FROM_BUYER', 'Return Required From Buyer'
    RETRACTED_CONFIRMED = 'RETRACTED_CONFIRMED', 'Retraction Confirmed'


class DisputeResolutionAction(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='resolution_actions')
    arbiter = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='arbiter_dispute_actions')
    action_type = models.CharField(max_length=40, choices=DisputeActionType.choices, db_index=True)
    admin_notes = models.TextField(blank=True)
    manager_photos = models.JSONField(default=list, blank=True)
    refund_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    seller_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    platform_retained_fee_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        arbiter_name = self.arbiter.username if self.arbiter else "System"
        return f"Action {self.action_type} on Tx {self.transaction_id} by @{arbiter_name}"


class ArbiterActivityType(models.TextChoices):
    DISPUTE_RESOLVED = 'DISPUTE_RESOLVED', 'Dispute Resolved'
    COMPLIANCE_REVIEW = 'COMPLIANCE_REVIEW', 'Compliance Review Completed'
    MEDIATION_INTERVENTION = 'MEDIATION_INTERVENTION', 'Mediation Intervention'


class ArbiterPayoutStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved for Payout'
    PAID = 'PAID', 'Paid / Settled'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ArbiterPayoutBatch(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    batch_reference = models.CharField(max_length=100, unique=True, db_index=True)
    arbiter = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='payout_batches')
    finance_admin = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_arbiter_payout_batches')
    total_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    activity_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('FAILED', 'Failed')], default='PAID')
    payout_method = models.CharField(max_length=20, default='MOMO')
    payout_account_details = models.JSONField(default=dict, blank=True)
    payment_reference = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PayoutBatch {self.batch_reference} - GHS {self.total_amount_ghs} to @{self.arbiter.username}"


class ArbiterActivityLog(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    arbiter = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='arbiter_activity_logs')
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='arbiter_activity_logs')
    resolution_action = models.ForeignKey(DisputeResolutionAction, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    activity_type = models.CharField(max_length=40, choices=ArbiterActivityType.choices, default=ArbiterActivityType.DISPUTE_RESOLVED, db_index=True)
    fee_rate_ghs = models.DecimalField(max_digits=10, decimal_places=2, default=25.00, help_text="Configured compensation fee in GHS for this resolved task.")
    payout_status = models.CharField(max_length=20, choices=ArbiterPayoutStatus.choices, default=ArbiterPayoutStatus.PENDING, db_index=True)
    payout_batch = models.ForeignKey(ArbiterPayoutBatch, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    notes = models.TextField(blank=True)
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_arbiter_activities')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Activity {self.activity_type} by @{self.arbiter.username} (GHS {self.fee_rate_ghs})"


