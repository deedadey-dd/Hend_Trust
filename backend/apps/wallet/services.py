from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from ninja.errors import HttpError
from apps.wallet.models import SellerWallet
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from apps.ledger.services import _apply_entry_to_balances
from apps.escrow.payouts import PayoutAdapter
import uuid

PAYSTACK_TRANSFER_FEE_RATE = Decimal('0.0195')  # 1.95%

def sync_wallet_balance(wallet: SellerWallet) -> SellerWallet:
    """
    Synchronizes the available_balance_ghs directly with the underlying ledger account.
    This guarantees spendable funds strictly adhere to double-entry accounting.
    """
    wallet.ledger_account.refresh_from_db()
    wallet.available_balance_ghs = wallet.ledger_account.balance
    wallet.save(update_fields=['available_balance_ghs', 'updated_at'])
    return wallet

def calculate_paystack_fee(gross_amount: Decimal) -> Decimal:
    """Calculate the 1.95% Paystack transfer fee, rounded to 2 decimal places."""
    return (gross_amount * PAYSTACK_TRANSFER_FEE_RATE).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def _get_or_create_fee_account(name: str, account_type: str) -> LedgerAccount:
    account, _ = LedgerAccount.objects.get_or_create(
        name=name,
        defaults={'account_type': account_type}
    )
    return account

@transaction.atomic
def execute_instant_payout(wallet: SellerWallet, net_payout_amount: Decimal, reference_id: str):
    """
    Execute an instant payout for a COMPLETED transaction.
    Deducts 1.95% Paystack transfer fee from the net payout.
    Records the fee as a PAYSTACK_PAYOUT_FEE ledger entry.
    """
    paystack_fee = calculate_paystack_fee(net_payout_amount)
    amount_after_fee = net_payout_amount - paystack_fee
    
    fee_expense_account = _get_or_create_fee_account('PAYSTACK_FEES_EXPENSE', AccountType.ASSET)
    
    # Record the Paystack fee as a separate ledger entry
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=fee_expense_account,
        credit_account=wallet.ledger_account,
        amount_ghs=paystack_fee,
        entry_type="PAYSTACK_PAYOUT_FEE"
    )
    _apply_entry_to_balances(fee_expense_account, wallet.ledger_account, paystack_fee)

    # Track cumulative fees
    wallet.total_paystack_fees_ghs = Decimal(str(wallet.total_paystack_fees_ghs)) + paystack_fee
    wallet.save(update_fields=['total_paystack_fees_ghs', 'updated_at'])
    
    sync_wallet_balance(wallet)

    # Determine payout destination
    if wallet.preferred_payout_type == 'MOMO' and wallet.momo_number:
        destination = wallet.momo_number
    elif wallet.preferred_payout_type == 'BANK' and wallet.bank_account_number:
        destination = wallet.bank_account_number
    else:
        destination = f"UNCONFIGURED_WALLET_{wallet.user.id}"

    PayoutAdapter.transfer_funds(
        destination_account=destination,
        amount=float(amount_after_fee),
        reference=reference_id
    )
    return True

@transaction.atomic
def execute_withdrawal(wallet: SellerWallet, amount: Decimal, destination_type: str, destination_account: str):
    sync_wallet_balance(wallet)
    
    if amount <= Decimal('0.00'):
        raise HttpError(400, "Withdrawal amount must be greater than zero.")
    
    paystack_fee = calculate_paystack_fee(amount)
    total_deducted = amount + paystack_fee

    if total_deducted > wallet.available_balance_ghs:
        raise HttpError(400, f"Insufficient funds. Requested GHS {amount} + 1.95% Paystack fee (GHS {paystack_fee}) = GHS {total_deducted}. Available: GHS {wallet.available_balance_ghs}.")
        
    payout_liability, _ = LedgerAccount.objects.get_or_create(
        name='PAYOUT_CLEARING_LIABILITY',
        defaults={'account_type': AccountType.LIABILITY}
    )
    fee_expense_account = _get_or_create_fee_account('PAYSTACK_FEES_EXPENSE', AccountType.ASSET)
    
    ref_id = uuid.uuid4()
    
    # Entry 1: Debit Seller Wallet for the gross withdrawal amount
    LedgerEntry.objects.create(
        reference_id=ref_id,
        debit_account=wallet.ledger_account,
        credit_account=payout_liability,
        amount_ghs=amount,
        entry_type="SELLER_WITHDRAWAL_REQUEST"
    )
    _apply_entry_to_balances(wallet.ledger_account, payout_liability, amount)
    
    # Entry 2: Record the Paystack transfer fee
    LedgerEntry.objects.create(
        reference_id=ref_id,
        debit_account=wallet.ledger_account,
        credit_account=fee_expense_account,
        amount_ghs=paystack_fee,
        entry_type="PAYSTACK_PAYOUT_FEE"
    )
    _apply_entry_to_balances(wallet.ledger_account, fee_expense_account, paystack_fee)
    
    # Track cumulative fees
    wallet.total_paystack_fees_ghs = Decimal(str(wallet.total_paystack_fees_ghs)) + paystack_fee
    wallet.save(update_fields=['total_paystack_fees_ghs', 'updated_at'])
    
    sync_wallet_balance(wallet)
    
    # Actual net amount transferred to seller
    net_to_seller = amount - paystack_fee
    PayoutAdapter.transfer_funds(
        destination_account=destination_account,
        amount=float(net_to_seller),
        reference=str(ref_id)
    )
    
    return True

@transaction.atomic
def execute_refund_payout(buyer_phone: str, buyer_email: str, refund_amount: Decimal, reference_id: str):
    """
    Execute a refund transfer back to a buyer.
    Deducts 1.95% Paystack transfer fee from the refund amount.
    Records the fee as a PAYSTACK_REFUND_FEE ledger entry.
    """
    paystack_fee = calculate_paystack_fee(refund_amount)
    amount_after_fee = refund_amount - paystack_fee
    
    # Log the refund fee against a platform expense account
    platform_expense, _ = LedgerAccount.objects.get_or_create(
        name='PAYSTACK_REFUND_FEES_EXPENSE',
        defaults={'account_type': AccountType.ASSET}
    )
    escrow_account, _ = LedgerAccount.objects.get_or_create(
        name='ESCROW_HOLDING',
        defaults={'account_type': AccountType.LIABILITY}
    )
    
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=platform_expense,
        credit_account=escrow_account,
        amount_ghs=paystack_fee,
        entry_type="PAYSTACK_REFUND_FEE"
    )
    _apply_entry_to_balances(platform_expense, escrow_account, paystack_fee)
    
    # Trigger the refund transfer
    destination = buyer_phone or buyer_email or "UNKNOWN_BUYER"
    PayoutAdapter.transfer_funds(
        destination_account=destination,
        amount=float(amount_after_fee),
        reference=reference_id
    )
    return True
