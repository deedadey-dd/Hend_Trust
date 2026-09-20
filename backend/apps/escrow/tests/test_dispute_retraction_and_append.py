import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from ninja.testing import TestClient
from apps.users.models import User
from apps.links.models import PaymentLink
from apps.escrow.models import Transaction, TransactionStatus, PlatformSetting
from apps.reviews.models import SellerReview
from apps.escrow.api import escrow_router
from apps.reviews.api import reviews_router
from apps.checkout.api import checkout_router
from apps.escrow.tasks import check_expired_inspections
from ninja_jwt.tokens import AccessToken

def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def seller(db):
    return User.objects.create_user(username="dispute_seller", phone_number="0241112222", email="seller@dispute.com")

@pytest.fixture
def other_seller(db):
    return User.objects.create_user(username="other_seller", phone_number="0243334444", email="other@dispute.com")

@pytest.fixture
def link(db, seller):
    return PaymentLink.objects.create(seller=seller, title="iPhone 15 Pro", price_ghs=Decimal('3500.00'))

@pytest.fixture
def transaction(db, link):
    return Transaction.objects.create(
        link=link,
        buyer_name="Kwame Mensah",
        buyer_phone="0245556666",
        buyer_email="buyer@test.com",
        total_amount_ghs=Decimal('3500.00'),
        platform_fee_ghs=Decimal('62.50'),
        status=TransactionStatus.INSPECTION_PERIOD,
        paystack_reference="DISP_TX_001",
        inspection_starts_at=timezone.now()
    )

@pytest.fixture
def escrow_client():
    return TestClient(escrow_router)

@pytest.fixture
def reviews_client():
    return TestClient(reviews_router)

@pytest.fixture
def checkout_client():
    return TestClient(checkout_router)

@pytest.mark.django_db
def test_buyer_raise_and_append_dispute(escrow_client, transaction):
    # 1. Initial dispute raise
    res = escrow_client.post(f"/{transaction.id}/raise-dispute", json={
        "reason": "Screen has dead pixels",
        "photos": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII="]
    })
    assert res.status_code == 200
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DISPUTED
    assert "Screen has dead pixels" in transaction.buyer_dispute_reason
    assert len(transaction.buyer_dispute_photos) == 1

    # 2. Subsequent append of additional details & photos
    res2 = escrow_client.post(f"/{transaction.id}/raise-dispute", json={
        "reason": "Also noticed the charger is missing from box",
        "photos": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjAwMDAwAFAkCAc00xHYAAAAASUVORK5CYII="]
    })
    assert res2.status_code == 200
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DISPUTED
    assert "Screen has dead pixels" in transaction.buyer_dispute_reason
    assert "Buyer Update" in transaction.buyer_dispute_reason
    assert "Also noticed the charger is missing from box" in transaction.buyer_dispute_reason
    assert len(transaction.buyer_dispute_photos) == 2

@pytest.mark.django_db
def test_seller_dispute_response_append_and_photo_accumulation(escrow_client, seller, transaction):
    # Move to DISPUTED
    transaction.status = TransactionStatus.DISPUTED
    transaction.buyer_dispute_reason = "Defective device"
    transaction.save()

    headers = get_auth_headers(seller)

    # 1. First seller response with 1 photo
    res1 = escrow_client.post(
        f"/{transaction.id}/seller-dispute-response",
        json={
            "response": "Item was tested prior to dispatch.",
            "photos": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII="]
        },
        headers=headers
    )
    assert res1.status_code == 200
    transaction.refresh_from_db()
    assert transaction.seller_dispute_response == "Item was tested prior to dispatch."
    assert len(transaction.seller_dispute_photos) == 1

    # 2. Second seller response with another photo (should append text and accumulate photos)
    res2 = escrow_client.post(
        f"/{transaction.id}/seller-dispute-response",
        json={
            "response": "Attached the supplier test certificate and packaging slip.",
            "photos": [
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjAwMDAwAFAkCAc00xHYAAAAASUVORK5CYII="
            ]
        },
        headers=headers
    )
    assert res2.status_code == 200
    transaction.refresh_from_db()
    assert "Item was tested prior to dispatch." in transaction.seller_dispute_response
    assert "Seller Response" in transaction.seller_dispute_response
    assert "Attached the supplier test certificate" in transaction.seller_dispute_response
    assert len(transaction.seller_dispute_photos) == 2

@pytest.mark.django_db
def test_dispute_retraction_flow(escrow_client, transaction):
    # Set to DISPUTED
    transaction.status = TransactionStatus.DISPUTED
    transaction.buyer_dispute_reason = "Item not turning on"
    transaction.save()

    # Create a review to verify it gets deactivated / voided
    review = SellerReview.objects.create(
        transaction=transaction,
        seller=transaction.link.seller,
        buyer_name="Kwame",
        rating_speed=5,
        rating_communication=5,
        rating_overall=5,
        is_active=True
    )

    # Retract dispute
    res = escrow_client.post(f"/{transaction.id}/retract-dispute")
    assert res.status_code == 200
    assert "Dispute retracted successfully" in res.json()["message"]

    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.INSPECTION_PERIOD
    assert transaction.dispute_retracted_at is not None

    review.refresh_from_db()
    assert review.is_active is False

@pytest.mark.django_db
def test_review_permanently_blocked_after_dispute(reviews_client, escrow_client, transaction):
    # 1. Raise dispute
    escrow_client.post(f"/{transaction.id}/raise-dispute", json={
        "reason": "Defective item",
        "photos": []
    })
    transaction.refresh_from_db()

    # 2. Attempt to submit review while disputed
    res = reviews_client.post("/submit", json={
        "transaction_id": str(transaction.id),
        "review_token": transaction.buyer_review_token,
        "rating_speed": 4,
        "rating_communication": 4,
        "rating_overall": 4,
        "comment": "Nice"
    })
    assert res.status_code == 400
    msg = (res.json().get("detail", "") or res.json().get("message", "")).lower()
    assert "disabled" in msg or "dispute" in msg

    # 3. Retract dispute
    escrow_client.post(f"/{transaction.id}/retract-dispute")
    transaction.refresh_from_db()

    # 4. Attempt to submit review after retraction (must remain blocked)
    res2 = reviews_client.post("/submit", json={
        "transaction_id": str(transaction.id),
        "review_token": transaction.buyer_review_token,
        "rating_speed": 5,
        "rating_communication": 5,
        "rating_overall": 5,
        "comment": "Settled privately"
    })
    assert res2.status_code == 400
    msg2 = (res2.json().get("detail", "") or res2.json().get("message", "")).lower()
    assert "disabled" in msg2

@pytest.mark.django_db
def test_celery_check_expired_inspections_with_retraction(transaction, monkeypatch):
    # Set transaction as retracted 25 hours ago with 24h grace period
    transaction.status = TransactionStatus.INSPECTION_PERIOD
    transaction.dispute_retracted_at = timezone.now() - timedelta(hours=25)
    transaction.inspection_starts_at = timezone.now() - timedelta(hours=25)
    transaction.save()

    # Mock execute_payout_for_transaction
    payout_called = []
    def mock_payout(tx):
        payout_called.append(tx.id)
    monkeypatch.setattr("apps.escrow.tasks.execute_payout_for_transaction", mock_payout)

    check_expired_inspections()

    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.COMPLETED
    assert len(payout_called) == 1
