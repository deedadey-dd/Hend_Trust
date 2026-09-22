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

    # 1b. Record promotional fee subsidy in ledger if platform fee was discounted
    total_subsidy = (
        (transaction.promo_discount_ghs or Decimal('0.00')) +
        (transaction.credit_discount_ghs or Decimal('0.00')) +
        (transaction.seasonal_fee_discount_ghs or Decimal('0.00')) +
        (transaction.seller_fee_offset_applied_ghs or Decimal('0.00'))
    )
    if total_subsidy > Decimal('0.00'):
        try:
            from apps.ledger.services import record_promotions_subsidy
            record_promotions_subsidy(reference_id=str(transaction.id), subsidy_amount=total_subsidy)
        except Exception as promo_ledger_err:
            print(f"[PROMO LEDGER ERROR] tx {transaction.id}: {promo_ledger_err}")

    # 1c. If seller fee offset was applied, debit seller bonus credit ledger
    seller = getattr(getattr(transaction, 'link', None), 'seller', None)
    if seller and transaction.seller_fee_offset_applied_ghs > Decimal('0.00'):
        try:
            from apps.escrow.models import SellerRewardLedgerEntry, SellerRewardEntryType
            from apps.users.models import User
            s_locked = User.objects.get(id=seller.id)
            s_locked.wallet_bonus_credits_ghs = max(Decimal('0.00'), (s_locked.wallet_bonus_credits_ghs or Decimal('0.00')) - transaction.seller_fee_offset_applied_ghs)
            s_locked.save(update_fields=['wallet_bonus_credits_ghs'])

            SellerRewardLedgerEntry.objects.create(
                seller=s_locked,
                amount_ghs=transaction.seller_fee_offset_applied_ghs,
                entry_type=SellerRewardEntryType.REDEEMED,
                reference_id=str(transaction.id),
                notes=f"Offset platform fee by GHS {transaction.seller_fee_offset_applied_ghs:.2f} on Order {transaction.paystack_reference}"
            )
        except Exception as offset_err:
            print(f"[SELLER OFFSET LEDGER ERROR] tx {transaction.id}: {offset_err}")

    # 2. Check seller's payout mode
    payout_mode = getattr(seller, 'payout_mode', 'INSTANT') if seller else 'INSTANT'

    if payout_mode == 'INSTANT' and seller:
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
        print(f"[MANUAL PAYOUT] Funds held in wallet for seller {getattr(seller, 'username', 'N/A')}. Balance updated.")

    # 3. Process any pending referral rewards
    try:
        from apps.users.referrals import process_transaction_referral_rewards
        process_transaction_referral_rewards(transaction)
    except Exception as ref_err:
        print(f"[REFERRAL PROCESSING ERROR] tx {transaction.id}: {ref_err}")

    # 3b. Process Buyer Loyalty Reward & Seller Milestone Reward Grants & Active Reward Campaigns
    try:
        from apps.escrow.services_promo import award_buyer_loyalty_reward, award_seller_milestone_reward, award_transaction_reward_campaigns
        award_buyer_loyalty_reward(transaction)
        award_seller_milestone_reward(transaction)
        award_transaction_reward_campaigns(transaction)
    except Exception as reward_err:
        print(f"[PROMO REWARD ERROR] tx {transaction.id}: {reward_err}")

    # 4. Notify Seller & Buyer
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
