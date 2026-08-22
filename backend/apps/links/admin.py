from django.contrib import admin
from apps.links.models import PaymentLink

@admin.register(PaymentLink)
class PaymentLinkAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'price_ghs', 'shipping_fee_ghs', 'fee_handling', 'is_active', 'created_at')
    list_filter = ('fee_handling', 'is_active', 'created_at')
    search_fields = ('title', 'description', 'seller__username', 'seller__email', 'seller__phone_number')
    ordering = ('-created_at',)
