from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.payouts import execute_payout_for_transaction

@shared_task
def check_expired_inspections():
    """
    Periodic task to automatically complete transactions where the 
    inspection period has expired without a dispute (using dynamic settings tiers).
    """
    from apps.escrow.api import get_inspection_hours_for_amount
    now = timezone.now()
    
    transactions = Transaction.objects.filter(
        status=TransactionStatus.INSPECTION_PERIOD,
        inspection_starts_at__isnull=False
    )
    
    completed_count = 0
    for transaction in transactions:
        hours = get_inspection_hours_for_amount(transaction.total_amount_ghs)
        duration = timedelta(hours=hours)
            
        if (transaction.inspection_starts_at + duration) <= now:
            # 1. Update status to completed
            transaction.status = TransactionStatus.COMPLETED
            transaction.save(update_fields=['status', 'updated_at'])
            
            # 2. Trigger auto-payout & ledger settlement
            execute_payout_for_transaction(transaction)
            completed_count += 1
        
    return f"Processed {completed_count} expired inspections."

@shared_task
def check_delivery_reminders():
    """
    Sends SMS/Email reminders to the buyer at 30, 36, and 42 hours after dispatch 
    if the item hasn't been confirmed received.
    """
    now = timezone.now()
    transactions = Transaction.objects.filter(
        status=TransactionStatus.DELIVERY_IN_PROGRESS,
        dispatched_at__isnull=False
    ).distinct()
    
    reminders_sent = 0
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    for tx in transactions:
        hours_since_dispatch = (now - tx.dispatched_at).total_seconds() / 3600.0
        
        # 30-hour reminder
        if 30 <= hours_since_dispatch < 36 and not tx.reminder_30h_sent:
            msg = f"Reminder: Your HendAxis Trust order {tx.paystack_reference} was dispatched. Please log in to confirm receipt."
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Confirm Receipt Reminder", msg)
            tx.reminder_30h_sent = True
            tx.save(update_fields=['reminder_30h_sent'])
            reminders_sent += 1
            
        # 36-hour reminder
        elif 36 <= hours_since_dispatch < 42 and not tx.reminder_36h_sent:
            msg = f"Second Reminder: Please log in to confirm receipt of order {tx.paystack_reference}. If you have issues, contact the seller."
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Confirm Receipt Reminder", msg)
            tx.reminder_36h_sent = True
            tx.save(update_fields=['reminder_36h_sent'])
            reminders_sent += 1
            
        # 42-hour reminder (Final Warning before auto-delivery)
        elif 42 <= hours_since_dispatch < 48 and not tx.reminder_42h_sent:
            msg = (
                f"FINAL WARNING: Order {tx.paystack_reference} will be automatically confirmed as delivered and progressed to the Inspection Phase "
                f"in 6 hours if you do not confirm receipt. Please log in now to confirm delivery."
            )
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "FINAL WARNING: Confirm Receipt Needed", msg)
            tx.reminder_42h_sent = True
            tx.save(update_fields=['reminder_42h_sent'])
            reminders_sent += 1

    return f"Sent {reminders_sent} delivery reminders."

@shared_task
def process_auto_deliveries():
    """
    If auto-delivery hours have passed since dispatch and the buyer hasn't acted,
    automatically mark it as delivered and start the inspection period.
    """
    from apps.escrow.api import get_platform_settings, get_inspection_hours_for_amount
    now = timezone.now()
    cfg = get_platform_settings()
    auto_del_hrs = cfg.get("auto_delivery_hours", 48)

    transactions = Transaction.objects.filter(
        status=TransactionStatus.DELIVERY_IN_PROGRESS,
        dispatched_at__isnull=False
    ).distinct()
    
    auto_delivered_count = 0
    from apps.delivery.services import transition_to_inspection
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task, notify_seller_delivery_confirmed_task
    
    for tx in transactions:
        hours_since_dispatch = (now - tx.dispatched_at).total_seconds() / 3600.0
        
        if hours_since_dispatch >= auto_del_hrs:
            transition_to_inspection(tx)
            
            hours = get_inspection_hours_for_amount(tx.total_amount_ghs)
            msg = (
                f"Your order {tx.paystack_reference} has been automatically marked as Delivered due to {auto_del_hrs}h of inactivity. "
                f"Your {hours}-hour inspection period has started. Raise a dispute now if needed."
            )
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Order Marked as Delivered", msg)
                
            # Notify seller that delivery was auto-confirmed and inspection started
            notify_seller_delivery_confirmed_task.delay(tx.id)
            
            auto_delivered_count += 1
            
    return f"Auto-delivered {auto_delivered_count} transactions."

