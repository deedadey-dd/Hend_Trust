import uuid6
from django.db import models
from django.conf import settings

def generate_uuid7():
    return uuid6.uuid7()

class FeeHandling(models.TextChoices):
    ABSORB_FEE = 'ABSORB_FEE', 'Absorb Fee (Seller pays)'
    PASS_TO_BUYER = 'PASS_TO_BUYER', 'Pass to Buyer (Buyer pays)'

class DirectOrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Payment'
    PAID = 'PAID', 'Paid & In Escrow'
    DECLINED = 'DECLINED', 'Declined by Buyer'
    CANCELLED = 'CANCELLED', 'Cancelled by Seller'

class PaymentLink(models.Model):
    objects = models.Manager()
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_links')
    intended_buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_payment_links',
        help_text="Target platform buyer if this order was sent directly within the platform"
    )
    is_direct_order = models.BooleanField(default=False, db_index=True)
    direct_order_status = models.CharField(
        max_length=20,
        choices=DirectOrderStatus.choices,
        default=DirectOrderStatus.PENDING,
        db_index=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_fee_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fee_handling = models.CharField(max_length=20, choices=FeeHandling.choices, default=FeeHandling.PASS_TO_BUYER)
    intended_buyer_phone = models.CharField(max_length=20, null=True, blank=True)
    image_url = models.TextField(blank=True, default='')
    category = models.CharField(max_length=64, blank=True, default='', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['seller', 'is_archived', 'is_active']),
            models.Index(fields=['intended_buyer', 'is_direct_order', 'direct_order_status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.price_ghs} GHS) - {'Active' if self.is_active else 'Inactive'}"


