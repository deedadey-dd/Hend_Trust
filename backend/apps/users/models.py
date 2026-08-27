import uuid6
from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.TextChoices):
    SELLER = 'SELLER', 'Seller'
    BUYER = 'BUYER', 'Buyer'
    ADMIN = 'ADMIN', 'Admin'
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
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUYER)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    payout_mode = models.CharField(
        max_length=10,
        choices=PayoutMode.choices,
        default=PayoutMode.INSTANT,
        help_text="Whether completed transactions are paid out instantly or held for manual withdrawal."
    )
    
    # Storefront Directory & Advertising
    shop_name = models.CharField(max_length=150, blank=True)
    shop_description = models.TextField(blank=True)
    shop_category = models.CharField(max_length=50, default='General', blank=True)
    shop_categories = models.JSONField(default=list, blank=True, help_text="Up to 3 product categories associated with this shop.")
    advertised_until = models.DateTimeField(null=True, blank=True, help_text="Timestamp until which the shop is featured as a paid ad.")
    profile_picture_url = models.TextField(blank=True, default='')
    banner_url = models.TextField(blank=True, default='')

    # Verification Documents & Manual Approval
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNSUBMITTED
    )
    national_id_number = models.CharField(max_length=50, blank=True)
    national_id_photo_url = models.TextField(blank=True)
    business_license_photo_url = models.TextField(blank=True)
    verification_rejection_reason = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Auth & Security Verification
    is_email_verified = models.BooleanField(default=False)
    pending_momo_number = models.CharField(max_length=20, blank=True, default='')
    momo_otp_code = models.CharField(max_length=6, blank=True, default='')
    momo_otp_created_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if (self.is_superuser or self.is_staff) and self.role == Role.BUYER:
            self.role = Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
