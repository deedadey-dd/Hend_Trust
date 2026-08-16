import uuid6
from django.db import models
from django.conf import settings

class AccountType(models.TextChoices):
    ASSET = 'ASSET', 'Asset'
    LIABILITY = 'LIABILITY', 'Liability'
    REVENUE = 'REVENUE', 'Revenue'
    EXPENSE = 'EXPENSE', 'Expense'

def generate_uuid7():
    return uuid6.uuid7()

class LedgerAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='ledger_accounts'
    )
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    name = models.CharField(max_length=100, unique=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} ({self.account_type}) - Balance: {self.balance}"

class LedgerEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    reference_id = models.UUIDField(db_index=True)
    debit_account = models.ForeignKey(
        LedgerAccount, 
        on_delete=models.PROTECT, 
        related_name='debit_entries'
    )
    credit_account = models.ForeignKey(
        LedgerAccount, 
        on_delete=models.PROTECT, 
        related_name='credit_entries'
    )
    amount_ghs = models.DecimalField(max_digits=12, decimal_places=2)
    entry_type = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.entry_type} | {self.amount_ghs} GHS | {self.timestamp.date()}"
