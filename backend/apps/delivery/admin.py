from django.contrib import admin
from apps.delivery.models import DeliveryLog

@admin.register(DeliveryLog)
class DeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'delivery_method', 'courier_name', 'tracking_number', 'driver_phone', 'created_at')
    list_filter = ('delivery_method', 'created_at')
    search_fields = ('transaction__paystack_reference', 'courier_name', 'tracking_number', 'driver_phone', 'destination_station')
    ordering = ('-created_at',)
