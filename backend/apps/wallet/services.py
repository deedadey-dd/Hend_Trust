from decimal import Decimal
from django.db import transaction
from ninja.errors import HttpError
from apps.wallet.models import SellerWallet
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from apps.ledger.services import _apply_entry_to_balances
from apps.escrow.payouts import PayoutAdapter
import uuid

def sync_wallet_balance(wallet: SellerWallet) -> SellerWallet:
    """
    Synchronizes the available_balance_ghs directly with the underlying ledger account.
    This guarantees spendable funds strictly adhere to double-entry accounting.
    """
    wallet.ledger_account.refresh_from_db()
    
    # Assuming SELLER_INTERNAL_WALLET is a liability (credit balance increases it)
    # The balance field naturally stores it. So we just copy it over.
    wallet.available_balance_ghs = wallet.ledger_account.balance
    wallet.save(update_fields=['available_balance_ghs', 'updated_at'])
    return wallet

@transaction.atomic
def execute_withdrawal(wallet: SellerWallet, amount: Decimal, destination_type: str, destination_account: str):
    sync_wallet_balance(wallet)
    
    if amount <= Decimal('0.00'):
        raise HttpError(400, "Withdrawal amount must be greater than zero.")
        
    if amount > wallet.available_balance_ghs:
        raise HttpError(400, "Insufficient funds.")
        
    # Double-entry ledger logic for withdrawal
    payout_liability, _ = LedgerAccount.objects.get_or_create(
        name='PAYOUT_CLEARING_LIABILITY',
        defaults={'account_type': AccountType.LIABILITY}
    )
    
    ref_id = uuid.uuid4()
    
    # Entry 1: Debit Seller Internal Wallet (Liability decreases)
    # Entry 2: Credit Payout Clearing Liability (Liability increases)
    LedgerEntry.objects.create(
        reference_id=ref_id,
        debit_account=wallet.ledger_account,
        credit_account=payout_liability,
        amount_ghs=amount,
        entry_type="SELLER_WITHDRAWAL_REQUEST"
    )
    
    _apply_entry_to_balances(wallet.ledger_account, payout_liability, amount)
    
    # Sync wallet balance again post-withdrawal
    sync_wallet_balance(wallet)
    
    # Mock payout to actual bank/momo
    PayoutAdapter.transfer_funds(
        destination_account=destination_account,
        amount=float(amount),
        reference=str(ref_id)
    )
    
    return True
