import uuid6
from django.db import models
from apps.escrow.models import Transaction

def generate_uuid7():
    return uuid6.uuid7()

class DeliveryMethod(models.TextChoices):
    COURIER_API = 'COURIER_API', 'Courier API'
    INFORMAL_BUS = 'INFORMAL_BUS', 'Informal Bus Transport'

class DeliveryLog(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='delivery_logs')
    delivery_method = models.CharField(max_length=20, choices=DeliveryMethod.choices)
    
    # Path A specific
    courier_name = models.CharField(max_length=100, null=True, blank=True)
    tracking_number = models.CharField(max_length=100, null=True, blank=True)
    
    # Path B specific
    driver_phone = models.CharField(max_length=20, null=True, blank=True)
    driver_car_number = models.CharField(max_length=50, null=True, blank=True)
    destination_station = models.CharField(max_length=255, null=True, blank=True)
    waybill_photo_url = models.URLField(max_length=500, null=True, blank=True)
    
    # ID Verification during collection
    buyer_id_photo_url = models.URLField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Delivery for Tx {self.transaction.id} via {self.delivery_method}"
