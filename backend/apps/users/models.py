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

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
