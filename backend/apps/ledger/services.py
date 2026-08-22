from django.db import transaction
from decimal import Decimal
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType
from apps.ledger.exceptions import LedgerImbalanceException
from django.db.models import F

def _get_system_account(name: str, default_type: str) -> LedgerAccount:
    account, _ = LedgerAccount.objects.get_or_create(
        name=name,
        defaults={'account_type': default_type}
    )
    return account

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

    sys_bank = _get_system_account('SYSTEM_BANK_ASSET', AccountType.ASSET)
    fee_expense = _get_system_account('PAYSTACK_FEE_EXPENSE', AccountType.EXPENSE)
    escrow = _get_system_account('BUYER_ESCROW_DEPOSIT', AccountType.LIABILITY)

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

    escrow = _get_system_account('BUYER_ESCROW_DEPOSIT', AccountType.LIABILITY)
    revenue = _get_system_account('PLATFORM_FEE_REVENUE', AccountType.REVENUE)
    
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
    escrow = _get_system_account('BUYER_ESCROW_DEPOSIT', AccountType.LIABILITY)
    sys_bank = _get_system_account('SYSTEM_BANK_ASSET', AccountType.ASSET)
    revenue = _get_system_account('PLATFORM_FEE_REVENUE', AccountType.REVENUE)
    
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

@transaction.atomic
def execute_partial_refund(
    reference_id: str, 
    seller_user_id, 
    refund_amount_ghs: Decimal, 
    seller_amount_ghs: Decimal, 
    platform_retained_fee_ghs: Decimal
):
    """
    Executes a partial refund settlement:
    1. Refund `refund_amount_ghs` to Buyer (Debit BUYER_ESCROW_DEPOSIT -> Credit SYSTEM_BANK_ASSET)
    2. Release `seller_amount_ghs` to Seller (Debit BUYER_ESCROW_DEPOSIT -> Credit SELLER_INTERNAL_WALLET)
    3. Credit `platform_retained_fee_ghs` to Platform Revenue (Debit BUYER_ESCROW_DEPOSIT -> Credit PLATFORM_FEE_REVENUE)
    """
    escrow = _get_system_account('BUYER_ESCROW_DEPOSIT', AccountType.LIABILITY)
    sys_bank = _get_system_account('SYSTEM_BANK_ASSET', AccountType.ASSET)
    revenue = _get_system_account('PLATFORM_FEE_REVENUE', AccountType.REVENUE)
    
    seller_wallet, _ = LedgerAccount.objects.get_or_create(
        name=f'SELLER_INTERNAL_WALLET_{seller_user_id}',
        defaults={
            'account_type': AccountType.LIABILITY,
            'user_id': seller_user_id
        }
    )

    # Leg 1: Refund Buyer portion
    if refund_amount_ghs > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=escrow,
            credit_account=sys_bank,
            amount_ghs=refund_amount_ghs,
            entry_type="PARTIAL_REFUND_BUYER"
        )
        _apply_entry_to_balances(escrow, sys_bank, refund_amount_ghs)

    # Leg 2: Seller portion
    if seller_amount_ghs > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=escrow,
            credit_account=seller_wallet,
            amount_ghs=seller_amount_ghs,
            entry_type="PARTIAL_REFUND_SELLER"
        )
        _apply_entry_to_balances(escrow, seller_wallet, seller_amount_ghs)
        
        # Sync seller wallet object
        from apps.wallet.models import SellerWallet
        wallet = SellerWallet.objects.filter(user_id=seller_user_id).first()
        if wallet:
            wallet.available_balance_ghs = seller_wallet.balance
            wallet.save(update_fields=['available_balance_ghs', 'updated_at'])

    # Leg 3: Retained platform fee
    if platform_retained_fee_ghs > 0:
        LedgerEntry.objects.create(
            reference_id=reference_id,
            debit_account=escrow,
            credit_account=revenue,
            amount_ghs=platform_retained_fee_ghs,
            entry_type="PARTIAL_REFUND_PLATFORM_FEE"
        )
        _apply_entry_to_balances(escrow, revenue, platform_retained_fee_ghs)

@transaction.atomic
def record_ad_promotion_fee(reference_id, seller_user_id, fee_amount: Decimal):
    """
    Debits SELLER_INTERNAL_WALLET and Credits PLATFORM_FEE_REVENUE for paid shop promotion advertising.
    Also syncs SellerWallet.available_balance_ghs.
    """
    revenue = _get_system_account('PLATFORM_FEE_REVENUE', AccountType.REVENUE)
    seller_wallet, _ = LedgerAccount.objects.get_or_create(
        name=f'SELLER_INTERNAL_WALLET_{seller_user_id}',
        defaults={
            'account_type': AccountType.LIABILITY,
            'user_id': seller_user_id
        }
    )
    
    LedgerEntry.objects.create(
        reference_id=reference_id,
        debit_account=seller_wallet,
        credit_account=revenue,
        amount_ghs=fee_amount,
        entry_type="SHOP_PROMOTION_AD_FEE"
    )
    _apply_entry_to_balances(seller_wallet, revenue, fee_amount)
    
    from apps.wallet.models import SellerWallet
    wallet = SellerWallet.objects.filter(user_id=seller_user_id).first()
    if wallet:
        wallet.available_balance_ghs = seller_wallet.balance
        wallet.save(update_fields=['available_balance_ghs', 'updated_at'])



