from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.payouts import execute_payout_for_transaction

@shared_task
def check_expired_inspections():
    """
    Periodic task to automatically complete transactions where the 
    inspection period has expired without a dispute.
    Tiers:
    - < 2000 GHS: 24 hours
    - 2000 - 9999.99 GHS: 48 hours
    - >= 10000 GHS: 72 hours
    """
    now = timezone.now()
    
    transactions = Transaction.objects.filter(
        status=TransactionStatus.INSPECTION_PERIOD,
        inspection_starts_at__isnull=False
    )
    
    completed_count = 0
    for transaction in transactions:
        amount = transaction.total_amount_ghs
        
        if amount < 2000:
            duration = timedelta(hours=24)
        elif amount < 10000:
            duration = timedelta(hours=48)
        else:
            duration = timedelta(hours=72)
            
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
    If 48 hours have passed since dispatch and the buyer hasn't acted,
    automatically mark it as delivered and start the inspection period
    (Option B / Informal Bus only).
    """
    now = timezone.now()
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
        
        if hours_since_dispatch >= 48:
            transition_to_inspection(tx)
            
            hours = 72 if tx.total_amount_ghs >= 10000 else 48 if tx.total_amount_ghs >= 2000 else 24
            msg = (
                f"Your order {tx.paystack_reference} has been marked as Delivered due to 48h of inactivity. "
                f"Your {hours}-hour inspection period has started. Raise a dispute now if needed."
            )
            dispatch_sms_task.delay(tx.buyer_phone, msg)
            if tx.buyer_email:
                dispatch_email_task.delay(tx.buyer_email, "Order Marked as Delivered", msg)
                
            auto_delivered_count += 1
            
    return f"Auto-delivered {auto_delivered_count} transactions."
