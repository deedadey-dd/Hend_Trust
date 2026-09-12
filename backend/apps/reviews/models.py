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
    image_url = models.TextField(blank=True, default='')
    
    seller_reply = models.TextField(blank=True)
    seller_replied_at = models.DateTimeField(null=True, blank=True)
    
    upvotes_count = models.PositiveIntegerField(default=0)
    downvotes_count = models.PositiveIntegerField(default=0)
    
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Automatically set to False if a dispute is raised for this transaction."
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['seller', 'is_active']),
        ]


    def __str__(self):
        return f"Review for {self.seller.username} by {self.buyer_name} ({self.rating_overall}★)"


class ReviewVote(models.Model):
    VOTE_UP = 'UP'
    VOTE_DOWN = 'DOWN'
    VOTE_CHOICES = [
        (VOTE_UP, 'Upvote'),
        (VOTE_DOWN, 'Downvote'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    review = models.ForeignKey(
        SellerReview,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review_votes'
    )
    vote_type = models.CharField(max_length=4, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('review', 'user')

    def __str__(self):
        return f"{self.user.username} voted {self.vote_type} on review {self.review.id}"


class ShopAdInvoice(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ad_invoices'
    )
    duration_days = models.PositiveIntegerField(default=7)
    amount_ghs = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, default='WALLET')  # 'WALLET' or 'PAYSTACK'
    reference_code = models.CharField(max_length=100, blank=True)
    advertised_from = models.DateTimeField()
    advertised_until = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.invoice_number} | {self.seller.username} | GHS {self.amount_ghs}"

