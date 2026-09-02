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
    if the item hasn't been confirmed received (Option B / Informal Bus only).
    """
    now = timezone.now()
    transactions = Transaction.objects.filter(
        status=TransactionStatus.DELIVERY_IN_PROGRESS,
        dispatched_at__isnull=False,
        delivery_logs__delivery_method='INFORMAL_BUS'
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
            
        # 42-hour reminder
        elif 42 <= hours_since_dispatch < 48 and not tx.reminder_42h_sent:
            msg = f"Final Reminder: Order {tx.paystack_reference} will be automatically marked as Delivered soon. Please log in now."
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Final Confirm Receipt Reminder", msg)
            tx.reminder_42h_sent = True
            tx.save(update_fields=['reminder_42h_sent'])
            reminders_sent += 1

    return f"Sent {reminders_sent} delivery reminders."

@shared_task
def process_auto_deliveries():
    """
    If auto-delivery hours have passed since dispatch and the buyer hasn't acted,
    automatically mark it as delivered and start the inspection period
    (Option B / Informal Bus only).
    """
    from apps.escrow.api import get_platform_settings, get_inspection_hours_for_amount
    now = timezone.now()
    cfg = get_platform_settings()
    auto_del_hrs = cfg.get("auto_delivery_hours", 48)

    transactions = Transaction.objects.filter(
        status=TransactionStatus.DELIVERY_IN_PROGRESS,
        dispatched_at__isnull=False,
        delivery_logs__delivery_method='INFORMAL_BUS'
    ).distinct()
    
    auto_delivered_count = 0
    from apps.delivery.services import transition_to_inspection
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    
    for tx in transactions:
        hours_since_dispatch = (now - tx.dispatched_at).total_seconds() / 3600.0
        
        if hours_since_dispatch >= auto_del_hrs:
            transition_to_inspection(tx)
            
            hours = get_inspection_hours_for_amount(tx.total_amount_ghs)
            msg = (
                f"Your order {tx.paystack_reference} has been marked as Delivered due to {auto_del_hrs}h of inactivity. "
                f"Your {hours}-hour inspection period has started. Raise a dispute now if needed."
            )
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Order Marked as Delivered", msg)
                
            auto_delivered_count += 1
            
    return f"Auto-delivered {auto_delivered_count} transactions."

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
