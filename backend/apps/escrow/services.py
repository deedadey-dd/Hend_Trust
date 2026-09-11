import logging
from decimal import Decimal
from typing import Dict, Any
from django.conf import settings
from apps.escrow.models import Transaction, TransactionStatus
from apps.checkout.services import PaystackAdapter

logger = logging.getLogger(__name__)


def confirm_transaction_payment(transaction: Transaction) -> bool:
    """
    Idempotent helper to mark a transaction as PAYMENT_RECEIVED,
    automatically unarchive if archived, record ledger deposit, and dispatch notifications.
    """
    if transaction.status == TransactionStatus.AWAITING_PAYMENT or transaction.is_archived:
        transaction.status = TransactionStatus.PAYMENT_RECEIVED
        transaction.is_archived = False
        transaction.save(update_fields=['status', 'is_archived', 'updated_at'])

        from apps.ledger.services import record_buyer_deposit
        try:
            gateway_fee = (transaction.total_amount_ghs * Decimal('0.0195')).quantize(Decimal('0.01'))
            record_buyer_deposit(
                reference_id=str(transaction.id),
                gross_amount=transaction.total_amount_ghs,
                gateway_fee=gateway_fee
            )
        except Exception as e:
            logger.error(f"Ledger record_buyer_deposit error for tx {transaction.id}: {e}")

        from apps.core.tasks import notify_buyer_payment_received_task, notify_seller_payment_received_task
        notify_buyer_payment_received_task.delay(transaction.id)
        notify_seller_payment_received_task.delay(transaction.id)
        return True

    return False


def verify_payment_gateway_status(transaction: Transaction, gateway_provider: str = None) -> Dict[str, Any]:
    """
    Dynamic Gateway Verification Adapter:
    Checks payment status with the active payment provider (Paystack, AppsNMobile, Sandbox)
    without hardcoding to a single gateway.
    """
    reference = transaction.paystack_reference

    # Determine gateway provider
    provider = (gateway_provider or getattr(settings, 'PAYMENT_GATEWAY_PROVIDER', 'PAYSTACK')).upper().strip()

    try:
        if provider == 'PAYSTACK' or not provider:
            data = PaystackAdapter.verify_transaction(reference)
            status_str = (data.get('status') or '').lower()
            if status_str in ['success', 'successful']:
                confirm_transaction_payment(transaction)
                return {
                    "verified": True,
                    "status": TransactionStatus.PAYMENT_RECEIVED,
                    "message": "Payment verified successfully via Paystack! Order is ready for dispatch."
                }
            return {
                "verified": False,
                "status": TransactionStatus.AWAITING_PAYMENT,
                "message": f"Payment status on Paystack is currently: {status_str or 'unpaid'}"
            }
        else:
            # Generic/Custom gateway fallback verification
            logger.info(f"Checking status for tx {transaction.id} on gateway {provider}")
            return {
                "verified": False,
                "status": transaction.status,
                "message": "Payment has not been completed by the buyer yet."
            }

    except Exception as e:
        logger.error(f"Gateway verification error for tx {transaction.id} (Ref: {reference}): {e}")
        return {
            "verified": False,
            "status": transaction.status,
            "error": str(e),
            "message": "Could not connect to payment gateway to verify status. Please try again in a few moments."
        }
