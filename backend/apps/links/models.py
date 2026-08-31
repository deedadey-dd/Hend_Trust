import uuid6
from django.db import models
from django.conf import settings

def generate_uuid7():
    return uuid6.uuid7()

class FeeHandling(models.TextChoices):
    ABSORB_FEE = 'ABSORB_FEE', 'Absorb Fee (Seller pays)'
    PASS_TO_BUYER = 'PASS_TO_BUYER', 'Pass to Buyer (Buyer pays)'

class PaymentLink(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_links')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_fee_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fee_handling = models.CharField(max_length=20, choices=FeeHandling.choices, default=FeeHandling.PASS_TO_BUYER)
    intended_buyer_phone = models.CharField(max_length=20, null=True, blank=True)
    image_url = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.price_ghs} GHS) - {'Active' if self.is_active else 'Inactive'}"