@shared_task
def check_dispatch_expiry_reminders():
    """
    Sends SMS & Email reminder to the seller 6 hours before the pending dispatch timeout expires.
    Warns that the order will be auto-cancelled and a penalty will be charged if not shipped.
    """
    from apps.escrow.api import get_platform_settings
    now = timezone.now()
    cfg = get_platform_settings()
    timeout_days = cfg.get("shipping_timeout_days", 4)
    
    reminder_threshold_hours = (timeout_days * 24.0) - 6.0
    cutoff = now - timedelta(hours=reminder_threshold_hours)
    
    transactions = Transaction.objects.filter(
        status=TransactionStatus.PAYMENT_RECEIVED,
        created_at__lte=cutoff,
        reminder_6h_dispatch_sent=False
    )
    
    reminders_sent = 0
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    for tx in transactions:
        seller = getattr(tx.link, 'seller', None)
        if not seller:
            continue

        msg = (
            f"DISPATCH REMINDER: Order {tx.paystack_reference} ({tx.link.title}) will be auto-cancelled in 6 hours if not dispatched. "
            f"Please log in to your dashboard and dispatch the order to avoid auto-refund and non-dispatch penalty fees."
        )
        
        s_phone = getattr(seller, 'phone_number', None)
        s_email = getattr(seller, 'email', None)
        if s_phone:
            dispatch_sms_task.delay(s_phone, msg)
        if s_email:
            dispatch_email_task.delay(s_email, f"URGENT: 6 Hours Left to Dispatch Order #{tx.paystack_reference}", msg)
            
        tx.reminder_6h_dispatch_sent = True
        tx.save(update_fields=['reminder_6h_dispatch_sent'])
        reminders_sent += 1
        
    return f"Sent {reminders_sent} 6-hour dispatch pre-expiry reminders."

@shared_task
def check_inspection_expiry_reminders():
    """
    Sends SMS & Email reminder to the buyer 6 hours before their inspection period expires.
    """
    from apps.escrow.api import get_inspection_hours_for_amount
    now = timezone.now()
    
    transactions = Transaction.objects.filter(
        status=TransactionStatus.INSPECTION_PERIOD,
        inspection_starts_at__isnull=False,
        reminder_6h_inspection_sent=False
    )
    
    reminders_sent = 0
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    for tx in transactions:
        total_inspection_hours = get_inspection_hours_for_amount(tx.total_amount_ghs)
        hours_elapsed = (now - tx.inspection_starts_at).total_seconds() / 3600.0
        hours_remaining = total_inspection_hours - hours_elapsed
        
        if 0 < hours_remaining <= 6.0:
            msg = (
                f"INSPECTION REMINDER: Your inspection period for order {tx.paystack_reference} ({tx.link.title}) will expire in {int(hours_remaining)} hours. "
                f"If you have any issues with your item, please open a dispute now before funds are released to the seller."
            )
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, f"Inspection Period Expiring Soon - Order #{tx.paystack_reference}", msg)
                
            tx.reminder_6h_inspection_sent = True
            tx.save(update_fields=['reminder_6h_inspection_sent'])
            reminders_sent += 1
            
    return f"Sent {reminders_sent} 6-hour inspection pre-expiry reminders."

@shared_task
def check_expired_dispatches():
    """
    Periodic task: Auto-cancels and refunds orders in PAYMENT_RECEIVED status 
    if the seller fails to dispatch within the configured shipping timeout limit.
    Refunds 100% to buyer and charges non-dispatch penalty to seller.
    """
    from apps.escrow.api import get_platform_settings
    now = timezone.now()
    cfg = get_platform_settings()
    timeout_days = cfg.get("shipping_timeout_days", 4)
    dispatch_cutoff = now - timedelta(days=timeout_days)
    
    transactions = Transaction.objects.filter(
        status=TransactionStatus.PAYMENT_RECEIVED,
        created_at__lte=dispatch_cutoff
    )
    
    expired_count = 0
    from apps.ledger.services import execute_non_dispatch_auto_refund
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    for tx in transactions:
        tx.status = TransactionStatus.REFUNDED
        tx.save(update_fields=['status', 'updated_at'])
        
        execute_non_dispatch_auto_refund(
            reference_id=str(tx.id),
            seller_user_id=tx.link.seller.id,
            gross_amount=tx.total_amount_ghs,
            platform_fee=tx.platform_fee_ghs
        )
        
        # Notify buyer
        b_msg = (
            f"Order Cancelled & 100% Refunded: Order {tx.paystack_reference} ({tx.link.title}) was not dispatched by the seller "
            f"within the required {timeout_days}-day limit. A full refund of GHS {tx.total_amount_ghs:.2f} has been processed back to your payment method."
        )
        dispatch_sms_task.delay(tx.buyer_phone, b_msg)
        if tx.buyer_email:
            dispatch_email_task.delay(tx.buyer_email, "Order Auto-Cancelled & Refunded (Non-Dispatch)", b_msg)
            
        # Notify seller
        seller = tx.link.seller
        s_msg = (
            f"Order Auto-Cancelled (Default Penalty): Order {tx.paystack_reference} ({tx.link.title}) was not dispatched within {timeout_days} days. "
            f"The buyer has been refunded 100%. A non-dispatch penalty (Platform fee + Paystack fees) has been charged to your account."
        )
        s_phone = getattr(seller, 'phone_number', None)
        s_email = getattr(seller, 'email', None)
        if s_phone: dispatch_sms_task.delay(s_phone, s_msg)
        if s_email: dispatch_email_task.delay(s_email, "Order Cancelled - Non-Dispatch Penalty", s_msg)
        
        expired_count += 1
        
    return f"Auto-refunded {expired_count} undispatched transactions older than {timeout_days} days."


