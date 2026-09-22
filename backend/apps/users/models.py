import uuid6
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

class Role(models.TextChoices):
    SELLER = 'SELLER', 'Seller'
    BUYER = 'BUYER', 'Buyer'
    ADMIN = 'ADMIN', 'Admin / HR Manager'
    ARBITER = 'ARBITER', 'Dispute Arbiter'
    COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER', 'KYC / Compliance Officer'
    FINANCE_ADMIN = 'FINANCE_ADMIN', 'Finance Admin / Accountant'
    SUPPORT_AGENT = 'SUPPORT_AGENT', 'Support Agent'

class PayoutMode(models.TextChoices):
    INSTANT = 'INSTANT', 'Instant Payout'
    MANUAL = 'MANUAL', 'Manual Withdrawal'

class VerificationStatus(models.TextChoices):
    UNSUBMITTED = 'UNSUBMITTED', 'Unsubmitted'
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Verified & Approved'
    REJECTED = 'REJECTED', 'Rejected'

def generate_uuid7():
    return uuid6.uuid7()

class User(AbstractUser):
    objects = UserManager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUYER, db_index=True)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    payout_mode = models.CharField(
        max_length=10,
        choices=PayoutMode.choices,
        default=PayoutMode.INSTANT,
        help_text="Whether completed transactions are paid out instantly or held for manual withdrawal."
    )
    
    # Storefront Directory & Advertising
    shop_name = models.CharField(max_length=150, blank=True, db_index=True)
    shop_description = models.TextField(blank=True)
    shop_category = models.CharField(max_length=50, default='General', blank=True, db_index=True)
    shop_categories = models.JSONField(default=list, blank=True, help_text="Up to 3 product categories associated with this shop.")
    advertised_until = models.DateTimeField(null=True, blank=True, help_text="Timestamp until which the shop is featured as a paid ad.")
    profile_picture_url = models.TextField(blank=True, default='')
    banner_url = models.TextField(blank=True, default='')

    # Verification Documents & Manual Approval
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNSUBMITTED,
        db_index=True
    )

    national_id_number = models.CharField(max_length=50, blank=True)
    national_id_photo_url = models.TextField(blank=True)
    business_license_photo_url = models.TextField(blank=True)
    verification_rejection_reason = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Auth & Security Verification
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    phone_otp_code = models.CharField(max_length=6, blank=True, default='')
    phone_otp_created_at = models.DateTimeField(null=True, blank=True)
    pending_momo_number = models.CharField(max_length=20, blank=True, default='')
    momo_otp_code = models.CharField(max_length=6, blank=True, default='')
    momo_otp_created_at = models.DateTimeField(null=True, blank=True)

    # Two-Factor Authentication (2FA TOTP)
    totp_secret = models.CharField(max_length=64, blank=True, default='', help_text="Encrypted or Base32 TOTP secret for authenticator apps.")
    is_2fa_enabled = models.BooleanField(default=False, help_text="Whether 2FA Authenticator app is enabled for this account.")
    totp_last_verified_at = models.DateTimeField(null=True, blank=True)
    # Account Suspension & Risk Status
    is_suspended = models.BooleanField(default=False, db_index=True)
    suspension_reason = models.TextField(blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    reinstated_at = models.DateTimeField(null=True, blank=True)

    # Referral & Growth Engine
    referral_code = models.CharField(max_length=30, unique=True, blank=True, null=True, db_index=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='direct_referees')
    wallet_bonus_credits_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Referral discount & promotional credit balance")

    def save(self, *args, **kwargs):
        admin_roles = [Role.ADMIN, Role.ARBITER, Role.COMPLIANCE_OFFICER, Role.FINANCE_ADMIN, Role.SUPPORT_AGENT]
        if (self.is_superuser or self.is_staff) and self.role not in admin_roles and self.role == Role.BUYER:
            self.role = Role.ADMIN
        
        if not self.referral_code:
            import secrets
            clean_uname = "".join(c for c in (self.username or 'HT') if c.isalnum()).upper()[:8]
            rand_suffix = secrets.token_hex(3).upper()
            self.referral_code = f"{clean_uname or 'HT'}-{rand_suffix}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class ReferralStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending First Transaction'
    COMPLETED = 'COMPLETED', 'Completed & Rewarded'
    EXPIRED = 'EXPIRED', 'Expired'


class Referral(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_sent')
    referred_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='referral_source')
    code_used = models.CharField(max_length=30, db_index=True)
    status = models.CharField(max_length=20, choices=ReferralStatus.choices, default=ReferralStatus.PENDING, db_index=True)
    reward_amount_ghs = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    referee_discount_ghs = models.DecimalField(max_digits=10, decimal_places=2, default=10.00)
    completed_transaction = models.ForeignKey('escrow.Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='referral_awards')
    rewarded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Referral: {self.referrer.username} -> {self.referred_user.username} ({self.status})"


class AppealStatus(models.TextChoices):
    PENDING  = 'PENDING',  'Pending Review'
    APPROVED = 'APPROVED', 'Approved & Reinstated'
    REJECTED = 'REJECTED', 'Appeal Rejected'


class SuspensionAppeal(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='suspension_appeals'
    )
    reason = models.TextField(help_text="User explanation and appeal justification")
    status = models.CharField(
        max_length=20,
        choices=AppealStatus.choices,
        default=AppealStatus.PENDING,
        db_index=True
    )
    admin_notes = models.TextField(blank=True, help_text="Notes/reasoning provided by admin upon review")
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_suspension_appeals'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Appeal by {self.user.username} — {self.status}"
