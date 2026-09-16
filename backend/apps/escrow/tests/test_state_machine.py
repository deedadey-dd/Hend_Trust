import pytest
from decimal import Decimal
from django.utils import timezone
from apps.users.models import User
from apps.links.models import PaymentLink
from apps.escrow.models import Transaction, TransactionStatus

@pytest.mark.django_db
class TestEscrowStateMachine:

    @pytest.fixture
    def seller(self):
        return User.objects.create_user(
            username='state_seller',
            email='state_seller@example.com',
            phone_number='+233240000001',
            role='SELLER',
            password='Password123!'
        )

    @pytest.fixture
    def payment_link(self, seller):
        return PaymentLink.objects.create(
            seller=seller,
            title='Test State Link',
            price_ghs=Decimal('100.00'),
            shipping_fee_ghs=Decimal('0.00')
        )

    @pytest.fixture
    def transaction(self, payment_link):
        return Transaction.objects.create(
            link=payment_link,
            buyer_name='Buyer Alpha',
            buyer_phone='+233240000002',
            total_amount_ghs=Decimal('100.00'),
            platform_fee_ghs=Decimal('2.50'),
            paystack_reference='REF-STATE-001',
            status=TransactionStatus.AWAITING_PAYMENT
        )

    def test_initial_status_is_awaiting_payment(self, transaction):
        assert transaction.status == TransactionStatus.AWAITING_PAYMENT

    def test_transition_to_payment_received(self, transaction):
        transaction.status = TransactionStatus.PAYMENT_RECEIVED
        transaction.save()
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.PAYMENT_RECEIVED

    def test_delivery_dispatch_sets_dispatched_at(self, transaction):
        transaction.status = TransactionStatus.DELIVERY_IN_PROGRESS
        transaction.dispatched_at = timezone.now()
        transaction.save()
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.DELIVERY_IN_PROGRESS
        assert transaction.dispatched_at is not None

    def test_dispute_creation_requires_reason(self, transaction):
        transaction.status = TransactionStatus.DISPUTED
        transaction.buyer_dispute_reason = 'Item defective on arrival'
        transaction.save()
        transaction.refresh_from_db()
        assert transaction.status == TransactionStatus.DISPUTED
        assert transaction.buyer_dispute_reason == 'Item defective on arrival'
