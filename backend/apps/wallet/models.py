import uuid6
from django.db import models
from django.conf import settings
from apps.ledger.models import LedgerAccount

def generate_uuid7():
    return uuid6.uuid7()

class PayoutDestinationType(models.TextChoices):
    MOMO = 'MOMO', 'Mobile Money'
    BANK = 'BANK', 'Bank Account'

class SellerWallet(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    ledger_account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name='linked_wallets')
    
    # Synchronized with ledger_account.balance
    available_balance_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Payout destination details
    preferred_payout_type = models.CharField(
        max_length=10, choices=PayoutDestinationType.choices, default=PayoutDestinationType.MOMO
    )
    momo_number = models.CharField(max_length=20, null=True, blank=True)
    bank_account_number = models.CharField(max_length=50, null=True, blank=True)
    bank_name = models.CharField(max_length=100, null=True, blank=True)

    # Cumulative Paystack transfer fees paid
    total_paystack_fees_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet for {self.user.username} | Balance: {self.available_balance_ghs} GHS"

