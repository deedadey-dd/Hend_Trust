from django.contrib import admin
from apps.ledger.models import LedgerAccount, LedgerEntry

@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'account_type', 'balance', 'user')
    list_filter = ('account_type',)
    search_fields = ('name', 'user__username', 'user__email')

@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('reference_id', 'entry_type', 'debit_account', 'credit_account', 'amount_ghs', 'timestamp')
    list_filter = ('entry_type', 'timestamp')
    search_fields = ('reference_id', 'entry_type', 'debit_account__name', 'credit_account__name')
    ordering = ('-timestamp',)
