import pytest
from decimal import Decimal
import uuid
from django.utils import timezone
from datetime import timedelta
from ninja.testing import TestClient
from unittest.mock import patch

from apps.users.models import User, Role
from apps.links.models import PaymentLink, FeeHandling
from apps.escrow.models import (
    Transaction, TransactionStatus, PlatformSetting,
    BuyerIdentity, BuyerCreditLedgerEntry, BuyerCreditEntryType,
    SellerRewardLedgerEntry, SellerRewardEntryType,
    PromoCode, PromoDiscountType, PromoEligibleRole, PromoRedemption
)
from apps.escrow.api import escrow_router, get_platform_settings
from apps.checkout.api import checkout_router
from apps.escrow.services_promo import (
    normalize_phone_number, normalize_email, get_or_create_buyer_identity,
    calculate_order_pricing, reserve_buyer_credit, release_reserved_buyer_credit,
    award_buyer_loyalty_reward, award_seller_milestone_reward,
    apply_transaction_promotions_on_payment
)
from apps.ledger.services import record_promotions_subsidy
from apps.ledger.models import LedgerAccount, LedgerEntry, AccountType


@pytest.mark.django_db
def test_buyer_identity_normalization():
    # Canonical E.164 phone formatting
    assert normalize_phone_number("024 123 4567") == "+233241234567"
    assert normalize_phone_number("233241234567") == "+233241234567"
    assert normalize_phone_number("+233241234567") == "+233241234567"
    assert normalize_email("  Buyer.Test@Example.COM  ") == "buyer.test@example.com"

    buyer = get_or_create_buyer_identity("0241234567", "Buyer@example.com")
    assert buyer.phone_number == "+233241234567"
    assert buyer.primary_email == "buyer@example.com"
    assert buyer.available_credit_ghs == Decimal('0.00')


@pytest.mark.django_db
def test_calculate_order_pricing_with_promo_and_credit():
    # Setup promo settings: active, cap GHS 25
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {
        "promotions_active": True,
        "max_promo_discount_cap_ghs": 25.0
    }
    setting.save()

    # Create 20% promo code with GHS 15 cap
    promo = PromoCode.objects.create(
        code="SAVE20",
        discount_type=PromoDiscountType.PERCENTAGE,
        discount_value=Decimal('20.00'),
        max_discount_cap_ghs=Decimal('15.00'),
        is_active=True
    )

    buyer = get_or_create_buyer_identity("0240001111", "test@example.com")
    buyer.available_credit_ghs = Decimal('5.00')
    buyer.save()

    # Merchandise = 100 GHS, Shipping = 20 GHS
    # Standard Platform Fee = (120 * 0.015) + 10 = 1.8 + 10 = 11.80 GHS
    # 20% Promo Discount on Platform Fee = 11.80 * 0.20 = 2.36 GHS
    # Available Buyer Credit = 5.00 GHS
    # Total Discount = 2.36 + 5.00 = 7.36 GHS
    # Final Platform Fee = 11.80 - 7.36 = 4.44 GHS
    # Net Total to Pay (Buyer Pays Fee) = 120 + 4.44 = 124.44 GHS

    pricing = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('20.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="SAVE20",
        buyer_credit_to_redeem_ghs=Decimal('5.00'),
        buyer_identity=buyer
    )

    assert pricing["gross_merchandise_total"] == Decimal('120.00')
    assert pricing["base_platform_fee"] == Decimal('11.80')
    assert pricing["promo_discount_ghs"] == Decimal('2.36')
    assert pricing["credit_discount_ghs"] == Decimal('5.00')
    assert pricing["effective_platform_fee"] == Decimal('4.44')
    assert pricing["total_buyer_pays"] == Decimal('124.44')


