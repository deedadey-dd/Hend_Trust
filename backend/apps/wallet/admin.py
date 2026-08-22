from django.contrib import admin
from apps.wallet.models import SellerWallet

@admin.register(SellerWallet)
class SellerWalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'available_balance_ghs', 'preferred_payout_type', 'momo_number', 'bank_name', 'created_at')
    list_filter = ('preferred_payout_type', 'created_at')
    search_fields = ('user__username', 'user__email', 'momo_number', 'bank_account_number')
