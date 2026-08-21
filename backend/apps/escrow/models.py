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
    CANCELLED = 'CANCELLED', 'Cancelled'
    REFUNDED = 'REFUNDED', 'Refunded'

class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    link = models.ForeignKey(PaymentLink, on_delete=models.PROTECT, related_name='transactions')
    buyer_name = models.CharField(max_length=255, blank=True)
    buyer_phone = models.CharField(max_length=20)
    buyer_email = models.EmailField(blank=True)
    shipping_address = models.TextField(blank=True)
    total_amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30, choices=TransactionStatus.choices, default=TransactionStatus.AWAITING_PAYMENT)
    paystack_reference = models.CharField(max_length=100, unique=True, db_index=True)
    
    # State tracking timestamps
    dispatched_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    inspection_starts_at = models.DateTimeField(null=True, blank=True)

    # 6-digit confirmation code shared by seller → buyer to confirm delivery
    delivery_confirmation_code = models.CharField(max_length=6, blank=True)
    
    # Reminder tracking
    reminder_30h_sent = models.BooleanField(default=False)
    reminder_36h_sent = models.BooleanField(default=False)
    reminder_42h_sent = models.BooleanField(default=False)

    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tx {self.id} | {self.status} | {self.total_amount_ghs} GHS"
