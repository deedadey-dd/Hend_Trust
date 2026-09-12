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
                    ref_id = uuid6.uuid7()
                    record_ad_promotion_fee(reference_id=ref_id, seller_user_id=seller.id, fee_amount=fee)
                    
                    now = timezone.now()
                    current_expiry = seller.advertised_until if (seller.advertised_until and seller.advertised_until > now) else now
                    new_expiry = current_expiry + timedelta(days=days)
                    seller.advertised_until = new_expiry
                    seller.save(update_fields=['advertised_until'])

                    from apps.reviews.services import create_and_send_ad_invoice
                    create_and_send_ad_invoice(
                        seller=seller,
                        duration_days=days,
                        fee_amount=fee,
                        payment_method='PAYSTACK',
                        reference_code=reference,
                        advertised_from=current_expiry,
                        advertised_until=new_expiry
                    )
            except Exception as e:
                print(f"Error processing AD payment webhook: {e}")
        elif reference:
            try:
                txn = Transaction.objects.get(paystack_reference=reference)
                from apps.escrow.services import confirm_transaction_payment
                confirm_transaction_payment(txn)
            except Transaction.DoesNotExist:
                pass

                
    return {"status": "success"}
