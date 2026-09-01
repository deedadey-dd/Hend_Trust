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

class BroadcastCampaignStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    FAILED = 'FAILED', 'Failed'

class BroadcastCampaign(models.Model):
    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    target_group = models.CharField(max_length=50)
    channels = models.CharField(max_length=20)
    custom_recipients = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=BroadcastCampaignStatus.choices, default=BroadcastCampaignStatus.PENDING)
    total_recipients = models.IntegerField(default=0)
    sent_sms_count = models.IntegerField(default=0)
    sent_email_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Campaign {self.subject} [{self.status}]"