@pytest.mark.django_db
def test_pricing_protection_cannot_reduce_item_or_shipping():
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {
        "promotions_active": True,
        "max_promo_discount_cap_ghs": 50.0
    }
    setting.save()

    # Setup promo with huge 100% discount and large credit
    promo = PromoCode.objects.create(
        code="FREEFEE",
        discount_type=PromoDiscountType.PERCENTAGE,
        discount_value=Decimal('100.00'),
        max_discount_cap_ghs=Decimal('50.00'),
        is_active=True
    )

    buyer = get_or_create_buyer_identity("0240002222", "test2@example.com")
    buyer.available_credit_ghs = Decimal('50.00')
    buyer.save()

    # Standard platform fee = 100 * 0.015 + 10 = 11.50 GHS
    # Total discount must strictly not exceed platform fee (11.50)
    pricing = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="FREEFEE",
        buyer_credit_to_redeem_ghs=Decimal('50.00'),
        buyer_identity=buyer
    )

    assert pricing["effective_platform_fee"] == Decimal('0.00')
    assert pricing["total_buyer_pays"] == Decimal('100.00')  # Item price is never reduced!


@pytest.mark.django_db
def test_admin_promo_codes_crud_and_grants(db):
    admin = User.objects.create_superuser(
        username="promo_admin",
        email="promo_admin@example.com",
        password="password123",
        role=Role.ADMIN
    )
    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('apps.escrow.api.is_admin_manager', return_value=True), \
         patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=admin):

        # 1. Create promo code
        create_res = client.post("/admin/promo-codes", json={
            "code": "LAUNCH50",
            "description": "50% off platform fee",
            "discount_type": "PERCENTAGE",
            "discount_value": 50.0,
            "max_discount_cap_ghs": 20.0,
            "min_order_amount_ghs": 50.0,
            "usage_limit": 500,
            "eligible_role": "ALL"
        }, headers=auth_headers)
        assert create_res.status_code == 200
        code_id = create_res.json()["id"]

        # 2. List promo codes
        list_res = client.get("/admin/promo-codes", headers=auth_headers)
        assert list_res.status_code == 200
        codes = list_res.json()
        assert any(c["code"] == "LAUNCH50" for c in codes)

        # 3. Update promo code
        update_res = client.put(f"/admin/promo-codes/{code_id}", json={
            "is_active": False,
            "max_discount_cap_ghs": 25.0
        }, headers=auth_headers)
        assert update_res.status_code == 200
        assert update_res.json()["is_active"] is False

        # 4. Grant manual credit to guest buyer
        grant_buyer_res = client.post("/admin/grant-credit", json={
            "target_type": "BUYER",
            "target_identifier": "0249998888",
            "amount_ghs": 15.0,
            "notes": "Goodwill VIP credit",
            "validity_days": 60
        }, headers=auth_headers)
        assert grant_buyer_res.status_code == 200
        assert "successfully granted" in grant_buyer_res.json()["message"].lower()

        buyer = BuyerIdentity.objects.get(phone_number="+233249998888")
        assert buyer.available_credit_ghs == Decimal('15.00')

        # 5. Delete promo code
        del_res = client.delete(f"/admin/promo-codes/{code_id}", headers=auth_headers)
        assert del_res.status_code == 200
        assert not PromoCode.objects.filter(id=code_id).exists()


