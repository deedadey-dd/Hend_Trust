import uuid6
from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.TextChoices):
    SELLER = 'SELLER', 'Seller'
    BUYER = 'BUYER', 'Buyer'
    ADMIN = 'ADMIN', 'Admin'
    SUPPORT_AGENT = 'SUPPORT_AGENT', 'Support Agent'

def generate_uuid7():
    return uuid6.uuid7()

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUYER)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
