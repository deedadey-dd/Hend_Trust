from decimal import Decimal
from apps.escrow.models import Transaction, TransactionStatus
from apps.ledger.services import release_escrow_to_seller_wallet
from django.utils import timezone

class PayoutAdapter:
    @staticmethod
    def transfer_funds(destination_account: str, amount: float, reference: str):
        # Mocks a third-party API call (e.g., Paystack Transfers)
        print("==================================================")
        print(f"[MOCK PAYOUT API] Successfully transferred {amount} GHS to {destination_account}")
        print(f"Reference: {reference}")
        print("==================================================")
        return True

def execute_payout_for_transaction(transaction: Transaction):
    if transaction.status != TransactionStatus.COMPLETED:
        raise ValueError("Transaction must be COMPLETED to execute payout")

    gross_amount = transaction.total_amount_ghs
    platform_fee = transaction.platform_fee_ghs

    # 1. Trigger atomic Double-Entry Ledger settlement
    release_escrow_to_seller_wallet(
        reference_id=str(transaction.id),
        seller_user_id=transaction.link.seller.id,
        gross_amount=gross_amount,
        platform_fee=platform_fee
    )

    # Calculate exactly how much the seller is owed after platform fees
    net_payout = float(gross_amount - platform_fee)
    
    # In reality, fetch seller's preferred payout destination from their profile. Mocked for now.
    mock_destination_account = f"MOMO_0551234567"

    # 2. Trigger Mock External Payout Network
    PayoutAdapter.transfer_funds(
        destination_account=mock_destination_account,
        amount=net_payout,
        reference=str(transaction.id)
    )
