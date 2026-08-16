import random
from django.utils import timezone
from django.core.cache import cache
from apps.escrow.models import Transaction, TransactionStatus
from ninja.errors import HttpError
from datetime import timedelta

def transition_to_delivery(transaction: Transaction) -> None:
    if transaction.status != TransactionStatus.PAYMENT_RECEIVED:
        raise HttpError(400, f"Cannot dispatch transaction in {transaction.status} state")
    
    transaction.status = TransactionStatus.DELIVERY_IN_PROGRESS
    transaction.dispatched_at = timezone.now()
    transaction.save(update_fields=['status', 'dispatched_at', 'updated_at'])

def transition_to_inspection(transaction: Transaction) -> None:
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, f"Cannot inspect transaction in {transaction.status} state")
        
    now = timezone.now()
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    transaction.delivered_at = now
    transaction.inspection_starts_at = now
    transaction.save(update_fields=['status', 'delivered_at', 'inspection_starts_at', 'updated_at'])

def generate_delivery_otp(transaction_id: str) -> str:
    otp = str(random.randint(100000, 999999))
    # Cache indefinitely or for a long time since delivery takes days, but let's say 7 days (604800s)
    cache.set(f"delivery_otp_{transaction_id}", otp, timeout=604800)
    print(f"==================================================")
    # We need the buyer's phone number to send the OTP.
    from apps.escrow.models import Transaction
    try:
        txn = Transaction.objects.get(id=transaction_id)
        msg = f"Your HendAxis Delivery Release OTP for Tx {transaction_id[:8]} is {otp}."
        from apps.core.tasks import dispatch_sms_task
        dispatch_sms_task.delay(txn.buyer_phone, msg)
    except Transaction.DoesNotExist:
        pass
    print(f"==================================================")
    return otp

def verify_delivery_otp(transaction_id: str, otp_code: str) -> bool:
    cached_otp = cache.get(f"delivery_otp_{transaction_id}")
    if cached_otp and cached_otp == otp_code:
        cache.delete(f"delivery_otp_{transaction_id}")
        return True
    return False

def check_unresponsive_buyer_safeguard(transaction: Transaction) -> None:
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, "Safeguard only applies to items in delivery")
        
    if not transaction.dispatched_at:
        raise HttpError(400, "Transaction has no dispatch time")
        
    if timezone.now() <= transaction.dispatched_at + timedelta(hours=24):
        raise HttpError(400, "24 hours must pass since dispatch to claim delivery")

    # Claim delivery
    transition_to_inspection(transaction)
    
    print(f"==================================================")
    print(f"[URGENT SMS TO BUYER] Seller claims delivery for Tx {transaction.id}. You have 24 hours to dispute.")
    print(f"==================================================")
