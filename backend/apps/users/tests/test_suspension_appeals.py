"""
Tests for:
  - Rating-based seller warning (< warning_threshold)
  - Rating-based auto-suspension (< suspension_threshold)
  - Suspension appeal submission (POST /profile/appeal-suspension)
  - Rejection of appeal by non-suspended user
  - Duplicate pending appeal prevention
  - Admin approval of appeal (reinstates seller)
  - Admin rejection of appeal (seller stays suspended)
  - GET /admin/appeals listing
"""
import pytest
from decimal import Decimal
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
from apps.users.models import User
from apps.escrow.api import admin_router, compute_seller_dispute_health
from apps.users.api import profile_router
from apps.users.models import SuspensionAppeal, AppealStatus
from apps.reviews.models import SellerReview
from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink


def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seller(db):
    return User.objects.create_user(
        username="ratingtestseller",
        email="ratingtest@example.com",
        password="TestPass123!",
        phone_number="+233200000099",
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="adminreviewer",
        email="adminreviewer@example.com",
        password="AdminPass123!",
        phone_number="+233200000098",
        is_superuser=True,
        is_staff=True,
    )


def _create_reviews(seller, ratings: list):
    """Helper: create SellerReview records with specified rating_overall values."""
    for i, r in enumerate(ratings):
        link = PaymentLink.objects.create(seller=seller, title=f"Link {i}", price_ghs=Decimal("100.00"))
        txn = Transaction.objects.create(
            link=link,
            buyer_name=f"Buyer {i}",
            buyer_phone=f"+23320000{i:04d}",
            total_amount_ghs=Decimal("100.00"),
            platform_fee_ghs=Decimal("5.00"),
            status=TransactionStatus.COMPLETED,
            paystack_reference=f"RATING_TEST_{i}_{id(seller)}_{i}",
        )
        SellerReview.objects.create(
            transaction=txn,
            seller=seller,
            buyer_name=f"Buyer {i}",
            rating_speed=r,
            rating_communication=r,
            rating_overall=r,
            is_active=True,
        )


@pytest.mark.django_db
def test_rating_warning_banner_level(seller):
    """Seller with 3 reviews averaging 2.67 stars should get RATING_WARNING (not suspended)."""
    _create_reviews(seller, [2, 3, 3])  # avg = 2.67 < 3.0 threshold
    health = compute_seller_dispute_health(seller)
    assert health["dispute_level"] == "RATING_WARNING"
    assert health["rating_warning"] is True
    assert health["is_suspended"] is False
    assert health["avg_rating"] is not None
    assert health["avg_rating"] < health["rating_warning_threshold"]


@pytest.mark.django_db
def test_rating_auto_suspension(seller):
    """Seller with 3 reviews averaging 1.67 stars should be auto-suspended."""
    _create_reviews(seller, [1, 2, 2])  # avg = 1.67 < 2.0 threshold
    health = compute_seller_dispute_health(seller)
    seller.refresh_from_db()
    assert health["dispute_level"] == "SUSPENDED"
    assert seller.is_suspended is True
    assert "Automated Suspension" in seller.suspension_reason
    assert "rating" in seller.suspension_reason.lower()


@pytest.mark.django_db
def test_rating_no_action_with_few_reviews(seller):
    """Seller with < 3 reviews should not be evaluated for rating thresholds."""
    _create_reviews(seller, [1, 1])  # avg = 1.0 but only 2 reviews — below minimum count
    health = compute_seller_dispute_health(seller)
    assert health["rating_warning"] is False
    seller.refresh_from_db()
    assert not seller.is_suspended


@pytest.mark.django_db
def test_appeal_submission_by_suspended_seller(seller):
    """Suspended seller can submit an appeal via the profile router."""
    seller.is_suspended = True
    seller.suspension_reason = "Test suspension"
    seller.save()

    client = TestClient(profile_router, headers=get_auth_headers(seller))
    res = client.post(
        "/appeal-suspension",
        json={"reason": "I did not violate any rules and would like my account reinstated."},
    )
    assert res.status_code == 200, res.json()
    data = res.json()
    assert "appeal_id" in data
    assert data["status"] == AppealStatus.PENDING

    appeal = SuspensionAppeal.objects.get(id=data["appeal_id"])
    assert appeal.user == seller
    assert appeal.status == AppealStatus.PENDING


