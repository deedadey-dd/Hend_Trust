from decimal import Decimal
from apps.escrow.models import Transaction, TransactionStatus
from apps.ledger.services import release_escrow_to_seller_wallet
from django.utils import timezone

class PayoutAdapter:
    @staticmethod
    def transfer_funds(destination_account: str, amount: float, reference: str):
        # Mocks a third-party API call (e.g., Paystack Transfers)
        print("==================================================")
        print(f"[MOCK PAYOUT API] Successfully transferred {amount:.2f} GHS to {destination_account}")
        print(f"Reference: {reference}")
        print("==================================================")
        return True

def execute_payout_for_transaction(transaction: Transaction):
    if transaction.status != TransactionStatus.COMPLETED:
        raise ValueError("Transaction must be COMPLETED to execute payout")

    gross_amount = transaction.total_amount_ghs
    platform_fee = transaction.platform_fee_ghs
    net_payout = gross_amount - platform_fee

    # 1. Always credit seller's wallet via double-entry ledger (this is the "funds arrived" event)
    release_escrow_to_seller_wallet(
        reference_id=str(transaction.id),
        seller_user_id=transaction.link.seller.id,
        gross_amount=gross_amount,
        platform_fee=platform_fee
    )

    # 2. Check seller's payout mode
    seller = transaction.link.seller
    payout_mode = getattr(seller, 'payout_mode', 'INSTANT')

    if payout_mode == 'INSTANT':
        # Immediately transfer to seller's external account, minus Paystack's 1.95% fee
        from apps.wallet.api import get_user_wallet
        from apps.wallet.services import execute_instant_payout

        wallet = get_user_wallet(seller)
        execute_instant_payout(
            wallet=wallet,
            net_payout_amount=net_payout,
            reference_id=str(transaction.id)
        )
        print(f"[INSTANT PAYOUT] Dispatched {net_payout:.2f} GHS payout for tx {transaction.paystack_reference}")
    else:
        # MANUAL mode: funds sit in wallet until seller withdraws
        print(f"[MANUAL PAYOUT] Funds held in wallet for seller {seller.username}. Balance updated.")

    # 3. Notify Seller & Buyer
    from apps.core.tasks import dispatch_sms_task, dispatch_email_task
    seller_msg = (
        f"Payout Released! GHS {net_payout:.2f} for order {transaction.paystack_reference} ({transaction.link.title}) "
        f"has been credited to your HendAxis Trust wallet."
    )
    seller_email = getattr(seller, 'email', None)
    seller_phone = getattr(seller, 'phone_number', None)
    if seller_email:
        dispatch_email_task.delay(seller_email, "Funds Released to Wallet", seller_msg)
    if seller_phone:
        dispatch_sms_task.delay(seller_phone, seller_msg)

    buyer_msg = (
        f"Order Completed! Your transaction {transaction.paystack_reference} for {transaction.link.title} "
        f"is complete. Thank you for using HendAxis Trust!"
    )
    dispatch_sms_task.delay(transaction.buyer_phone, buyer_msg)
    if transaction.buyer_email:
        dispatch_email_task.delay(transaction.buyer_email, "Transaction Completed", buyer_msg)
