import pytest
from decimal import Decimal
from ninja.testing import TestClient
from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from apps.reviews.models import SellerReview
from apps.reviews.api import reviews_router
from apps.escrow.api import escrow_router

@pytest.fixture
def seller(db):
    return User.objects.create_user(username="star_seller", shop_name="Star Electronics Store", phone_number="0241112223")

@pytest.fixture
def link(seller, db):
    return PaymentLink.objects.create(seller=seller, title="Smartphone", price_ghs=Decimal('500.00'), fee_handling=FeeHandling.PASS_TO_BUYER)

@pytest.fixture
def completed_transaction(link, db):
    return Transaction.objects.create(
        link=link,
        buyer_phone="0249998887",
        buyer_email="buyer@test.com",
        total_amount_ghs=Decimal('517.50'),
        platform_fee_ghs=Decimal('17.50'),
        status=TransactionStatus.COMPLETED,
        paystack_reference="REF_REVIEW_TEST"
    )

@pytest.fixture
def reviews_client():
    return TestClient(reviews_router)

@pytest.fixture
def escrow_client():
    return TestClient(escrow_router)

@pytest.mark.django_db
def test_submit_review_success(reviews_client, completed_transaction):
    payload = {
        "transaction_id": str(completed_transaction.id),
        "rating_speed": 5,
        "rating_communication": 4,
        "rating_overall": 5,
        "comment": "Excellent service and ultra-fast shipping!"
    }
    
    res = reviews_client.post("/submit", json=payload)
    assert res.status_code == 200
    assert "published to the seller's storefront profile" in res.json()['message']
    
    review = SellerReview.objects.get(transaction=completed_transaction)
    assert review.seller == completed_transaction.link.seller
    assert review.rating_speed == 5
    assert review.rating_communication == 4
    assert review.rating_overall == 5
    assert review.comment == "Excellent service and ultra-fast shipping!"
    assert review.is_active is True

@pytest.mark.django_db
def test_dispute_deactivates_buyer_review(reviews_client, escrow_client, completed_transaction):
    # 1. Submit review first
    reviews_client.post("/submit", json={
        "transaction_id": str(completed_transaction.id),
        "rating_speed": 4,
        "rating_communication": 4,
        "rating_overall": 4,
        "comment": "Good item."
    })
    
    review = SellerReview.objects.get(transaction=completed_transaction)
    assert review.is_active is True
    
    # 2. Buyer raises dispute
    completed_transaction.status = TransactionStatus.INSPECTION_PERIOD
    completed_transaction.save()
    
    res = escrow_client.post(f"/{completed_transaction.id}/raise-dispute", json={"reason": "Defective screen", "photos": []})
    assert res.status_code == 200
    
    # Review should now be deactivated
    review.refresh_from_db()
    assert review.is_active is False

@pytest.mark.django_db
def test_fetch_seller_reviews_aggregate(reviews_client, seller, link, db):
    # Create 2 completed transactions and reviews
    t1 = Transaction.objects.create(link=link, buyer_phone="0241", total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('10.00'), status=TransactionStatus.COMPLETED, paystack_reference="R1")
    t2 = Transaction.objects.create(link=link, buyer_phone="0242", total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('10.00'), status=TransactionStatus.COMPLETED, paystack_reference="R2")
    
    SellerReview.objects.create(seller=seller, transaction=t1, rating_speed=5, rating_communication=5, rating_overall=5, comment="Top seller")
    SellerReview.objects.create(seller=seller, transaction=t2, rating_speed=3, rating_communication=3, rating_overall=3, comment="Average")
    
    res = reviews_client.get(f"/seller/{seller.username}")
    assert res.status_code == 200
    data = res.json()
    assert data['total_reviews_count'] == 2
    assert data['avg_speed'] == 4.0
    assert data['avg_communication'] == 4.0
    assert data['avg_overall'] == 4.0
