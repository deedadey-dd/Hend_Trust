import json
import hmac
import hashlib
from ninja import Router
from django.conf import settings
from ninja.errors import HttpError
from django.shortcuts import get_object_or_404
from apps.escrow.models import Transaction, TransactionStatus
from apps.notifications.services import log_webhook_event

from hendaxis_trust.settings import env

escrow_webhooks_router = Router(tags=["Paystack Webhooks"])

@escrow_webhooks_router.post("/paystack")
def paystack_webhook(request):
    """
    Listens for Paystack webhook events (e.g. charge.success)
    and verifies the HMAC SHA512 signature.
    """
    signature = request.headers.get('x-paystack-signature')
    
    try:
        raw_payload = json.loads(request.body) if request.body else {}
    except Exception:
        raw_payload = {}
        
    if not signature:
        log_webhook_event("PAYSTACK", "UNAUTHORIZED", raw_payload, 401, "Missing X-Paystack-Signature")
        raise HttpError(401, "Missing signature")
        
    secret = env('PAYSTACK_SECRET_KEY', default='test_secret_key').encode('utf-8')
    body_bytes = request.body.encode('utf-8') if isinstance(request.body, str) else request.body
    computed_hmac = hmac.new(secret, body_bytes, hashlib.sha512).hexdigest()
    
    if computed_hmac != signature:
        log_webhook_event("PAYSTACK", "UNAUTHORIZED", raw_payload, 401, "Invalid X-Paystack-Signature")
        raise HttpError(401, "Invalid signature")
        
    event = raw_payload.get('event')
    data = raw_payload.get('data', {})
    
    log_webhook_event("PAYSTACK", event or "UNKNOWN", raw_payload, 200)
    
    if event == 'charge.success':
        reference = data.get('reference')
        if reference:
            try:
                txn = Transaction.objects.get(paystack_reference=reference)
                if txn.status == TransactionStatus.AWAITING_PAYMENT:
                    txn.status = TransactionStatus.PAYMENT_RECEIVED
                    txn.save()
            except Transaction.DoesNotExist:
                pass
                
    return {"status": "success"}
