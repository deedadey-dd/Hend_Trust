import uuid6
from django.db import models
from django.conf import settings
from apps.escrow.models import Transaction

def generate_uuid7():
    return uuid6.uuid7()

class SellerReview(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name='review'
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_reviews'
    )
    buyer_name = models.CharField(max_length=100)
    buyer_phone = models.CharField(max_length=20, blank=True)
    
    # 3-axis rating (1 to 5 stars)
    rating_speed = models.PositiveSmallIntegerField(default=5)
    rating_communication = models.PositiveSmallIntegerField(default=5)
    rating_overall = models.PositiveSmallIntegerField(default=5)
    
    comment = models.TextField(blank=True)
    
    seller_reply = models.TextField(blank=True)
    seller_replied_at = models.DateTimeField(null=True, blank=True)
    
    is_active = models.BooleanField(
        default=True,
        help_text="Automatically set to False if a dispute is raised for this transaction."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review for {self.seller.username} by {self.buyer_name} ({self.rating_overall}★)"
