import pytest
from decimal import Decimal
from datetime import timedelta
from freezegun import freeze_time
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import Client
from ninja_jwt.tokens import RefreshToken
from apps.escrow.models import (
    Transaction, TransactionStatus, BuyerIdentity, 
    BuyerCreditLedgerEntry, BuyerCreditEntryType
)
from apps.escrow.tasks import check_pending_cancellation_requests, process_cancellation_payout_holds
from apps.links.models import PaymentLink
from apps.ledger.models import LedgerAccount

User = get_user_model()


@pytest.fixture
def setup_cancellation_env(db):
    # Ensure ledger accounts exist
    LedgerAccount.objects.get_or_create(name='BUYER_ESCROW_DEPOSIT', defaults={'account_type': 'LIABILITY'})
    LedgerAccount.objects.get_or_create(name='PLATFORM_FEE_REVENUE', defaults={'account_type': 'EQUITY'})
    LedgerAccount.objects.get_or_create(name='USER_WALLET', defaults={'account_type': 'LIABILITY'})
    LedgerAccount.objects.get_or_create(name='PAYMENT_GATEWAY_FEES', defaults={'account_type': 'EXPENSE'})

    seller = User.objects.create_user(
        username="cancelseller",
        email="cancelseller@example.com",
        phone_number="0244111222",
        role="SELLER"
    )
    buyer_user = User.objects.create_user(
        username="cancelbuyer",
        email="cancelbuyer@example.com",
        phone_number="0555999888",
        role="BUYER"
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Test Cancellation Product",
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('20.00'),
        fee_handling='PASS_TO_BUYER',
        description="Cancellation testing link"
    )
    return {
        'seller': seller,
        'buyer_user': buyer_user,
        'link': link
    }


