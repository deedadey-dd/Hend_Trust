import uuid6
from django.db import models
from django.conf import settings

def generate_uuid7():
    return uuid6.uuid7()

class NotificationType(models.TextChoices):
    SMS = 'SMS', 'SMS'
    EMAIL = 'EMAIL', 'Email'
    IN_APP = 'IN_APP', 'In-App'

class NotificationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.notification_type})"

class WebhookEventLog(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    provider = models.CharField(max_length=100) # e.g., 'PAYSTACK', 'COURIER_API'
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    response_status_code = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.provider} - {self.event_type} [{self.response_status_code}]"
