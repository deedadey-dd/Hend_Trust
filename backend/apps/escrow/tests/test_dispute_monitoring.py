import pytest
from decimal import Decimal
from django.utils import timezone
from ninja.testing import TestClient
from apps.users.models import User
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import Transaction, TransactionStatus
from ninja_jwt.tokens import AccessToken
from apps.escrow.api import escrow_router, admin_router, compute_seller_dispute_health
from apps.links.api import links_router
from apps.checkout.api import checkout_router

def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def seller(db):
    return User.objects.create_user(username="dispute_test_seller", shop_name="Risk Test Shop", phone_number="0240001111", email="seller@risktest.com")

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(username="risk_admin", role="ADMIN", is_superuser=True, is_staff=True, phone_number="0240009999")

@pytest.fixture
def admin_client():
    return TestClient(admin_router)

@pytest.fixture
def links_client():
    return TestClient(links_router)

@pytest.fixture
def checkout_client():
    return TestClient(checkout_router)

@pytest.mark.django_db
def test_low_volume_seller_ignored(seller):
    # Create 2 paid transactions (1 disputed, 1 completed)
    link = PaymentLink.objects.create(seller=seller, title="Item 1", price_ghs=Decimal('100.00'))
    Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference="R_LOW_1")
    Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Broken", paystack_reference="R_LOW_2")

    health = compute_seller_dispute_health(seller)
    assert health['dispute_level'] == "NORMAL"
    assert health['is_suspended'] is False
    assert seller.is_suspended is False

@pytest.mark.django_db
def test_alert_threshold_20_percent(seller):
    link = PaymentLink.objects.create(seller=seller, title="Item 2", price_ghs=Decimal('100.00'))
    # Create 10 paid transactions: 2 disputed, 8 completed (20%)
    for i in range(8):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference=f"R_ALERT_{i}")
    for i in range(2):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Issue", paystack_reference=f"R_ALERT_DISP_{i}")

    health = compute_seller_dispute_health(seller)
    assert health['dispute_level'] == "ALERT"
    assert health['dispute_rate_pct'] == 20.0
    assert health['is_suspended'] is False

@pytest.mark.django_db
def test_warning_threshold_30_percent(seller):
    link = PaymentLink.objects.create(seller=seller, title="Item 3", price_ghs=Decimal('100.00'))
    # Create 10 paid transactions: 3 disputed, 7 completed (30%)
    for i in range(7):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference=f"R_WARN_{i}")
    for i in range(3):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Defect", paystack_reference=f"R_WARN_DISP_{i}")

    health = compute_seller_dispute_health(seller)
    assert health['dispute_level'] == "WARNING"
    assert health['dispute_rate_pct'] == 30.0
    assert health['is_suspended'] is False

@pytest.mark.django_db
def test_auto_suspension_at_40_percent(seller):
    link = PaymentLink.objects.create(seller=seller, title="Item 4", price_ghs=Decimal('100.00'), is_active=True)
    # Create 10 paid transactions: 4 disputed, 6 completed (40%)
    for i in range(6):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference=f"R_SUSP_{i}")
    for i in range(4):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Scam", paystack_reference=f"R_SUSP_DISP_{i}")

    health = compute_seller_dispute_health(seller)
    assert health['dispute_level'] == "SUSPENDED"
    assert health['dispute_rate_pct'] == 40.0
    assert health['is_suspended'] is True
    
    seller.refresh_from_db()
    assert seller.is_suspended is True
    assert "Dispute rate reached 40.0%" in seller.suspension_reason
    
    link.refresh_from_db()
    assert link.is_active is False

@pytest.mark.django_db
def test_suspended_seller_blocked_from_creating_links(seller, links_client):
    seller.is_suspended = True
    seller.suspension_reason = "Manual Risk Lockout"
    seller.save()

    headers = get_auth_headers(seller)
    res = links_client.post("/create", json={
        "title": "Blocked Product",
        "price_ghs": 500.0,
        "fee_handling": FeeHandling.PASS_TO_BUYER
    }, headers=headers)
    
    assert res.status_code == 403
    assert "Your seller account is currently suspended" in res.json()['detail']

@pytest.mark.django_db
def test_admin_manual_suspend_and_reinstate(seller, admin_user, admin_client):
    link = PaymentLink.objects.create(seller=seller, title="Active Link", price_ghs=Decimal('200.00'), is_active=True)
    headers = get_auth_headers(admin_user)

    # 1. Admin manually suspends seller
    res = admin_client.post(f"/sellers/{seller.id}/suspend", json={"reason": "Suspicious activity reported"}, headers=headers)
    assert res.status_code == 200
    assert res.json()['is_suspended'] is True

    seller.refresh_from_db()
    assert seller.is_suspended is True
    assert seller.suspension_reason == "Suspicious activity reported"
    
    link.refresh_from_db()
    assert link.is_active is False

    # 2. Admin reinstates seller
    res2 = admin_client.post(f"/sellers/{seller.id}/reinstate", headers=headers)
    assert res2.status_code == 200
    assert res2.json()['is_suspended'] is False

    seller.refresh_from_db()
    assert seller.is_suspended is False
    assert seller.suspension_reason == ""


