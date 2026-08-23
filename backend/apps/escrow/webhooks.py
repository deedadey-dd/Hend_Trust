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
        reference = data.get('reference', '')
        if reference.startswith('AD_'):
            try:
                parts = reference.split('_')
                days = 7 if '7D' in parts[1] else 30
                customer_email = data.get('customer', {}).get('email')
                from apps.users.models import User
                from decimal import Decimal
                from datetime import timedelta
                from django.utils import timezone
                from apps.ledger.services import record_ad_promotion_fee
                import uuid6

                seller = User.objects.filter(email=customer_email).first()
                if seller:
                    fee = Decimal("50.00") if days == 7 else Decimal("150.00")
                    record_ad_promotion_fee(reference_id=uuid6.uuid7(), seller_user_id=seller.id, fee_amount=fee)
                    
                    now = timezone.now()
                    current_expiry = seller.advertised_until if (seller.advertised_until and seller.advertised_until > now) else now
                    seller.advertised_until = current_expiry + timedelta(days=days)
                    seller.save(update_fields=['advertised_until'])
            except Exception as e:
                print(f"Error processing AD payment webhook: {e}")
        elif reference:
            try:
                txn = Transaction.objects.get(paystack_reference=reference)
                if txn.status == TransactionStatus.AWAITING_PAYMENT:
                    txn.status = TransactionStatus.PAYMENT_RECEIVED
                    txn.save()
                    
                    from apps.ledger.services import record_buyer_deposit
                    try:
                        gateway_fee = (txn.total_amount_ghs * Decimal('0.0195')).quantize(Decimal('0.01'))
                        record_buyer_deposit(reference_id=str(txn.id), gross_amount=txn.total_amount_ghs, gateway_fee=gateway_fee)
                    except Exception as e:
                        print(f"Ledger record_buyer_deposit error: {e}")

                    from apps.core.tasks import notify_buyer_payment_received_task, notify_seller_payment_received_task
                    notify_buyer_payment_received_task.delay(txn.id)
                    notify_seller_payment_received_task.delay(txn.id)
            except Transaction.DoesNotExist:
                pass
                
    return {"status": "success"}
