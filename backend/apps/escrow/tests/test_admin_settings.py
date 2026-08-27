import pytest
from apps.escrow.models import PlatformSetting, Transaction, TransactionStatus
from apps.escrow.api import get_platform_settings, escrow_router
from ninja.testing import TestClient
from apps.users.models import User, Role
from apps.links.models import PaymentLink, FeeHandling
from decimal import Decimal
from unittest.mock import patch

@pytest.mark.django_db
def test_get_platform_settings_defaults():
    settings = get_platform_settings()
    assert settings['active_payment_gateway'] == 'PAYSTACK'
    assert 'COURIER_API' in settings['enabled_delivery_methods']
    assert 'SPEEDAF' in settings['enabled_carriers']

@pytest.mark.django_db
def test_admin_settings_endpoint_superuser(db):
    superuser = User.objects.create_superuser(
        username="admin_test",
        email="admin@example.com",
        password="password123",
        role=Role.ADMIN
    )
    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('apps.escrow.api.is_admin_user', return_value=superuser), \
         patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=superuser):

        get_res = client.get("/admin/settings", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()['active_payment_gateway'] == 'PAYSTACK'

        post_res = client.post("/admin/settings", json={
            "active_payment_gateway": "APPSNMOBILE",
            "enabled_carriers": ["DHL", "FEDEX", "EMS", "SPEEDAF", "OTHERS"]
        }, headers=auth_headers)
        assert post_res.status_code == 200
        data = post_res.json()
        assert data['active_payment_gateway'] == 'APPSNMOBILE'
        assert 'UPS' not in data['enabled_carriers']

    updated = get_platform_settings()
    assert updated['active_payment_gateway'] == 'APPSNMOBILE'
    assert 'UPS' not in updated['enabled_carriers']

@pytest.mark.django_db
def test_admin_settings_endpoint_forbidden_non_superuser(db):
    regular_user = User.objects.create_user(
        username="regular_seller",
        email="seller@example.com",
        password="password123",
        role=Role.SELLER
    )
    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=regular_user):
        res = client.post("/admin/settings", json={"active_payment_gateway": "HUBTEL"}, headers=auth_headers)
        assert res.status_code == 403

@pytest.mark.django_db
def test_advance_transaction_status_dev_endpoint(db):
    seller = User.objects.create_user(username="seller_dev", phone_number="0241112223")
    superuser = User.objects.create_superuser(username="admin_dev", phone_number="0249998887", role=Role.ADMIN)

    link = PaymentLink.objects.create(
        seller=seller,
        title="Dev Item",
        price_ghs=Decimal('100.00'),
        fee_handling=FeeHandling.PASS_TO_BUYER
    )
    txn = Transaction.objects.create(
        link=link,
        buyer_phone="0243334445",
        total_amount_ghs=Decimal('111.50'),
        platform_fee_ghs=Decimal('11.50'),
        status=TransactionStatus.AWAITING_PAYMENT,
        paystack_reference="REFDEV123"
    )

    client = TestClient(escrow_router)
    auth_headers = {"Authorization": "Bearer test_token"}

    with patch('apps.escrow.api.is_admin_user', return_value=superuser), \
         patch('ninja_jwt.authentication.JWTAuth.__call__', return_value=superuser):

        # Advance AWAITING_PAYMENT -> DELIVERY_IN_PROGRESS
        res = client.post(
            f"/admin/transactions/{txn.id}/advance-status",
            json={"target_status": "DELIVERY_IN_PROGRESS"},
            headers=auth_headers
        )
        assert res.status_code == 200
        txn.refresh_from_db()
        assert txn.status == TransactionStatus.DELIVERY_IN_PROGRESS
        assert txn.delivery_logs.exists()

        # Advance DELIVERY_IN_PROGRESS -> INSPECTION_PERIOD
        res = client.post(
            f"/admin/transactions/{txn.id}/advance-status",
            json={"target_status": "INSPECTION_PERIOD"},
            headers=auth_headers
        )
        assert res.status_code == 200
        txn.refresh_from_db()
        assert txn.status == TransactionStatus.INSPECTION_PERIOD
