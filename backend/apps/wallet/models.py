import uuid6
from django.db import models
from django.conf import settings
from apps.ledger.models import LedgerAccount

def generate_uuid7():
    return uuid6.uuid7()

class SellerWallet(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    ledger_account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name='linked_wallets')
    
    # Synchronized with ledger_account.balance
    available_balance_ghs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    momo_number = models.CharField(max_length=20, null=True, blank=True)
    bank_account_number = models.CharField(max_length=50, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet for {self.user.username} | Balance: {self.available_balance_ghs} GHS"
