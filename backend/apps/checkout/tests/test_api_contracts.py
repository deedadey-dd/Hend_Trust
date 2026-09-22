import pytest
from django.contrib.auth import get_user_model
from ninja.testing import TestClient
from ninja_jwt.tokens import AccessToken
from hendaxis_trust.api import api
from apps.links.models import PaymentLink
from apps.escrow.models import PromoCode, PromoDiscountType, PlatformSetting

User = get_user_model()


def get_auth_headers(user):
    token = str(AccessToken.for_user(user))
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.django_db
class TestAPIContractsAndSchemaIntegrity:
    """
    Contract & Schema Validation Tests:
    Guarantees that Django Ninja's OpenAPI schema and runtime API responses
    always expose the exact fields required by frontend checkout and dashboard views.
    """

    def test_openapi_schema_generation_and_endpoints(self):
        schema = api.get_openapi_schema()
        assert schema is not None
        assert "paths" in schema
        paths = schema["paths"]

        # Ensure critical endpoints are present in OpenAPI spec
        assert "/api/v1/checkout/validate-promo" in paths
        assert "/api/v1/checkout/verify-and-initialize" in paths
        assert "/api/v1/links/" in paths
        assert "/api/v1/links/{link_id}" in paths

    def test_validate_promo_schema_contract(self):
        schema = api.get_openapi_schema()
        components = schema.get("components", {}).get("schemas", {})

        # Find response and request schemas for validate-promo
        response_schema = None
        request_schema = None
        for name, comp in components.items():
            if "ValidatePromoResponse" in name:
                response_schema = comp
            elif "ValidatePromoRequest" in name:
                request_schema = comp

        assert response_schema is not None, "ValidatePromoResponseSchema missing from OpenAPI components"
        props = response_schema.get("properties", {})

        # Critical fields required by PublicCheckoutView.tsx
        expected_response_fields = [
            "valid",
            "promo_code_applied",
            "discount_amount_ghs",
            "promo_discount_ghs",
            "credit_discount_ghs",
            "base_platform_fee",
            "effective_platform_fee",
            "final_platform_fee_ghs",
            "total_buyer_pays",
            "net_total_to_pay_ghs",
            "buyer_credit_balance_ghs",
        ]
        for field in expected_response_fields:
            assert field in props, f"Field '{field}' missing from ValidatePromoResponseSchema contract"

        assert request_schema is not None, "ValidatePromoRequestSchema missing from OpenAPI components"
        req_props = request_schema.get("properties", {})
        expected_request_fields = [
            "link_id",
            "promo_code",
            "phone_number",
            "apply_buyer_credit",
            "redeem_credit_ghs",
        ]
        for field in expected_request_fields:
            assert field in req_props, f"Field '{field}' missing from ValidatePromoRequestSchema contract"

    def test_seller_links_response_contract_fields(self):
        seller = User.objects.create_user(
            username="contract_seller",
            phone_number="+233240001122",
            password="password123",
            is_phone_verified=True,
            role="SELLER",
        )
        link = PaymentLink.objects.create(
            seller=seller,
            title="Contract Test Item",
            description="Item for contract test",
            price_ghs=150.00,
            shipping_fee_ghs=25.00,
            fee_handling="PASS_TO_BUYER",
            is_active=True,
        )

        client = TestClient(api)
        headers = get_auth_headers(seller)
        response = client.get("/links/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert len(items) >= 1

        first_link = items[0]
        required_link_fields = [
            "id",
            "title",
            "description",
            "price_ghs",
            "shipping_fee_ghs",
            "fee_handling",
            "is_active",
            "created_at",
        ]
        for field in required_link_fields:
            assert field in first_link, f"Field '{field}' missing in /api/v1/links/ response item"
        assert float(first_link["shipping_fee_ghs"]) == 25.00
        assert first_link["fee_handling"] == "PASS_TO_BUYER"

    def test_runtime_validate_promo_calculation_parity(self):
        seller = User.objects.create_user(
            username="seller_parity",
            phone_number="+233241112233",
            password="password123",
            is_phone_verified=True,
            role="SELLER",
        )
        PlatformSetting.objects.update_or_create(
            key="system_config",
            defaults={
                "value": {
                    "platform_fee_percent": 1.5,
                    "flat_fee_ghs": 10.00,
                    "promotions_active": True,
                }
            }
        )
        PromoCode.objects.create(
            code="CONTRACT20",
            discount_type=PromoDiscountType.PERCENTAGE,
            discount_value=20.0,
            is_active=True,
            usage_count=0,
        )
        link = PaymentLink.objects.create(
            seller=seller,
            title="Parity Test Product",
            price_ghs=200.00,
            shipping_fee_ghs=50.00,
            fee_handling="PASS_TO_BUYER",
            is_active=True,
        )

        # Gross = 250.00 -> Base Platform Fee = (250 * 0.015) + 10 = 13.75
        # 20% discount on 13.75 = 2.75
        # Effective Platform Fee = 13.75 - 2.75 = 11.00
        # Total Buyer Pays = 250.00 + 11.00 = 261.00
        payload = {
            "link_id": str(link.id),
            "promo_code": "CONTRACT20",
            "phone_number": "+233249998877",
            "apply_buyer_credit": False,
        }
        client = TestClient(api)
        response = client.post(
            "/checkout/validate-promo",
            json=payload,
        )
        assert response.status_code == 200
        res = response.json()

        assert res["valid"] is True
        assert res["promo_code_applied"] == "CONTRACT20"
        assert res["base_platform_fee"] == 13.75
        assert res["promo_discount_ghs"] == 2.75
        assert res["effective_platform_fee"] == 11.00
        assert res["final_platform_fee_ghs"] == 11.00
        assert res["total_buyer_pays"] == 261.00
        assert res["net_total_to_pay_ghs"] == 261.00
