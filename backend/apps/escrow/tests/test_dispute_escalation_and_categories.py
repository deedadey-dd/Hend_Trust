import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from ninja.testing import TestClient
from apps.users.models import User
from apps.links.models import PaymentLink
from apps.escrow.models import Transaction, TransactionStatus, DisputeResolutionAction
from apps.escrow.api import escrow_router, admin_router
from ninja_jwt.tokens import AccessToken

def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def seller(db):
    return User.objects.create_user(username="test_seller", phone_number="0241112222", email="seller@test.com")

@pytest.fixture
def buyer_user(db):
    return User.objects.create_user(username="test_buyer", phone_number="0245556666", email="buyer@test.com")

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username="admin_user", phone_number="0240000000", email="admin@test.com", password="adminpassword")

@pytest.fixture
def link(db, seller):
    return PaymentLink.objects.create(seller=seller, title="Gaming Laptop RTX 4080", price_ghs=Decimal('15000.00'))

@pytest.fixture
def transaction(db, link):
    return Transaction.objects.create(
        link=link,
        buyer_name="Kofi Annan",
        buyer_phone="0245556666",
        buyer_email="buyer@test.com",
        total_amount_ghs=Decimal('15000.00'),
        platform_fee_ghs=Decimal('150.00'),
        status=TransactionStatus.INSPECTION_PERIOD,
        paystack_reference="ESC_TEST_999",
        inspection_starts_at=timezone.now()
    )

@pytest.fixture
def escrow_client():
    return TestClient(escrow_router)

@pytest.fixture
def admin_client():
    return TestClient(admin_router)

@pytest.mark.django_db
def test_raise_dispute_min_character_limit_and_category(escrow_client, transaction):
    # 1. Validation failure: less than 10 characters
    res_short = escrow_client.post(
        f"/{transaction.id}/raise-dispute",
        json={
            "reason": "broken", # 6 chars < 10
            "category": "DAMAGED_ITEM",
            "photos": []
        }
    )
    assert res_short.status_code == 400
    err_text = str(res_short.json())
    assert "at least 10 characters" in err_text

    # 2. Success: >= 10 characters and category
    res_valid = escrow_client.post(
        f"/{transaction.id}/raise-dispute",
        json={
            "reason": "The laptop screen is cracked and won't turn on.",
            "category": "DAMAGED_ITEM",
            "photos": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"]
        }
    )
    assert res_valid.status_code == 200
    
    transaction.refresh_from_db()
    assert transaction.status == TransactionStatus.DISPUTED
    assert transaction.buyer_dispute_category == "DAMAGED_ITEM"
    assert transaction.disputed_at is not None
    assert "laptop screen is cracked" in transaction.buyer_dispute_reason

@pytest.mark.django_db
def test_request_arbiter_decision_window_and_execution(escrow_client, transaction, seller):
    # 1. Raise dispute
    escrow_client.post(
        f"/{transaction.id}/raise-dispute",
        json={
            "reason": "Defective graphics card producing artifacts.",
            "category": "DEFECTIVE_OR_FAULTY"
        }
    )
    transaction.refresh_from_db()

    # 2. Attempt Request Arbiter Decision immediately (< 48h default)
    res_premature = escrow_client.post(f"/{transaction.id}/request-arbiter-decision")
    assert res_premature.status_code == 400
    assert "hours of direct party negotiation" in str(res_premature.json())

    # 3. Simulate dispute opened 49 hours ago (elapsed)
    transaction.disputed_at = timezone.now() - timedelta(hours=49)
    transaction.save()

    # 4. Request Arbiter Decision by Seller
    seller_headers = get_auth_headers(seller)
    res_escalated = escrow_client.post(f"/{transaction.id}/request-arbiter-decision", headers=seller_headers)
    assert res_escalated.status_code == 200
    assert "Arbiter Decision requested successfully" in str(res_escalated.json())

    transaction.refresh_from_db()
    assert transaction.arbiter_escalated_at is not None
    assert transaction.arbiter_escalated_role == "SELLER"
    assert transaction.arbiter_escalated_by == seller

    # 5. Attempt second escalation -> returns friendly message (already escalated)
    res_dup = escrow_client.post(f"/{transaction.id}/request-arbiter-decision")
    assert res_dup.status_code == 200
    assert "already been requested" in str(res_dup.json())

@pytest.mark.django_db
def test_resolve_dispute_external_arbitration_order_mandatory(admin_client, transaction, admin_user):
    # Setup disputed transaction
    transaction.status = TransactionStatus.DISPUTED
    transaction.buyer_dispute_reason = "Major breach of contract between merchant and purchaser."
    transaction.buyer_dispute_category = "OTHER"
    transaction.disputed_at = timezone.now()
    transaction.save()

    admin_headers = get_auth_headers(admin_user)

    # 1. External arbitration ruling without document proof -> 400
    res_no_doc = admin_client.post(
        f"/disputes/{transaction.id}/resolve",
        json={
            "action": "FULL_REFUND_TO_BUYER",
            "is_external_arbitration": True,
            "external_order_document_url": "",
            "admin_notes": "Court ordered full refund"
        },
        headers=admin_headers
    )
    assert res_no_doc.status_code == 400
    assert "Official external arbitration/court order letter must be uploaded" in str(res_no_doc.json())

    # 2. External arbitration ruling with document proof -> 200
    res_with_doc = admin_client.post(
        f"/disputes/{transaction.id}/resolve",
        json={
            "action": "FULL_REFUND_TO_BUYER",
            "is_external_arbitration": True,
            "external_order_document_url": "https://storage.platform.com/court_orders/case_2026_998.pdf",
            "admin_notes": "Official court judgment verified and uploaded."
        },
        headers=admin_headers
    )
    assert res_with_doc.status_code == 200

    transaction.refresh_from_db()
    assert transaction.external_arbitration_order_url == "https://storage.platform.com/court_orders/case_2026_998.pdf"
    assert transaction.status == TransactionStatus.REFUNDED
