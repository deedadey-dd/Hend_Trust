import pytest
from decimal import Decimal
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
