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
    
    # If there was a pending buyer cancellation request, halt/void it upon dispatch
    update_fields = ['status', 'dispatched_at', 'updated_at']
    if getattr(transaction, 'cancellation_requested_at', None) or getattr(transaction, 'cancellation_payout_status', '') == 'PENDING_CONFIRMATION':
        transaction.cancellation_requested_at = None
        transaction.cancellation_grace_until = None
        transaction.cancellation_payout_status = 'CANCELLED_REJECTED'
        transaction.cancellation_seller_reported_shipped = True
        update_fields.extend(['cancellation_requested_at', 'cancellation_grace_until', 'cancellation_payout_status', 'cancellation_seller_reported_shipped'])

    transaction.save(update_fields=update_fields)


def transition_to_inspection(transaction: Transaction) -> None:
    if transaction.status != TransactionStatus.DELIVERY_IN_PROGRESS:
        raise HttpError(400, f"Cannot inspect transaction in {transaction.status} state")

    now = timezone.now()
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    transaction.delivered_at = now
    transaction.inspection_starts_at = now
    transaction.save(update_fields=['status', 'delivered_at', 'inspection_starts_at', 'updated_at'])


def _build_delivery_sms(transaction: Transaction, is_resend: bool = False) -> str:
    """Build a message for the buyer with driver info and pickup instructions."""
    # Fetch the latest informal bus delivery log for this transaction
    log = DeliveryLog.objects.filter(
        transaction=transaction,
        delivery_method='INFORMAL_BUS'
    ).order_by('-created_at').first()

    header = f"Your HendAxis order {transaction.paystack_reference} delivery details (Resent):" if is_resend else f"Your HendAxis order {transaction.paystack_reference} is on its way!"
    parts = [header]

    if log:
        if log.driver_phone:
            parts.append(f"Driver Phone: {log.driver_phone}")
        if log.driver_car_number:
            parts.append(f"Car No: {log.driver_car_number}")
        if log.destination_station:
            parts.append(f"Destination Station: {log.destination_station}")

    parts.append("Please present your ID Card for identification when picking up your package.")

    return "\n".join(parts)


def generate_delivery_otp(transaction_id: str) -> str:
    """Notify the buyer with driver details and station pickup instructions (no OTP required)."""
    try:
        txn = Transaction.objects.get(id=transaction_id)
        msg = _build_delivery_sms(txn, is_resend=False)

        print("\n" + "="*70, flush=True)
        print(f"🚌 [DEV BUS DELIVERY NOTICE] FOR {txn.buyer_phone} / {txn.buyer_email}", flush=True)
        print(msg, flush=True)
        print("="*70 + "\n", flush=True)

        dispatch_sms_task.delay(txn.buyer_phone, msg)
        if txn.buyer_email:
            dispatch_email_task.delay(
                txn.buyer_email,
                f"Your HendAxis Order Delivery Details - #{txn.paystack_reference}",
                msg
            )
    except Transaction.DoesNotExist:
        pass

    return ""


def resend_delivery_otp(transaction_id: str) -> str:
    """Resend delivery driver and pickup instructions to the buyer."""
    import time
    now_ts = int(time.time())
    sent_key = f"delivery_notice_sent_at_{transaction_id}"
    last_sent_ts = cache.get(sent_key)
    COOLDOWN_SECONDS = 60

    if last_sent_ts and (now_ts - last_sent_ts) < COOLDOWN_SECONDS:
        # Cooldown active — skip duplicate SMS/Email
        return ""

    cache.set(sent_key, now_ts, timeout=300)

    try:
        txn = Transaction.objects.get(id=transaction_id)
        msg = _build_delivery_sms(txn, is_resend=True)

        print("\n" + "="*70, flush=True)
        print(f"🚌 [RESENT BUS DELIVERY NOTICE] FOR {txn.buyer_phone} / {txn.buyer_email}", flush=True)
        print(msg, flush=True)
        print("="*70 + "\n", flush=True)

        dispatch_sms_task.delay(txn.buyer_phone, msg)
        if txn.buyer_email:
            dispatch_email_task.delay(
                txn.buyer_email,
                f"Your HendAxis Order Delivery Details (Resent) - #{txn.paystack_reference}",
                msg
            )
    except Transaction.DoesNotExist:
        pass

    return ""


def verify_delivery_otp(transaction_id: str, otp_code: str) -> bool:
    """Always return True or check cache if legacy code is supplied."""
    cached_otp = cache.get(f"delivery_otp_{transaction_id}")
    if cached_otp:
        if cached_otp == otp_code:
            cache.delete(f"delivery_otp_{transaction_id}")
            return True
        return False
    return True


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
