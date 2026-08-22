from django.contrib import admin
from apps.escrow.models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('paystack_reference', 'link', 'buyer_name', 'buyer_phone', 'total_amount_ghs', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'dispatched_at', 'delivered_at')
    search_fields = ('paystack_reference', 'buyer_name', 'buyer_phone', 'buyer_email', 'link__title', 'link__seller__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