@shared_task
def process_auto_return_refunds():
    """
    If a return has been dispatched > return_auto_refund_hours (default 48h) ago and is in RETURN_IN_PROGRESS status,
    automatically confirm return receipt and release full refund to buyer.
    """
    from apps.escrow.api import get_platform_settings
    now = timezone.now()
    cfg = get_platform_settings()
    auto_refund_hrs = cfg.get("return_auto_refund_hours", 48)

    transactions = Transaction.objects.filter(
        status=TransactionStatus.RETURN_IN_PROGRESS,
        return_dispatched_at__isnull=False,
        return_dispatched_at__lte=now - timedelta(hours=auto_refund_hrs)
    )

    refunded_count = 0
    from apps.ledger.services import execute_full_refund
    from apps.wallet.services import execute_refund_payout
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task

    for tx in transactions:
        tx.status = TransactionStatus.REFUNDED
        tx.save(update_fields=['status', 'updated_at'])

        execute_full_refund(
            reference_id=str(tx.id),
            seller_user_id=tx.link.seller.id,
            gross_amount=tx.total_amount_ghs,
            platform_fee=tx.platform_fee_ghs
        )

        execute_refund_payout(
            buyer_phone=tx.buyer_phone,
            buyer_email=tx.buyer_email,
            refund_amount=tx.total_amount_ghs,
            reference_id=str(tx.id)
        )

        b_msg = f"Auto-Refund Executed: Order {tx.paystack_reference} ({tx.link.title}) return delivery timeout ({auto_refund_hrs}h) reached. A full refund of GHS {tx.total_amount_ghs:.2f} has been issued to your payment method."
        dispatch_sms_task.delay(tx.buyer_phone, b_msg)
        if tx.buyer_email:
            dispatch_email_task.delay(tx.buyer_email, "Auto-Refund Executed for Returned Item", b_msg)

        refunded_count += 1

    return f"Auto-refunded {refunded_count} returned transactions older than {auto_refund_hrs} hours."


@shared_task
def check_pending_payments():
    """
    Periodic task (every 15 mins):
    1. Polls payment status for AWAITING_PAYMENT transactions created within the dynamic unpaid_auto_archive_days window (default 3 days).
    2. Auto-archives (is_archived=True) AWAITING_PAYMENT transactions older than unpaid_auto_archive_days (default 3 days / 72h).
    """
    from apps.escrow.api import get_platform_settings
    from apps.escrow.services import verify_payment_gateway_status
    now = timezone.now()
    cfg = get_platform_settings()
    archive_days = int(cfg.get("unpaid_auto_archive_days", 3))
    archive_cutoff = now - timedelta(days=archive_days)

    # 1. Poll gateway for pending transactions within the active window
    active_pending = Transaction.objects.filter(
        status=TransactionStatus.AWAITING_PAYMENT,
        created_at__gte=archive_cutoff
    )

    verified_count = 0
    for tx in active_pending:
        res = verify_payment_gateway_status(tx)
        if res.get("verified"):
            verified_count += 1

    # 2. Auto-archive transactions that remained AWAITING_PAYMENT past the archive_days limit
    stale_transactions = Transaction.objects.filter(
        status=TransactionStatus.AWAITING_PAYMENT,
        is_archived=False,
        created_at__lt=archive_cutoff
    )
    archived_count = stale_transactions.update(is_archived=True)

    return f"Verified {verified_count} pending payments. Auto-archived {archived_count} unpaid transactions older than {archive_days} days."