@pytest.mark.django_db
class TestBuyerCancellation:

    @freeze_time("2026-10-10 10:00:00")
    def test_guest_buyer_must_provide_password_to_cancel(self, setup_cancellation_env):
        """Guest buyers without account must be forced to provide password to cancel."""
        env = setup_cancellation_env
        client = Client()

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='New Guest Buyer',
            buyer_phone='0555777111',
            buyer_email='newguest@example.com',
            shipping_address='Kumasi Mall',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_GUEST_CANCEL_001',
            created_at=timezone.now()
        )

        # Preview confirms has_existing_account is False
        prev_res = client.get(f"/api/v1/escrow/{txn.id}/cancel-preview")
        assert prev_res.status_code == 200
        assert prev_res.json()['has_existing_account'] is False

        # Attempting to cancel without password is REJECTED
        no_pwd_res = client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'No password attempt'},
            content_type='application/json'
        )
        assert no_pwd_res.status_code == 400
        err_msg = no_pwd_res.json().get('detail', '') or no_pwd_res.json().get('message', '')
        assert "account" in err_msg.lower()

        # Providing password creates account, logs buyer in, and executes cancellation grace initiation
        cancel_res = client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Changed my mind', 'password': 'SecurePassword123!'},
            content_type='application/json'
        )
        assert cancel_res.status_code == 200
        data = cancel_res.json()
        assert "cancellation initiated" in data['message'].lower() or "grace" in data['message'].lower()
        assert data['token'] is not None
        assert data['user_id'] is not None

        # Verify new buyer user was created in DB
        new_buyer = User.objects.filter(email='newguest@example.com').first()
        assert new_buyer is not None
        assert new_buyer.role == 'BUYER'
        assert new_buyer.is_phone_verified is True

        # Verify transaction status & grace period
        txn.refresh_from_db()
        assert txn.cancellation_requested_at is not None
        assert txn.cancellation_payout_status == 'PENDING_CONFIRMATION'
        assert txn.cancellation_grace_until is not None

    @freeze_time("2026-10-10 10:00:00")
    def test_cancel_preview_and_grace_initiation(self, setup_cancellation_env):
        env = setup_cancellation_env
        client = Client()

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_001',
            created_at=timezone.now()
        )

        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)
        res = client.get(f"/api/v1/escrow/{txn.id}/cancel-preview")
        assert res.status_code == 200
        data = res.json()
        assert data['is_undispatched'] is True
        assert data['gross_amount_ghs'] == 223.90
        assert data['platform_fee_ghs'] == 3.90
        assert data['payout_transfer_fee_percent'] == 1.95
        assert data['momo_payout_fee_ghs'] == 4.20
        assert data['has_existing_account'] is True
        assert data['wallet_net_refund_ghs'] == 215.63
        assert data['momo_net_refund_ghs'] == 211.43
        assert data['cancellation_dispatch_grace_minutes'] == 90
        assert data['cancellation_payout_hold_hours'] == 90

        # Execute Buyer Cancellation
        cancel_res = client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Changed my mind'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )
        assert cancel_res.status_code == 200
        assert "90 minutes" in cancel_res.json().get('message', '').lower() or "cancellation initiated" in cancel_res.json().get('message', '').lower()

        # Verify Transaction in DB
        txn.refresh_from_db()
        assert txn.cancellation_requested_at is not None
        assert txn.cancellation_payout_status == 'PENDING_CONFIRMATION'
        assert txn.cancellation_grace_until == timezone.now() + timedelta(minutes=90)

    @freeze_time("2026-10-10 10:00:00")
    def test_cannot_cancel_if_dispatched(self, setup_cancellation_env):
        env = setup_cancellation_env
        client = Client()
        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.DELIVERY_IN_PROGRESS,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_002',
            created_at=timezone.now()
        )

        res = client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Changed my mind'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )
        assert res.status_code == 400
        detail_msg = res.json().get('detail', '') or res.json().get('message', '')
        assert "dispatched" in detail_msg.lower()

    @freeze_time("2026-10-10 10:00:00")
    def test_seller_rejects_cancellation_by_providing_dispatch_proof(self, setup_cancellation_env):
        """During 90m grace, seller can submit dispatch proof to halt cancellation."""
        env = setup_cancellation_env
        client = Client()
        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)
        seller_token = str(RefreshToken.for_user(env['seller']).access_token)

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_REJECT_001',
            created_at=timezone.now()
        )

        # Buyer initiates cancellation
        client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Trying to cancel late'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )
        txn.refresh_from_db()
        assert txn.cancellation_payout_status == 'PENDING_CONFIRMATION'

        # Seller rejects cancellation by confirming shipped
        rej_res = client.post(
            f"/api/v1/escrow/seller/transactions/{txn.id}/reject-cancellation-shipped",
            data={
                'carrier': 'Speedaf Express',
                'waybill': 'SPF-GH-998822',
                'proof_notes': 'Dropped off at 9:45 AM before buyer cancelled'
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {seller_token}"
        )
        assert rej_res.status_code == 200
        assert "dispatch proof recorded" in rej_res.json()['message'].lower() or "delivery in progress" in rej_res.json()['message'].lower()

        txn.refresh_from_db()
        assert txn.status == TransactionStatus.DELIVERY_IN_PROGRESS
        assert txn.cancellation_payout_status == 'CANCELLED_REJECTED'
        assert txn.cancellation_seller_reported_shipped is True
        assert txn.cancellation_seller_carrier == 'Speedaf Express'
        assert txn.cancellation_seller_waybill == 'SPF-GH-998822'

    @freeze_time("2026-10-10 10:00:00")
    def test_seller_accepts_cancellation_and_enters_90h_safety_hold(self, setup_cancellation_env):
        """Seller can accept cancellation during 90m window, moving to 90h safety hold."""
        env = setup_cancellation_env
        client = Client()
        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)
        seller_token = str(RefreshToken.for_user(env['seller']).access_token)

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_ACCEPT_001',
            created_at=timezone.now()
        )

        # Buyer initiates cancellation
        client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Buyer changed mind'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )

        # Seller accepts cancellation
        accept_res = client.post(
            f"/api/v1/escrow/seller/transactions/{txn.id}/accept-cancellation",
            HTTP_AUTHORIZATION=f"Bearer {seller_token}"
        )
        assert accept_res.status_code == 200
        assert "accepted" in accept_res.json()['message'].lower()

        txn.refresh_from_db()
        assert txn.status == TransactionStatus.REFUNDED
        assert txn.buyer_cancelled is True
        assert txn.cancellation_payout_status == 'HELD_DELAYED'
        assert txn.cancellation_payout_hold_until == timezone.now() + timedelta(minutes=90)
        assert txn.cancellation_refund_amount_ghs > 0

    @freeze_time("2026-10-10 10:00:00")
    def test_celery_task_auto_confirms_after_90m_grace_window(self, setup_cancellation_env):
        """Celery auto-confirms cancellation if 90m grace elapses without seller response."""
        env = setup_cancellation_env
        client = Client()
        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_AUTO_001',
            created_at=timezone.now()
        )

        # Buyer requests cancel at 10:00
        client.post(
            f"/api/v1/escrow/{txn.id}/buyer-cancel",
            data={'refund_target': 'MOMO_PAYOUT', 'reason': 'Late delivery concern'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )

        # At 10:45 (45m later, still within 90m grace) -> Celery does NOT auto-confirm
        with freeze_time("2026-10-10 10:45:00"):
            check_pending_cancellation_requests()
            txn.refresh_from_db()
            assert txn.status == TransactionStatus.PAYMENT_RECEIVED
            assert txn.cancellation_payout_status == 'PENDING_CONFIRMATION'

        # At 11:35 (95m later, grace expired) -> Celery auto-confirms and sets 90m safety hold
        with freeze_time("2026-10-10 11:35:00"):
            check_pending_cancellation_requests()
            txn.refresh_from_db()
            assert txn.status == TransactionStatus.REFUNDED
            assert txn.buyer_cancelled is True
            assert txn.cancellation_auto_resolved is True
            assert txn.cancellation_payout_status == 'HELD_DELAYED'
            assert txn.cancellation_payout_hold_until == timezone.now() + timedelta(minutes=90)

    @freeze_time("2026-10-10 10:00:00")
    def test_seller_freezes_payout_during_90m_safety_hold(self, setup_cancellation_env):
        """During 90m safety hold, seller can report prior dispatch to freeze payout and escalate."""
        env = setup_cancellation_env
        client = Client()
        seller_token = str(RefreshToken.for_user(env['seller']).access_token)

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.CANCELLED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_FREEZE_001',
            created_at=timezone.now(),
            cancellation_payout_status='HELD_DELAYED',
            cancellation_payout_hold_until=timezone.now() + timedelta(minutes=90)
        )

        freeze_res = client.post(
            f"/api/v1/escrow/seller/transactions/{txn.id}/report-shipped-freeze",
            data={
                'carrier': 'VIP Bus Lines',
                'waybill': 'VIP-ACC-KMS-0044',
                'proof_notes': 'Dispatched at 9:00 AM before order was cancelled. Physical waybill verified.'
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {seller_token}"
        )
        assert freeze_res.status_code == 200
        assert "frozen" in freeze_res.json()['message'].lower()

        txn.refresh_from_db()
        assert txn.status == TransactionStatus.DISPUTED
        assert txn.cancellation_payout_status == 'FROZEN_ARBITRATION'
        assert txn.cancellation_seller_reported_shipped is True
        assert txn.cancellation_seller_carrier == 'VIP Bus Lines'
        assert txn.cancellation_seller_waybill == 'VIP-ACC-KMS-0044'

    @freeze_time("2026-10-10 10:00:00")
    def test_celery_task_releases_matured_cancellation_payout(self, setup_cancellation_env):
        """Celery process_cancellation_payout_holds releases payout once 90 minutes expire."""
        env = setup_cancellation_env

        txn = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.CANCELLED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_MATURE_001',
            created_at=timezone.now(),
            cancellation_refund_target='MOMO_PAYOUT',
            cancellation_refund_amount_ghs=Decimal('211.43'),
            cancellation_payout_status='HELD_DELAYED',
            cancellation_payout_hold_until=timezone.now() + timedelta(minutes=90)
        )

        # At 45 minutes (before 90m maturity) -> not processed
        with freeze_time("2026-10-10 10:45:00"):
            process_cancellation_payout_holds()
            txn.refresh_from_db()
            assert txn.cancellation_payout_status == 'HELD_DELAYED'

        # At 95 minutes -> processed
        with freeze_time("2026-10-10 11:35:00"):
            process_cancellation_payout_holds()
            txn.refresh_from_db()
            assert txn.cancellation_payout_status == 'PROCESSED'

    @freeze_time("2026-10-10 10:00:00")
    def test_buyer_monthly_cancellation_rate_limit(self, setup_cancellation_env):
        """Buyers are limited to 2 cancellations per 30-day window."""
        env = setup_cancellation_env
        client = Client()
        buyer_token = str(RefreshToken.for_user(env['buyer_user']).access_token)

        # Create 2 prior cancellations for this buyer
        for i in range(2):
            Transaction.objects.create(
                link=env['link'],
                buyer_name='Cancel Buyer',
                buyer_phone='0555999888',
                buyer_email='cancelbuyer@example.com',
                shipping_address='Accra Digital Center',
                status=TransactionStatus.CANCELLED,
                total_amount_ghs=Decimal('223.90'),
                platform_fee_ghs=Decimal('3.90'),
                paystack_reference=f'TEST_CANCEL_LIMIT_{i}',
                created_at=timezone.now() - timedelta(days=2),
                buyer_cancelled=True,
                cancellation_requested_at=timezone.now() - timedelta(days=2)
            )

        # 3rd transaction attempt to cancel within the same month
        txn3 = Transaction.objects.create(
            link=env['link'],
            buyer_name='Cancel Buyer',
            buyer_phone='0555999888',
            buyer_email='cancelbuyer@example.com',
            shipping_address='Accra Digital Center',
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('223.90'),
            platform_fee_ghs=Decimal('3.90'),
            paystack_reference='TEST_CANCEL_LIMIT_3',
            created_at=timezone.now()
        )

        res = client.post(
            f"/api/v1/escrow/{txn3.id}/buyer-cancel",
            data={'refund_target': 'WALLET', 'reason': 'Cancelling again'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f"Bearer {buyer_token}"
        )
        assert res.status_code == 400
        msg = res.json().get('detail', '') or res.json().get('message', '')
        assert "monthly cancellation limit" in msg.lower() or "limit" in msg.lower()
