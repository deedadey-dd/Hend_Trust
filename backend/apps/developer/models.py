import uuid
import hashlib
import secrets
from django.db import models
from django.conf import settings

class DeveloperAPIKey(models.Model):
    ENV_CHOICES = (
        ('LIVE', 'Live'),
        ('TEST', 'Test'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="Descriptor e.g. Shopify Store, Custom Node.js App")
    environment = models.CharField(max_length=10, choices=ENV_CHOICES, default='TEST')
    
    # Public Key used for frontend JS SDK embeds
    public_key = models.CharField(max_length=64, unique=True, db_index=True)
    
    # Secret Key hash stored securely (SHA-256)
    secret_key_hash = models.CharField(max_length=64, db_index=True)
    secret_prefix = models.CharField(max_length=16, help_text="First 8 characters for identification e.g. sk_live_a1b2...")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.name} ({self.environment})"

    @classmethod
    def generate_keys(cls, user, name: str, environment: str = 'TEST'):
        """
        Generates a new Public & Secret API Key pair.
        Returns tuple: (DeveloperAPIKey instance, raw_secret_key_string)
        NOTE: raw_secret_key_string MUST only be shown to the user ONCE.
        """
        env_lower = environment.lower()
        public_key = f"pk_{env_lower}_{secrets.token_hex(16)}"
        raw_secret_key = f"sk_{env_lower}_{secrets.token_hex(24)}"
        
        secret_key_hash = hashlib.sha256(raw_secret_key.encode('utf-8')).hexdigest()
        secret_prefix = raw_secret_key[:12] + '...'

        key_obj = cls.objects.create(
            user=user,
            name=name,
            environment=environment.upper(),
            public_key=public_key,
            secret_key_hash=secret_key_hash,
            secret_prefix=secret_prefix,
            is_active=True
        )
        return key_obj, raw_secret_key

    @classmethod
    def hash_secret_key(cls, raw_secret_key: str) -> str:
        return hashlib.sha256(raw_secret_key.encode('utf-8')).hexdigest()


class WebhookEndpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='webhook_endpoints')
    url = models.URLField(max_length=500)
    secret = models.CharField(max_length=64, help_text="whsec_... key used for HMAC SHA-256 payload verification")
    events = models.JSONField(default=list, help_text="List of subscribed event names")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.url}"

    @classmethod
    def create_endpoint(cls, user, url: str, events: list = None):
        if events is None:
            events = ["escrow.paid", "escrow.dispatched", "escrow.completed", "escrow.disputed", "escrow.refunded"]
        secret = f"whsec_{secrets.token_hex(20)}"
        return cls.objects.create(
            user=user,
            url=url,
            secret=secret,
            events=events,
            is_active=True
        )


class WebhookDeliveryLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='logs')
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(max_length=500, blank=True)
    delivered_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)

    class Meta:
        ordering = ['-delivered_at']

    def __str__(self):
        return f"{self.event_type} -> {self.webhook.url} ({'Success' if self.success else 'Failed'})"