@pytest.mark.django_db
def test_appeal_submission_rejected_for_non_suspended(seller):
    """Non-suspended seller cannot submit an appeal."""
    client = TestClient(profile_router, headers=get_auth_headers(seller))
    res = client.post(
        "/appeal-suspension",
        json={"reason": "I want to appeal even though I am not suspended at all."},
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_duplicate_pending_appeal_blocked(seller):
    """Submitting a second appeal while one is pending should fail."""
    seller.is_suspended = True
    seller.save()
    SuspensionAppeal.objects.create(user=seller, reason="First appeal reason text here that is long enough.")

    client = TestClient(profile_router, headers=get_auth_headers(seller))
    res = client.post(
        "/appeal-suspension",
        json={"reason": "Second appeal reason which is also detailed enough to pass validation."},
    )
    assert res.status_code == 400
    assert "pending" in res.json()["detail"].lower()


@pytest.mark.django_db
def test_admin_approves_appeal_reinstates_seller(seller, admin_user):
    """Admin approval of appeal should reinstate the seller."""
    seller.is_suspended = True
    seller.suspension_reason = "Rating too low"
    seller.save()
    appeal = SuspensionAppeal.objects.create(user=seller, reason="I improved significantly, please review.")

    client = TestClient(admin_router, headers=get_auth_headers(admin_user))
    res = client.post(
        f"/appeals/{appeal.id}/review",
        json={"decision": "APPROVE", "admin_notes": "Approved after review."},
    )
    assert res.status_code == 200, res.json()
    data = res.json()
    assert data["status"] == AppealStatus.APPROVED

    appeal.refresh_from_db()
    assert appeal.status == AppealStatus.APPROVED
    assert appeal.reviewed_by == admin_user

    seller.refresh_from_db()
    assert seller.is_suspended is False
    assert seller.suspension_reason == ""


@pytest.mark.django_db
def test_admin_rejects_appeal_seller_stays_suspended(seller, admin_user):
    """Admin rejection of appeal should keep seller suspended."""
    seller.is_suspended = True
    seller.suspension_reason = "Dispute rate too high"
    seller.save()
    appeal = SuspensionAppeal.objects.create(user=seller, reason="I want my account back please and will do better.")

    client = TestClient(admin_router, headers=get_auth_headers(admin_user))
    res = client.post(
        f"/appeals/{appeal.id}/review",
        json={"decision": "REJECT", "admin_notes": "Insufficient improvement evidence."},
    )
    assert res.status_code == 200, res.json()
    data = res.json()
    assert data["status"] == AppealStatus.REJECTED

    appeal.refresh_from_db()
    assert appeal.status == AppealStatus.REJECTED

    seller.refresh_from_db()
    assert seller.is_suspended is True  # Still suspended


@pytest.mark.django_db
def test_admin_list_appeals(seller, admin_user):
    """GET /admin/appeals returns all appeals."""
    seller.is_suspended = True
    seller.save()
    SuspensionAppeal.objects.create(user=seller, reason="Please review my case carefully and fairly.")

    client = TestClient(admin_router, headers=get_auth_headers(admin_user))
    res = client.get("/appeals")
    assert res.status_code == 200, res.json()
    items = res.json()
    assert len(items) >= 1
    assert items[0]["username"] == seller.username


@pytest.mark.django_db
def test_appeal_status_endpoint(seller):
    """GET /appeal-status returns correct appeal status."""
    seller.is_suspended = True
    seller.save()
    appeal = SuspensionAppeal.objects.create(
        user=seller,
        reason="Appeal justification with at least twenty chars here."
    )

    client = TestClient(profile_router, headers=get_auth_headers(seller))
    res = client.get("/appeal-status")
    assert res.status_code == 200, res.json()
    data = res.json()
    assert data["has_appeal"] is True
    assert data["status"] == AppealStatus.PENDING
    assert data["appeal_id"] == str(appeal.id)