@pytest.mark.django_db
def test_dynamic_dispute_settings_configuration(seller, admin_user):
    """Verify that updating dispute governance thresholds via admin settings dynamically alters health evaluation."""
    from apps.escrow.models import PlatformSetting

    headers = get_auth_headers(admin_user)
    escrow_client = TestClient(escrow_router)

    # 1. Update dispute settings: lower suspension threshold to 25.0%
    res = escrow_client.post("/admin/settings", json={
        "dispute_min_sample_size": 4,
        "dispute_alert_threshold": 10.0,
        "dispute_warning_threshold": 20.0,
        "dispute_suspension_threshold": 25.0,
    }, headers=headers)
    assert res.status_code == 200, res.json()
    data = res.json()
    assert data["dispute_min_sample_size"] == 4
    assert data["dispute_alert_threshold"] == 10.0
    assert data["dispute_warning_threshold"] == 20.0
    assert data["dispute_suspension_threshold"] == 25.0

    # 2. Create 4 paid txns with 1 dispute = 25% dispute rate
    link = PaymentLink.objects.create(seller=seller, title="Dynamic Setting Item", price_ghs=Decimal('100.00'), is_active=True)
    for i in range(3):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference=f"R_DYN_{i}")
    Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Defective", paystack_reference="R_DYN_DISP")

    # With the custom 25.0% suspension threshold, this seller is now auto-suspended
    health = compute_seller_dispute_health(seller)
    assert health["dispute_level"] == "SUSPENDED"
    assert health["dispute_rate_pct"] == 25.0
    assert health["dispute_suspension_threshold"] == 25.0
    seller.refresh_from_db()
    assert seller.is_suspended is True


@pytest.mark.django_db
def test_dispatch_expiry_auto_suspension(seller):
    """
    Sellers who default on >= 35% of their paid dispatches (with >= 5 transactions)
    must be automatically suspended.
    """
    link = PaymentLink.objects.create(seller=seller, title="Dispatch Default Item", price_ghs=Decimal('100.00'), is_active=True)

    # 3 completed orders, 2 non-dispatch auto-cancelled orders = 2/5 = 40% dispatch default rate
    for i in range(3):
        Transaction.objects.create(
            link=link,
            total_amount_ghs=Decimal('100.00'),
            platform_fee_ghs=Decimal('5.00'),
            status=TransactionStatus.COMPLETED,
            paystack_reference=f"REF_DISP_COMP_{i}"
        )
    for i in range(2):
        Transaction.objects.create(
            link=link,
            total_amount_ghs=Decimal('100.00'),
            platform_fee_ghs=Decimal('5.00'),
            status=TransactionStatus.REFUNDED,
            auto_cancelled_non_dispatch=True,
            paystack_reference=f"REF_DISP_FAIL_{i}"
        )

    health = compute_seller_dispute_health(seller)
    assert health["dispute_level"] == "SUSPENDED"
    assert health["dispatch_expiry_rate_pct"] == 40.0
    assert health["is_suspended"] is True

    seller.refresh_from_db()
    assert seller.is_suspended is True
    assert "Dispatch expiry rate reached 40.0%" in seller.suspension_reason
    assert not PaymentLink.objects.filter(seller=seller, is_active=True).exists()


@pytest.mark.django_db
def test_reinstated_seller_clean_slate_protection(seller):
    """
    When an admin reinstates a seller, past defaults must not immediately trigger
    re-suspension on subsequent health checks.
    """
    link = PaymentLink.objects.create(seller=seller, title="Reinstatement Test Item", price_ghs=Decimal('100.00'), is_active=True)

    # 3 failed dispatches in the past
    for i in range(3):
        Transaction.objects.create(
            link=link,
            total_amount_ghs=Decimal('100.00'),
            platform_fee_ghs=Decimal('5.00'),
            status=TransactionStatus.REFUNDED,
            auto_cancelled_non_dispatch=True,
            paystack_reference=f"OLD_FAIL_{i}"
        )

    seller.is_suspended = True
    seller.suspension_reason = "Suspended due to old defaults"
    seller.save()

    # Admin reinstates seller
    seller.is_suspended = False
    seller.suspension_reason = ""
    seller.reinstated_at = timezone.now()
    seller.save()

    # Health check should now see 0 post-reinstatement orders (insufficient volume) and NOT re-suspend
    health = compute_seller_dispute_health(seller)
    assert health["is_suspended"] is False
    assert health["dispute_level"] == "NORMAL"
    assert health["total_paid_transactions"] == 0

    seller.refresh_from_db()
    assert seller.is_suspended is False


@pytest.mark.django_db
def test_compound_risk_compliance_review_flagging(seller):
    """
    When a seller has 2 or more metrics in the WARNING zone concurrently (e.g. 30% dispute rate + 20% dispatch expiry),
    the account should be flagged for COMPLIANCE_REVIEW rather than single warning, while remaining unsuspended.
    """
    link = PaymentLink.objects.create(seller=seller, title="Compound Risk Item", price_ghs=Decimal('100.00'), is_active=True)

    # 10 transactions:
    # 3 disputed (30% dispute rate -> warning threshold)
    # 2 expired non-dispatch (20% dispatch expiry rate -> warning threshold)
    # 5 normal completed
    for i in range(5):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.COMPLETED, paystack_reference=f"C_COMP_{i}")
    for i in range(3):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.DISPUTED, buyer_dispute_reason="Not working", paystack_reference=f"C_DISP_{i}")
    for i in range(2):
        Transaction.objects.create(link=link, total_amount_ghs=Decimal('100.00'), platform_fee_ghs=Decimal('5.00'), status=TransactionStatus.REFUNDED, auto_cancelled_non_dispatch=True, paystack_reference=f"C_EXP_{i}")

    health = compute_seller_dispute_health(seller)
    assert health["is_suspended"] is False
    assert health["dispute_level"] == "COMPLIANCE_REVIEW"
    assert health["is_flagged_for_compliance_review"] is True
    assert health["compound_warning_count"] == 2
    assert len(health["compliance_review_reasons"]) == 2



