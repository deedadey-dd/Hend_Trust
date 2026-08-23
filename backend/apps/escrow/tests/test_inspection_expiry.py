import pytest
from datetime import timedelta
from freezegun import freeze_time
from django.utils import timezone
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.tasks import check_expired_inspections
from decimal import Decimal
from django.contrib.auth import get_user_model

@pytest.fixture
def transaction_factory(db):
    from apps.ledger.models import LedgerAccount
    # Ensure system ledger accounts exist for payouts
    LedgerAccount.objects.get_or_create(name='BUYER_ESCROW_DEPOSIT', defaults={'account_type': 'LIABILITY'})
    LedgerAccount.objects.get_or_create(name='PLATFORM_FEE_REVENUE', defaults={'account_type': 'EQUITY'})
    LedgerAccount.objects.get_or_create(name='USER_WALLET', defaults={'account_type': 'LIABILITY'})

    User = get_user_model()
    
    def _create_transaction(**kwargs):
        from apps.links.models import PaymentLink
        # Create user and link first
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        user = User.objects.create_user(username=f"testuser_{unique_id}", phone_number=f"1234_{unique_id}")
        link = PaymentLink.objects.create(
            seller=user,
            title="Test Link",
            price_ghs=Decimal('100.00'),
            description="Test"
        )
        
        defaults = {
            'link': link,
            'buyer_name': 'Test Buyer',
            'buyer_phone': '0555555555',
            'buyer_email': 'buyer@example.com',
            'shipping_address': '123 Test St',
            'status': TransactionStatus.INSPECTION_PERIOD,
            'total_amount_ghs': Decimal('100.00'),
            'platform_fee_ghs': Decimal('1.95'),
            'paystack_reference': 'TESTREF',
            'inspection_starts_at': timezone.now()
        }
        defaults.update(kwargs)
        return Transaction.objects.create(**defaults)
    
    return _create_transaction

@pytest.mark.django_db
class TestInspectionExpiry:
    
    @freeze_time("2026-08-01 12:00:00")
    def test_tiered_inspection_expiries(self, transaction_factory):
        # Setup: Create 3 transactions in INSPECTION_PERIOD at the exact frozen time
        # Tier 1: < 2000 (expires in 24h)
        txn1 = transaction_factory(
            total_amount_ghs=Decimal('1500.00'),
            paystack_reference='REF1'
        )
        # Tier 2: < 10000 (expires in 48h)
        txn2 = transaction_factory(
            total_amount_ghs=Decimal('5000.00'),
            paystack_reference='REF2'
        )
        # Tier 3: >= 10000 (expires in 72h)
        txn3 = transaction_factory(
            total_amount_ghs=Decimal('15000.00'),
            paystack_reference='REF3'
        )
        
        # Scenario 1: Fast forward 25 hours
        with freeze_time("2026-08-02 13:00:00"):
            result = check_expired_inspections()
            assert "Processed 1 expired inspections." in result
            
            txn1.refresh_from_db()
            txn2.refresh_from_db()
            txn3.refresh_from_db()
            
            assert txn1.status == TransactionStatus.COMPLETED
            assert txn2.status == TransactionStatus.INSPECTION_PERIOD
            assert txn3.status == TransactionStatus.INSPECTION_PERIOD

        # Scenario 2: Fast forward 50 hours from original
        with freeze_time("2026-08-03 14:00:00"):
            result = check_expired_inspections()
            assert "Processed 1 expired inspections." in result
            
            txn2.refresh_from_db()
            txn3.refresh_from_db()
            
            assert txn2.status == TransactionStatus.COMPLETED
            assert txn3.status == TransactionStatus.INSPECTION_PERIOD

        # Scenario 3: Fast forward 75 hours from original
        with freeze_time("2026-08-04 15:00:00"):
            result = check_expired_inspections()
            assert "Processed 1 expired inspections." in result
            
            txn3.refresh_from_db()
            assert txn3.status == TransactionStatus.COMPLETED

    @freeze_time("2026-08-01 12:00:00")
    def test_check_expired_dispatches(self, transaction_factory):
        txn = transaction_factory(
            status=TransactionStatus.PAYMENT_RECEIVED,
            total_amount_ghs=Decimal('200.00'),
            platform_fee_ghs=Decimal('10.00'),
            paystack_reference='DISPATCH_EXPIRE_REF'
        )
        
        from apps.escrow.tasks import check_expired_dispatches
        
        with freeze_time("2026-08-04 11:00:00"):
            res = check_expired_dispatches()
            txn.refresh_from_db()
            assert txn.status == TransactionStatus.PAYMENT_RECEIVED
            
        with freeze_time("2026-08-05 13:00:00"):
            res = check_expired_dispatches()
            assert "Auto-refunded 1 undispatched transactions" in res
            txn.refresh_from_db()
            assert txn.status == TransactionStatus.REFUNDED
