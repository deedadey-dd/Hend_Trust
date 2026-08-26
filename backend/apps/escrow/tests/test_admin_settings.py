import pytest
from apps.escrow.models import PlatformSetting
from apps.escrow.api import get_platform_settings, escrow_router
from ninja.testing import TestClient
from apps.users.models import User, Role
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
