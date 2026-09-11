import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch
from ninja_jwt.tokens import RefreshToken

from apps.users.models import User, Role
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.escrow.tasks import check_pending_payments

@pytest.fixture
def seller(db):
    return User.objects.create_user(
        username="pending_seller",
        email="seller@example.com",
        phone_number="0241002003",
        role=Role.SELLER
    )

@pytest.fixture
def payment_link(db, seller):
    return PaymentLink.objects.create(
        seller=seller,
        title="Pending Item",
        price_ghs=Decimal("150.00"),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

@pytest.fixture
def awaiting_tx(db, payment_link):
    return Transaction.objects.create(
        link=payment_link,
        buyer_name="John Pending",
        buyer_phone="0501234567",
        total_amount_ghs=Decimal("153.00"),
        platform_fee_ghs=Decimal("3.00"),
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference="REF_PENDING_123"
    )

def auth_cookie(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_COOKIE": f"access_token={token}"}

@pytest.mark.django_db
def test_manual_verify_payment_endpoint_success(client, seller, awaiting_tx):
    headers = auth_cookie(seller)
    with patch("apps.escrow.services.PaystackAdapter.verify_transaction") as mock_verify:
        mock_verify.return_value = {"status": "success", "reference": "REF_PENDING_123"}
        response = client.post(
            f"/api/v1/escrow/seller/transactions/{awaiting_tx.id}/verify-payment",
            **headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        assert data["status"] == TransactionStatus.PAYMENT_RECEIVED

        awaiting_tx.refresh_from_db()
        assert awaiting_tx.status == TransactionStatus.PAYMENT_RECEIVED
        assert awaiting_tx.is_archived is False

@pytest.mark.django_db
def test_manual_archive_and_unarchive_endpoints(client, seller, awaiting_tx):
    headers = auth_cookie(seller)
    
    # Archive
    res_arch = client.post(
        f"/api/v1/escrow/seller/transactions/{awaiting_tx.id}/archive",
        **headers
    )
    assert res_arch.status_code == 200
    assert res_arch.json()["is_archived"] is True
    awaiting_tx.refresh_from_db()
    assert awaiting_tx.is_archived is True

    # Unarchive
    res_unarch = client.post(
        f"/api/v1/escrow/seller/transactions/{awaiting_tx.id}/unarchive",
        **headers
    )
    assert res_unarch.status_code == 200
    assert res_unarch.json()["is_archived"] is False
    awaiting_tx.refresh_from_db()
    assert awaiting_tx.is_archived is False

@pytest.mark.django_db
def test_check_pending_payments_task_auto_archive(payment_link):
    old_time = timezone.now() - timedelta(days=4)
    old_tx = Transaction.objects.create(
        link=payment_link,
        buyer_name="Old Buyer",
        buyer_phone="0509998887",
        total_amount_ghs=Decimal("100.00"),
        platform_fee_ghs=Decimal("2.00"),
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference="REF_OLD_999"
    )
    # Manually update created_at timestamp
    Transaction.objects.filter(id=old_tx.id).update(created_at=old_time)

    with patch("apps.escrow.services.PaystackAdapter.verify_transaction") as mock_verify:
        mock_verify.return_value = {"status": "abandoned"}
        res = check_pending_payments()
        assert "Auto-archived 1 unpaid transactions" in res

    old_tx.refresh_from_db()
    assert old_tx.is_archived is True
