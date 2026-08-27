import time
import json
import hmac
import hashlib
import requests
from django.utils import timezone
from ninja.security import APIKeyHeader
from .models import DeveloperAPIKey, WebhookEndpoint, WebhookDeliveryLog

class APIKeyAuth(APIKeyHeader):
    """
    Authentication backend that checks the X-HendAxis-Secret-Key HTTP header.
    Validates secret key hash against DeveloperAPIKey database records.
    """
    param_name = "X-HendAxis-Secret-Key"

    def authenticate(self, request, key):
        if not key or not key.startswith(('sk_live_', 'sk_test_')):
            return None
        
        secret_hash = DeveloperAPIKey.hash_secret_key(key)
        try:
            api_key = DeveloperAPIKey.objects.get(secret_key_hash=secret_hash, is_active=True)
            # Update last used timestamp
            api_key.last_used_at = timezone.now()
            api_key.save(update_fields=['last_used_at'])
            
            # Attach user and key info to request
            request.auth_user = api_key.user
            request.api_key = api_key
            return api_key.user
        except DeveloperAPIKey.DoesNotExist:
            return None


class WebhookDispatcher:
    """
    Dispatches signed HMAC SHA-256 webhooks to third-party endpoints.
    """
    @staticmethod
    def dispatch_event(user, event_type: str, data: dict):
        endpoints = WebhookEndpoint.objects.filter(user=user, is_active=True)
        results = []

        for ep in endpoints:
            # Check if subscribed to event
            if ep.events and event_type not in ep.events and '*' not in ep.events:
                continue

            timestamp = int(time.time())
            payload_dict = {
                "event": event_type,
                "timestamp": timestamp,
                "data": data
            }
            json_payload = json.dumps(payload_dict, sort_keys=True)

            # Compute HMAC SHA-256 Signature
            signed_payload = f"{timestamp}.{json_payload}"
            signature = hmac.new(
                ep.secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            headers = {
                "Content-Type": "application/json",
                "User-Agent": "HendAxis-Webhook/1.0",
                "X-HendAxis-Signature": f"t={timestamp},v1={signature}"
            }

            status_code = None
            response_text = ""
            success = False

            try:
                resp = requests.post(ep.url, data=json_payload, headers=headers, timeout=5)
                status_code = resp.status_code
                response_text = resp.text[:490]
                success = 200 <= resp.status_code < 300
            except Exception as e:
                response_text = str(e)[:490]
                success = False

            # Create log entry
            log = WebhookDeliveryLog.objects.create(
                webhook=ep,
                event_type=event_type,
                payload=payload_dict,
                response_status=status_code,
                response_body=response_text,
                success=success
            )
            results.append({"endpoint_id": str(ep.id), "success": success, "log_id": str(log.id)})

        return results
