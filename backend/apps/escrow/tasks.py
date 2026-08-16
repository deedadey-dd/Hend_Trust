from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.payouts import execute_payout_for_transaction

@shared_task
def check_expired_inspections():
    """
    Periodic task to automatically complete transactions where the 48-hour 
    inspection period has expired without a dispute.
    """
    forty_eight_hours_ago = timezone.now() - timedelta(hours=48)
    
    expired_transactions = Transaction.objects.filter(
        status=TransactionStatus.INSPECTION_PERIOD,
        inspection_starts_at__lte=forty_eight_hours_ago
    )
    
    completed_count = 0
    for transaction in expired_transactions:
        # 1. Update status to completed
        transaction.status = TransactionStatus.COMPLETED
        transaction.save(update_fields=['status', 'updated_at'])
        
        # 2. Trigger auto-payout & ledger settlement
        execute_payout_for_transaction(transaction)
        completed_count += 1
        
    return f"Processed {completed_count} expired inspections."