@pytest.mark.django_db
def test_checkout_validate_promo_endpoint(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {
        "promotions_active": True,
        "max_promo_discount_cap_ghs": 25.0
    }
    setting.save()

    seller = User.objects.create_user(
        username="shop_seller",
        email="seller@example.com",
        password="password123",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Gaming Headset",
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

    PromoCode.objects.create(
        code="GAMER10",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('5.00'),
        is_active=True
    )

    client = TestClient(checkout_router)
    res = client.post("/validate-promo", json={
        "link_id": str(link.id),
        "promo_code": "GAMER10",
        "phone_number": "0245554444"
    })

    assert res.status_code == 200
    data = res.json()
    assert data["is_promotions_enabled"] is True
    assert data["promo_discount_ghs"] == 5.0
    assert data["promo_code_applied"] == "GAMER10"


@pytest.mark.django_db
def test_loyalty_and_milestone_rewards_on_transaction_completion(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {
        "promotions_active": True,
        "buyer_reward_rate_percent": 1.0,
        "seller_reward_per_completed_order_ghs": 2.0
    }
    setting.save()

    seller = User.objects.create_user(
        username="milestone_seller",
        email="seller@example.com",
        password="password123",
        role=Role.SELLER,
        wallet_bonus_credits_ghs=Decimal('0.00')
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Smart Watch",
        price_ghs=Decimal('500.00'),
        shipping_fee_ghs=Decimal('0.00')
    )

    buyer = get_or_create_buyer_identity("0241112222", "buyer@example.com")
    txn = Transaction.objects.create(
        link=link,
        paystack_reference="T_REWARD_TEST_001",
        total_amount_ghs=Decimal('517.50'),
        platform_fee_ghs=Decimal('17.50'),
        status=TransactionStatus.COMPLETED,
        buyer_phone="+233241112222",
        buyer_email="buyer@example.com",
        buyer_identity=buyer
    )

    # Award buyer loyalty (1% of 517.50 GHS = 5.18 GHS)
    award_buyer_loyalty_reward(txn)
    buyer.refresh_from_db()
    assert buyer.available_credit_ghs == Decimal('5.18')

    # Award seller milestone (default GHS 2.00)
    award_seller_milestone_reward(txn)
    seller.refresh_from_db()
    assert seller.wallet_bonus_credits_ghs == Decimal('2.00')

    # Verify idempotency: executing rewards again does not duplicate grants
    award_buyer_loyalty_reward(txn)
    award_seller_milestone_reward(txn)
    buyer.refresh_from_db()
    seller.refresh_from_db()
    assert buyer.available_credit_ghs == Decimal('5.18')
    assert seller.wallet_bonus_credits_ghs == Decimal('2.00')


@pytest.mark.django_db
def test_promotions_double_entry_ledger_subsidy(db):
    ref_id = str(uuid.uuid4())
    # Record GHS 10.00 promo fee subsidy
    entry = record_promotions_subsidy(ref_id, Decimal('10.00'))
    assert entry.amount_ghs == Decimal('10.00')
    assert entry.debit_account.name == "PROMOTIONS_EXPENSE"
    assert entry.credit_account.name == "PLATFORM_FEE_REVENUE"


@pytest.mark.django_db
def test_apply_transaction_promotions_and_usage_count(db):
    promo = PromoCode.objects.create(
        code="BONUS10",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        usage_limit=2,
        usage_count=0,
        is_active=True
    )
    seller = User.objects.create_user(
        username="promo_seller_1",
        email="pseller1@example.com",
        password="password123",
        phone_number="+233201112233",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Test Gadget",
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00')
    )
    buyer = get_or_create_buyer_identity("0241230000", "testbuyer@example.com", "John Doe")
    buyer.available_credit_ghs = Decimal('5.00')
    buyer.save()

    txn = Transaction.objects.create(
        link=link,
        paystack_reference="REF_PROMO_TEST_01",
        total_amount_ghs=Decimal('106.50'),
        platform_fee_ghs=Decimal('1.50'),
        promo_code=promo,
        promo_discount_ghs=Decimal('10.00'),
        credit_discount_ghs=Decimal('0.15'),
        buyer_identity=buyer,
        buyer_phone="+233241230000",
        buyer_name="John Doe",
        status=TransactionStatus.AWAITING_PAYMENT
    )

    # Apply promotions on payment
    apply_transaction_promotions_on_payment(txn)

    promo.refresh_from_db()
    assert promo.usage_count == 1
    assert PromoRedemption.objects.filter(promo_code=promo, transaction=txn).count() == 1

    redemption = PromoRedemption.objects.get(promo_code=promo, transaction=txn)
    assert redemption.discount_applied_ghs == Decimal('10.00')
    assert redemption.buyer_identity == buyer

    # Verify idempotency: calling again does not increment usage count
    apply_transaction_promotions_on_payment(txn)
    promo.refresh_from_db()
    assert promo.usage_count == 1
    assert PromoRedemption.objects.filter(promo_code=promo, transaction=txn).count() == 1


@pytest.mark.django_db
def test_promo_code_usage_limit_enforcement(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {"promotions_active": True}
    setting.save()

    promo = PromoCode.objects.create(
        code="LIMITED2",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        usage_limit=2,
        usage_count=2,
        is_active=True
    )

    # 1. calculate_order_pricing should return max global redemptions error
    pricing = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="LIMITED2"
    )
    assert pricing["promo_error"] == "This promo code is no longer valid."
    assert pricing["promo_discount_ghs"] == Decimal('0.00')
    assert pricing["promo_code_applied"] is None

    # 2. Test via checkout validate promo endpoint
    seller = User.objects.create_user(
        username="promo_seller_2",
        email="pseller2@example.com",
        password="password123",
        phone_number="+233202223344",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Limited Test Link",
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )

    client = TestClient(checkout_router)
    res = client.post("/validate-promo", json={
        "link_id": str(link.id),
        "promo_code": "LIMITED2",
        "phone_number": "0245559999"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["promo_discount_ghs"] == 0.0
    assert "no longer valid" in data["promo_error"].lower()


@pytest.mark.django_db
def test_admin_promo_redemptions_endpoint(db):
    admin = User.objects.create_superuser(
        username="admin_audit",
        email="audit@example.com",
        password="password123",
        phone_number="+233203334455",
        role=Role.ADMIN
    )
    promo = PromoCode.objects.create(
        code="AUDIT20",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('20.00'),
        usage_limit=5,
        usage_count=1,
        is_active=True
    )
    seller = User.objects.create_user(
        username="audit_seller",
        email="aseller@example.com",
        password="password123",
        phone_number="+233204445566",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Audit Item",
        price_ghs=Decimal('150.00'),
        shipping_fee_ghs=Decimal('20.00')
    )
    buyer = get_or_create_buyer_identity("0249876543", "auditbuyer@example.com", "Alice Tester")
    txn = Transaction.objects.create(
        link=link,
        paystack_reference="REF_AUDIT_001",
        total_amount_ghs=Decimal('170.00'),
        platform_fee_ghs=Decimal('0.00'),
        promo_code=promo,
        promo_discount_ghs=Decimal('12.55'),
        buyer_identity=buyer,
        buyer_phone="+233249876543",
        buyer_name="Alice Tester",
        status=TransactionStatus.PAYMENT_RECEIVED
    )
    PromoRedemption.objects.create(
        promo_code=promo,
        transaction=txn,
        buyer_identity=buyer,
        seller=seller,
        discount_applied_ghs=Decimal('12.55')
    )

    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('apps.escrow.api.is_admin_manager', return_value=True), \
         patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=admin):

        res = client.get(f"/admin/promo-codes/{promo.id}/redemptions", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["promo_code"] == "AUDIT20"
        assert data[0]["paystack_reference"] == "REF_AUDIT_001"
        assert data[0]["buyer_name"] == "Alice Tester"
        assert data[0]["buyer_phone"] == "+233249876543"
        assert data[0]["discount_applied_ghs"] == 12.55
        assert data[0]["order_total_ghs"] == 170.00
        assert data[0]["transaction_status"] == "PAYMENT_RECEIVED"


@pytest.mark.django_db
def test_per_buyer_limit_enforcement_with_phone_normalization(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {"promotions_active": True}
    setting.save()

    promo = PromoCode.objects.create(
        code="ONCEONLY",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        usage_limit=100,
        per_buyer_limit=1,
        is_active=True
    )
    seller = User.objects.create_user(
        username="buyer_limit_seller",
        email="blseller@example.com",
        password="password123",
        phone_number="+233205556677",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Widget",
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00')
    )

    # 1. First redemption by Buyer 1 (phone: "024 111 2222")
    buyer1 = get_or_create_buyer_identity("024 111 2222", "buyer1@example.com")
    pricing1 = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="ONCEONLY",
        buyer_identity=buyer1
    )
    assert pricing1["promo_error"] is None
    assert pricing1["promo_discount_ghs"] == Decimal('10.00')

    # Record first transaction and confirm payment
    txn1 = Transaction.objects.create(
        link=link,
        paystack_reference="REF_BUYER1_01",
        total_amount_ghs=Decimal('101.65'),
        platform_fee_ghs=Decimal('1.65'),
        promo_code=promo,
        promo_discount_ghs=Decimal('10.00'),
        buyer_identity=buyer1,
        buyer_phone=buyer1.phone_number,
        status=TransactionStatus.PAYMENT_RECEIVED
    )
    apply_transaction_promotions_on_payment(txn1)

    # 2. Buyer 1 attempts to use promo code again with slightly different formatting "+233 24 111 2222"
    buyer1_alt = get_or_create_buyer_identity("+233 24 111 2222", "buyer1@example.com")
    assert buyer1_alt.id == buyer1.id  # Same normalized canonical identity

    pricing2 = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="ONCEONLY",
        buyer_identity=buyer1_alt
    )
    assert pricing2["promo_discount_ghs"] == Decimal('0.00')
    assert "already redeemed promo code onceonly" in pricing2["promo_error"].lower()

    # 3. Buyer 2 (different phone) attempts to use the same promo code -> Allowed!
    buyer2 = get_or_create_buyer_identity("050 333 4444", "buyer2@example.com")
    pricing3 = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('10.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="ONCEONLY",
        buyer_identity=buyer2
    )
    assert pricing3["promo_error"] is None
    assert pricing3["promo_discount_ghs"] == Decimal('10.00')


@pytest.mark.django_db
def test_unlimited_promo_code_usage(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {"promotions_active": True}
    setting.save()

    promo = PromoCode.objects.create(
        code="UNLIMITEDFEE",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('5.00'),
        usage_limit=None,
        per_buyer_limit=10,
        is_active=True
    )
    seller = User.objects.create_user(
        username="unlimited_seller",
        email="useller@example.com",
        password="password123",
        phone_number="+233206667788",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Unlimited Item",
        price_ghs=Decimal('50.00'),
        shipping_fee_ghs=Decimal('5.00')
    )

    for i in range(5):
        buyer = get_or_create_buyer_identity(f"024000000{i}", f"buyer{i}@example.com")
        pricing = calculate_order_pricing(
            price_ghs=Decimal('50.00'),
            shipping_fee_ghs=Decimal('5.00'),
            fee_handling=FeeHandling.PASS_TO_BUYER,
            promo_code_str="UNLIMITEDFEE",
            buyer_identity=buyer
        )
        assert pricing["promo_error"] is None
        assert pricing["promo_discount_ghs"] == Decimal('5.00')

        txn = Transaction.objects.create(
            link=link,
            paystack_reference=f"REF_UNLIMITED_{i}",
            total_amount_ghs=Decimal('55.83'),
            platform_fee_ghs=Decimal('5.83'),
            promo_code=promo,
            promo_discount_ghs=Decimal('5.00'),
            buyer_identity=buyer,
            buyer_phone=buyer.phone_number,
            status=TransactionStatus.PAYMENT_RECEIVED
        )
        apply_transaction_promotions_on_payment(txn)

    promo.refresh_from_db()
    assert promo.usage_count == 5
    assert PromoRedemption.objects.filter(promo_code=promo).count() == 5


@pytest.mark.django_db
def test_min_order_amount_threshold_edge_cases(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {"promotions_active": True}
    setting.save()

    promo = PromoCode.objects.create(
        code="MIN100",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('15.00'),
        min_order_amount_ghs=Decimal('100.00'),
        is_active=True
    )

    # 1. Gross merchandise (80 item + 15 shipping = 95 GHS) < 100 GHS -> Blocked
    pricing_below = calculate_order_pricing(
        price_ghs=Decimal('80.00'),
        shipping_fee_ghs=Decimal('15.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="MIN100"
    )
    assert pricing_below["promo_discount_ghs"] == Decimal('0.00')
    assert "minimum order of ghs 100.00 required" in pricing_below["promo_error"].lower()

    # 2. Gross merchandise (80 item + 20 shipping = 100 GHS) == 100 GHS -> Exactly matches -> Allowed!
    pricing_exact = calculate_order_pricing(
        price_ghs=Decimal('80.00'),
        shipping_fee_ghs=Decimal('20.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="MIN100"
    )
    assert pricing_exact["promo_error"] is None
    assert pricing_exact["promo_discount_ghs"] == Decimal('11.50')  # Base platform fee is 100 * 1.5% + 10 = 11.50


@pytest.mark.django_db
def test_promo_code_expiration_and_deactivation(db):
    setting, _ = PlatformSetting.objects.get_or_create(key="system_config")
    setting.value = {"promotions_active": True}
    setting.save()

    now = timezone.now()

    # 1. Expired Promo Code
    expired_promo = PromoCode.objects.create(
        code="EXPIREDYESTERDAY",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        expires_at=now - timedelta(days=1),
        is_active=True
    )
    res_expired = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="EXPIREDYESTERDAY"
    )
    assert res_expired["promo_discount_ghs"] == Decimal('0.00')
    assert "has expired" in res_expired["promo_error"].lower()

    # 2. Deactivated Promo Code
    deactivated_promo = PromoCode.objects.create(
        code="DEACTIVATEDCODE",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        is_active=False
    )
    res_deactivated = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="DEACTIVATEDCODE"
    )
    assert res_deactivated["promo_discount_ghs"] == Decimal('0.00')
    assert "invalid or inactive" in res_deactivated["promo_error"].lower()

    # 3. Global Promotions Campaign Switched Off
    setting.value = {"promotions_active": False}
    setting.save()

    active_promo = PromoCode.objects.create(
        code="ACTIVECODE",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        is_active=True
    )
    res_global_off = calculate_order_pricing(
        price_ghs=Decimal('100.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER,
        promo_code_str="ACTIVECODE"
    )
    assert res_global_off["is_promotions_enabled"] is False
    assert res_global_off["promo_discount_ghs"] == Decimal('0.00')


@pytest.mark.django_db
def test_end_to_end_confirm_payment_counter_and_metrics_sync(db):
    from apps.escrow.services import confirm_transaction_payment

    promo = PromoCode.objects.create(
        code="SYNC20",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('10.00'),
        usage_limit=2,
        usage_count=0,
        is_active=True
    )
    seller = User.objects.create_user(
        username="sync_seller",
        email="sseller@example.com",
        password="password123",
        phone_number="+233207778899",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Sync Gadget",
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('20.00')
    )
    buyer = get_or_create_buyer_identity("0247778899", "syncbuyer@example.com", "Sync Buyer")

    txn = Transaction.objects.create(
        link=link,
        paystack_reference="REF_SYNC_001",
        total_amount_ghs=Decimal('223.30'),
        platform_fee_ghs=Decimal('3.30'),
        promo_code=promo,
        promo_discount_ghs=Decimal('10.00'),
        buyer_identity=buyer,
        buyer_phone=buyer.phone_number,
        buyer_name="Sync Buyer",
        status=TransactionStatus.AWAITING_PAYMENT
    )

    # 1. Confirm payment
    with patch('apps.ledger.services.record_buyer_deposit'), \
         patch('apps.core.tasks.notify_buyer_payment_received_task.delay'), \
         patch('apps.core.tasks.notify_seller_payment_received_task.delay'):
        confirmed = confirm_transaction_payment(txn)
        assert confirmed is True

    promo.refresh_from_db()
    txn.refresh_from_db()
    assert txn.status == TransactionStatus.PAYMENT_RECEIVED
    assert promo.usage_count == 1
    assert PromoRedemption.objects.filter(promo_code=promo, transaction=txn).count() == 1

    # 2. Call confirm_transaction_payment again -> Idempotent, doesn't duplicate
    with patch('apps.ledger.services.record_buyer_deposit'), \
         patch('apps.core.tasks.notify_buyer_payment_received_task.delay'), \
         patch('apps.core.tasks.notify_seller_payment_received_task.delay'):
        confirmed_again = confirm_transaction_payment(txn)
        assert confirmed_again is False

    promo.refresh_from_db()
    assert promo.usage_count == 1
    assert PromoRedemption.objects.filter(promo_code=promo, transaction=txn).count() == 1


@pytest.mark.django_db
def test_global_promo_redemptions_endpoint_with_filters(db):
    admin = User.objects.create_superuser(
        username="admin_global_audit",
        email="global_audit@example.com",
        password="password123",
        phone_number="+233201119999",
        role=Role.ADMIN
    )
    promo_a = PromoCode.objects.create(
        code="CAMPAIGN_A",
        discount_type=PromoDiscountType.PERCENTAGE,
        discount_value=Decimal('20.00'),
        usage_limit=10,
        is_active=True
    )
    promo_b = PromoCode.objects.create(
        code="CAMPAIGN_B",
        discount_type=PromoDiscountType.FIXED_GHS,
        discount_value=Decimal('15.00'),
        usage_limit=10,
        is_active=True
    )
    seller = User.objects.create_user(
        username="global_seller",
        email="gseller@example.com",
        password="password123",
        phone_number="+233204445566",
        role=Role.SELLER
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Global Test Product",
        price_ghs=Decimal('150.00'),
        shipping_fee_ghs=Decimal('25.00')
    )
    buyer1 = get_or_create_buyer_identity("0249998888", "buyer1@example.com", "Alice Buyer")
    buyer2 = get_or_create_buyer_identity("0501112222", "buyer2@example.com", "Bob Buyer")

    txn1 = Transaction.objects.create(
        link=link,
        paystack_reference="PAY_AUDIT_001",
        total_amount_ghs=Decimal('175.00'),
        platform_fee_ghs=Decimal('12.63'),
        promo_code=promo_a,
        promo_discount_ghs=Decimal('2.53'),
        buyer_identity=buyer1,
        buyer_phone=buyer1.phone_number,
        buyer_name="Alice Buyer",
        status=TransactionStatus.PAYMENT_RECEIVED
    )
    PromoRedemption.objects.create(
        promo_code=promo_a,
        buyer_identity=buyer1,
        transaction=txn1,
        seller=seller,
        discount_applied_ghs=Decimal('2.53')
    )

    txn2 = Transaction.objects.create(
        link=link,
        paystack_reference="PAY_AUDIT_002",
        total_amount_ghs=Decimal('175.00'),
        platform_fee_ghs=Decimal('12.63'),
        promo_code=promo_b,
        promo_discount_ghs=Decimal('12.63'),
        buyer_identity=buyer2,
        buyer_phone=buyer2.phone_number,
        buyer_name="Bob Buyer",
        status=TransactionStatus.COMPLETED
    )
    PromoRedemption.objects.create(
        promo_code=promo_b,
        buyer_identity=buyer2,
        transaction=txn2,
        seller=seller,
        discount_applied_ghs=Decimal('12.63')
    )

    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('apps.escrow.api.is_admin_manager', return_value=True), \
         patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=admin):

        # 1. Fetch all redemptions
        res = client.get("/admin/promo-redemptions", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total_count"] == 2
        assert len(data["items"]) == 2
        assert data["metrics"]["total_count"] == 2
        assert data["metrics"]["total_subsidy_ghs"] == pytest.approx(15.16, 0.01)
        assert data["metrics"]["unique_buyers_count"] == 2

        # 2. Filter by promo_code
        res_filtered = client.get("/admin/promo-redemptions?promo_code=CAMPAIGN_A", headers=auth_headers)
        assert res_filtered.status_code == 200
        filtered_data = res_filtered.json()
        assert filtered_data["total_count"] == 1
        assert filtered_data["items"][0]["promo_code"] == "CAMPAIGN_A"
        assert filtered_data["items"][0]["paystack_reference"] == "PAY_AUDIT_001"

        # 3. Search by buyer phone / name
        res_search = client.get("/admin/promo-redemptions?search=0501112222", headers=auth_headers)
        assert res_search.status_code == 200
        search_data = res_search.json()
        assert search_data["total_count"] == 1
        assert search_data["items"][0]["buyer_name"] == "Bob Buyer"


@pytest.mark.django_db
def test_seasonal_fee_campaigns_and_pricing():
    from apps.escrow.models import SeasonalFeeCampaign, SeasonalFeeRuleType
    now = timezone.now()

    # 1. Test WAIVED (100% Fee Waiver)
    camp_waived = SeasonalFeeCampaign.objects.create(
        name="Easter 2026 Free Escrow",
        fee_rule_type=SeasonalFeeRuleType.WAIVED,
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=5),
        is_active=True
    )

    pricing_waived = calculate_order_pricing(
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('20.00'),
        fee_handling='PASS_TO_BUYER'
    )
    # Gross = 220.00. Base fee = (220 * 1.5%) + 10 = 3.30 + 10 = 13.30
    assert pricing_waived["base_platform_fee"] == Decimal('13.30')
    assert pricing_waived["seasonal_fee_discount_ghs"] == Decimal('13.30')
    assert pricing_waived["effective_platform_fee"] == Decimal('0.00')
    assert pricing_waived["total_buyer_pays"] == Decimal('220.00')
    assert pricing_waived["seasonal_campaign_name"] == "Easter 2026 Free Escrow"

    camp_waived.delete()

    # 2. Test REDUCED_PERCENTAGE (0.5% variable fee instead of 1.5%)
    camp_reduced_pct = SeasonalFeeCampaign.objects.create(
        name="Independence Day 0.5% Promo",
        fee_rule_type=SeasonalFeeRuleType.REDUCED_PERCENTAGE,
        rule_value=Decimal('0.50'),
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=5),
        is_active=True
    )

    pricing_pct = calculate_order_pricing(
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling='PASS_TO_BUYER'
    )
    # Gross = 200.00. Base fee = (200 * 1.5%) + 10 = 13.00.
    # New var fee = 200 * 0.5% = 1.00. Diff = 3.00 - 1.00 = 2.00 discount.
    # Effective fee = 13.00 - 2.00 = 11.00 (which is 200 * 0.5% + 10 = 11.00)
    assert pricing_pct["base_platform_fee"] == Decimal('13.00')
    assert pricing_pct["seasonal_fee_discount_ghs"] == Decimal('2.00')
    assert pricing_pct["effective_platform_fee"] == Decimal('11.00')

    camp_reduced_pct.delete()


@pytest.mark.django_db
def test_seller_fee_offset_on_absorb_fee():
    seller = User.objects.create_user(
        username='offset_seller',
        email='offset@seller.com',
        password='Password123!',
        wallet_bonus_credits_ghs=Decimal('20.00')
    )

    # Gross = 200.00. Base fee = 13.00.
    pricing = calculate_order_pricing(
        price_ghs=Decimal('200.00'),
        shipping_fee_ghs=Decimal('0.00'),
        fee_handling='ABSORB_FEE',
        seller_user=seller
    )

    assert pricing["base_platform_fee"] == Decimal('13.00')
    assert pricing["seller_fee_offset_applied_ghs"] == Decimal('13.00')
    assert pricing["effective_platform_fee"] == Decimal('0.00')
    # Seller absorbs fee, but because of GHS 13 offset from bonus credits, they receive full GHS 200.00
    assert pricing["net_seller_receives"] == Decimal('200.00')
    assert pricing["total_buyer_pays"] == Decimal('200.00')


@pytest.mark.django_db
def test_transaction_reward_campaigns_granting():
    from apps.escrow.models import TransactionRewardCampaign, RewardTargetRole, RewardCalculationType
    from apps.escrow.services_promo import award_transaction_reward_campaigns

    seller = User.objects.create_user(
        username='reward_seller',
        email='seller@reward.com',
        password='Password123!',
        wallet_bonus_credits_ghs=Decimal('0.00')
    )
    link = PaymentLink.objects.create(
        seller=seller,
        title="Reward Test Product",
        price_ghs=Decimal('100.00')
    )
    buyer = get_or_create_buyer_identity("0249998877", "rewardbuyer@example.com")

    txn = Transaction.objects.create(
        link=link,
        buyer_identity=buyer,
        buyer_phone="+233249998877",
        buyer_email="rewardbuyer@example.com",
        total_amount_ghs=Decimal('100.00'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.COMPLETED,
        paystack_reference="TX_REWARD_001"
    )

    # Create active reward campaign giving GHS 5 fee cashback to seller and GHS 3 loyalty credit to buyer
    camp = TransactionRewardCampaign.objects.create(
        name="Merchant Boost 2026",
        target_role=RewardTargetRole.ALL,
        reward_type=RewardCalculationType.FIXED_GHS,
        reward_value=Decimal('5.00'),
        min_order_amount_ghs=Decimal('50.00'),
        is_active=True
    )

    awarded = award_transaction_reward_campaigns(txn)
    assert len(awarded) == 2

    seller.refresh_from_db()
    buyer.refresh_from_db()

    assert seller.wallet_bonus_credits_ghs == Decimal('5.00')
    assert buyer.available_credit_ghs == Decimal('5.00')

    # Ensure idempotency: re-running does not grant twice
    awarded_again = award_transaction_reward_campaigns(txn)
    assert len(awarded_again) == 0



