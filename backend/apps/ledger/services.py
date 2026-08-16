from django.db import transaction
from decimal import Decimal
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from apps.ledger.exceptions import LedgerImbalanceException
from django.db.models import F

def _apply_entry_to_balances(debit_account, credit_account, amount):
    """
    Updates the balances of the debit and credit accounts based on their account types.
    ASSET/EXPENSE: Debit increases (+), Credit decreases (-)
    LIABILITY/REVENUE: Credit increases (+), Debit decreases (-)
    """
    # Debit logic
    if debit_account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
        debit_account.balance = F('balance') + amount
    else:
        debit_account.balance = F('balance') - amount
    debit_account.save(update_fields=['balance'])

    # Credit logic
    if credit_account.account_type in [AccountType.LIABILITY, AccountType.REVENUE]:
        credit_account.balance = F('balance') + amount
    else:
        credit_account.balance = F('balance') - amount
    credit_account.save(update_fields=['balance'])

@transaction.atomic
def record_buyer_deposit(reference_id: str, gross_amount: Decimal, gateway_fee: Decimal):
    """
    Debit SYSTEM_BANK_ASSET (gross_amount - gateway_fee)
    Debit PAYSTACK_FEE_EXPENSE (gateway_fee)
    Credit BUYER_ESCROW_DEPOSIT (gross_amount)
    """
    net_amount = gross_amount - gateway_fee
    
    # Validate balance mathematically
    total_debits = net_amount + gateway_fee
    total_credits = gross_amount
    if total_debits != total_credits:
        raise LedgerImbalanceException(f"Imbalance in deposit: Debits {total_debits} != Credits {total_credits}")

    sys_bank = LedgerAccount.objects.get(name='SYSTEM_BANK_ASSET')
    fee_expense = LedgerAccount.objects.get(name='PAYSTACK_FEE_EXPENSE')
    escrow = LedgerAccount.objects.get(name='BUYER_ESCROW_DEPOSIT')

    # Entry 1: Net Amount
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=sys_bank,
        credit_account=escrow,
        amount_ghs=net_amount,
        entry_type="BUYER_DEPOSIT_NET"
    )
    _apply_entry_to_balances(sys_bank, escrow, net_amount)

    # Entry 2: Gateway Fee
    if gateway_fee > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=fee_expense,
            credit_account=escrow,
            amount_ghs=gateway_fee,
            entry_type="BUYER_DEPOSIT_FEE"
        )
        _apply_entry_to_balances(fee_expense, escrow, gateway_fee)


@transaction.atomic
def release_escrow_to_seller_wallet(reference_id: str, seller_user_id, gross_amount: Decimal, platform_fee: Decimal):
    """
    Debit BUYER_ESCROW_DEPOSIT (gross_amount)
    Credit PLATFORM_FEE_REVENUE (platform_fee)
    Credit SELLER_INTERNAL_WALLET (gross_amount - platform_fee)
    """
    net_amount = gross_amount - platform_fee
    
    total_debits = gross_amount
    total_credits = platform_fee + net_amount
    if total_debits != total_credits:
        raise LedgerImbalanceException(f"Imbalance in release: Debits {total_debits} != Credits {total_credits}")

    escrow = LedgerAccount.objects.get(name='BUYER_ESCROW_DEPOSIT')
    revenue = LedgerAccount.objects.get(name='PLATFORM_FEE_REVENUE')
    
    seller_wallet, _ = LedgerAccount.objects.get_or_create(
        name=f'SELLER_INTERNAL_WALLET_{seller_user_id}',
        defaults={
            'account_type': AccountType.LIABILITY,
            'user_id': seller_user_id
        }
    )

    # Entry 1: Platform Fee
    if platform_fee > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=escrow,
            credit_account=revenue,
            amount_ghs=platform_fee,
            entry_type="ESCROW_RELEASE_FEE"
        )
        _apply_entry_to_balances(escrow, revenue, platform_fee)

    # Entry 2: Seller Net Release
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=escrow,
        credit_account=seller_wallet,
        amount_ghs=net_amount,
        entry_type="ESCROW_RELEASE_NET"
    )
    _apply_entry_to_balances(escrow, seller_wallet, net_amount)

@transaction.atomic
def execute_full_refund(reference_id: str, seller_user_id, gross_amount: Decimal, platform_fee: Decimal):
    """
    Debit BUYER_ESCROW_DEPOSIT (gross_amount)
    Credit SYSTEM_BANK_ASSET (gross_amount)
    Debit SELLER_INTERNAL_WALLET (platform_fee)
    Credit PLATFORM_FEE_REVENUE (platform_fee)
    """
    escrow = LedgerAccount.objects.get(name='BUYER_ESCROW_DEPOSIT')
    sys_bank = LedgerAccount.objects.get(name='SYSTEM_BANK_ASSET')
    revenue = LedgerAccount.objects.get(name='PLATFORM_FEE_REVENUE')
    
    seller_wallet, _ = LedgerAccount.objects.get_or_create(
        name=f'SELLER_INTERNAL_WALLET_{seller_user_id}',
        defaults={
            'account_type': AccountType.LIABILITY,
            'user_id': seller_user_id
        }
    )

    # Leg 1: Refund Buyer 100% of gross
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=escrow,
        credit_account=sys_bank,
        amount_ghs=gross_amount,
        entry_type="FULL_REFUND_BUYER"
    )
    _apply_entry_to_balances(escrow, sys_bank, gross_amount)

    # Leg 2: Charge Seller for Platform Fee (if fee > 0)
    if platform_fee > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=seller_wallet,
            credit_account=revenue,
            amount_ghs=platform_fee,
            entry_type="REFUND_FEE_PENALTY"
        )
        _apply_entry_to_balances(seller_wallet, revenue, platform_fee)

