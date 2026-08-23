import random
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from ninja.errors import HttpError
from apps.escrow.models import Transaction, TransactionStatus
from apps.delivery.models import DeliveryLog
from apps.core.tasks import dispatch_sms_task, dispatch_email_task


OTP_CACHE_TIMEOUT = 604800  # 7 days


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


def _build_delivery_sms(transaction: Transaction, otp: str) -> str:
    """Build a rich SMS message for the buyer with driver info and OTP."""
    # Fetch the latest informal bus delivery log for this transaction
    log = DeliveryLog.objects.filter(
        transaction=transaction,
        delivery_method='INFORMAL_BUS'
    ).order_by('-created_at').first()

    parts = [f"Your order {transaction.paystack_reference} is on its way!"]

    if log:
        if log.driver_phone:
            parts.append(f"Driver phone: {log.driver_phone}")
        if log.driver_car_number:
            parts.append(f"Car No: {log.driver_car_number}")
        if log.destination_station:
            parts.append(f"Destination station: {log.destination_station}")

    parts.append(f"Secret OTP: {otp}")
    parts.append("Show your ID + this OTP at pickup.")

    return "\n".join(parts)


def generate_delivery_otp(transaction_id: str) -> str:
    """Generate a 6-digit OTP, cache it, and SMS the buyer with driver info."""
    otp = str(random.randint(100000, 999999))
    cache.set(f"delivery_otp_{transaction_id}", otp, timeout=OTP_CACHE_TIMEOUT)

    try:
        txn = Transaction.objects.get(id=transaction_id)
        msg = _build_delivery_sms(txn, otp)

        print("\n" + "="*50)
        print(f"DEV DELIVERY OTP FOR {txn.buyer_phone}: {otp}")
        print("="*50 + "\n")

        dispatch_sms_task.delay(txn.buyer_phone, msg)
        if txn.buyer_email:
            dispatch_email_task.delay(
                txn.buyer_email,
                "Your HendAxis Trust Delivery OTP",
                msg
            )
    except Transaction.DoesNotExist:
        pass

    return otp


def resend_delivery_otp(transaction_id: str) -> str:
    """Resend an existing OTP (or generate a new one if expired) to the buyer."""
    otp = cache.get(f"delivery_otp_{transaction_id}")
    if not otp:
        # OTP expired — generate a fresh one
        otp = str(random.randint(100000, 999999))
        cache.set(f"delivery_otp_{transaction_id}", otp, timeout=OTP_CACHE_TIMEOUT)

    try:
        txn = Transaction.objects.get(id=transaction_id)
        msg = _build_delivery_sms(txn, otp)

        print("\n" + "="*50)
        print(f"DEV DELIVERY OTP FOR {txn.buyer_phone}: {otp}")
        print("="*50 + "\n")

        dispatch_sms_task.delay(txn.buyer_phone, msg)
        if txn.buyer_email:
            dispatch_email_task.delay(
                txn.buyer_email,
                "Your HendAxis Trust Delivery OTP (Resent)",
                msg
            )
    except Transaction.DoesNotExist:
        pass

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
