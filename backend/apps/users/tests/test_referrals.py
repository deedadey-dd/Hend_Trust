import pytest
from decimal import Decimal
from django.utils import timezone
from apps.users.models import User, Referral, ReferralStatus
from apps.users.referrals import get_user_referral_stats, apply_referral_code, process_transaction_referral_rewards
from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink


@pytest.mark.django_db
class TestReferralEngine:

    def test_user_auto_generates_referral_code(self):
        user = User.objects.create_user(
            username='kofi_deals',
            email='kofi@example.com',
            password='Password123!',
            phone_number='+233240001111'
        )
        assert user.referral_code is not None
        assert user.referral_code.startswith('KOFIDEAL')

    def test_apply_referral_code_success(self):
        referrer = User.objects.create_user(
            username='ama_shop',
            email='ama@example.com',
            password='Password123!',
            phone_number='+233240002222'
        )
        referee = User.objects.create_user(
            username='kwame_buyer',
            email='kwame@example.com',
            password='Password123!',
            phone_number='+233240003333'
        )

        res = apply_referral_code(referee, referrer.referral_code)
        assert res['success'] is True
        assert res['referrer_username'] == 'ama_shop'

        referee.refresh_from_db()
        assert referee.referred_by == referrer

        referral = Referral.objects.get(referred_user=referee)
        assert referral.referrer == referrer
        assert referral.status == ReferralStatus.PENDING

    def test_cannot_self_refer(self):
        user = User.objects.create_user(
            username='self_user',
            email='self@example.com',
            password='Password123!',
            phone_number='+233240004444'
        )
        res = apply_referral_code(user, user.referral_code)
        assert res['success'] is False
        assert "own referral code" in res['message']

    def test_referral_rewards_credited_on_completed_transaction(self):
        referrer = User.objects.create_user(
            username='top_seller',
            email='top@example.com',
            password='Password123!',
            phone_number='+233240005555'
        )
        new_seller = User.objects.create_user(
            username='new_merchant',
            email='newm@example.com',
            password='Password123!',
            phone_number='+233240006666'
        )
        apply_referral_code(new_seller, referrer.referral_code)

        link = PaymentLink.objects.create(
            seller=new_seller,
            title="iPhone 13 Pro Max",
            price_ghs=Decimal('4500.00'),
            description="Brand new sealed"
        )
        tx = Transaction.objects.create(
            link=link,
            total_amount_ghs=Decimal('4500.00'),
            platform_fee_ghs=Decimal('157.50'),
            paystack_reference="TREF_TEST_REF_001",
            status=TransactionStatus.COMPLETED,
            buyer_phone="+233240007777",
            buyer_name="Adwoa Buyer"
        )

        rewarded = process_transaction_referral_rewards(tx)
        assert len(rewarded) == 1

        referrer.refresh_from_db()
        new_seller.refresh_from_db()

        assert referrer.wallet_bonus_credits_ghs == Decimal('15.00')
        assert new_seller.wallet_bonus_credits_ghs == Decimal('10.00')

        referral = Referral.objects.get(referred_user=new_seller)
        assert referral.status == ReferralStatus.COMPLETED
        assert referral.completed_transaction == tx

        stats = get_user_referral_stats(referrer)
        assert stats['total_referrals'] == 1
        assert stats['completed_referrals'] == 1
        assert stats['total_earned_ghs'] == 15.0

    def test_dynamic_referral_config_persistence_and_reward_values(self):
        from apps.users.referrals import get_referral_config, save_referral_config

        # Update referral config to new amounts
        updated = save_referral_config({
            "referral_program_active": True,
            "referrer_reward_ghs": 25.00,
            "referee_reward_ghs": 20.00,
            "min_order_amount_for_referral_ghs": 100.00,
            "max_referrals_per_user": 100
        })

        assert updated["referrer_reward_ghs"] == Decimal("25.00")
        assert updated["referee_reward_ghs"] == Decimal("20.00")
        assert updated["min_order_amount_for_referral_ghs"] == Decimal("100.00")

        cfg = get_referral_config()
        assert cfg["referrer_reward_ghs"] == Decimal("25.00")
        assert cfg["referee_reward_ghs"] == Decimal("20.00")

        # Test new referral inherits the updated config values
        ref1 = User.objects.create_user(username='top_user1', email='top1@example.com', password='Password123!', phone_number='+233241112222')
        ref2 = User.objects.create_user(username='new_user2', email='new2@example.com', password='Password123!', phone_number='+233241113333')

        res = apply_referral_code(ref2, ref1.referral_code)
        assert res['success'] is True

        referral_rec = Referral.objects.get(referred_user=ref2)
        assert referral_rec.reward_amount_ghs == Decimal("25.00")
        assert referral_rec.referee_discount_ghs == Decimal("20.00")

