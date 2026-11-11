import pytest
from unittest.mock import patch, MagicMock
from ninja.errors import HttpError
from apps.checkout.services import initialize_transaction_with_failover
from apps.escrow.api import get_platform_settings, update_admin_settings, UpdatePlatformSettingsSchema
from apps.users.models import User, Role


@pytest.fixture
def mock_request():
    class DummyReq:
        def __init__(self):
            self.user = User.objects.create_superuser(
                username="admin_super",
                email="admin_super@example.com",
                password="password123",
                role=Role.ADMIN
            )
            self.auth = True

        def build_absolute_uri(self, path="/"):
            return f"http://testserver{path}"

    return DummyReq()


@pytest.mark.django_db
def test_primary_gateway_success():
    with patch('apps.escrow.api.get_platform_settings') as mock_cfg, \
         patch('apps.checkout.services.PaystackAdapter.initialize_transaction') as mock_paystack:
        mock_cfg.return_value = {
            "primary_payment_gateway": "PAYSTACK",
            "secondary_payment_gateway": "APPSNMOBILE",
            "tertiary_payment_gateway": "HUBTEL",
            "gateway_failover_enabled": True
        }
        mock_paystack.return_value = {
            "authorization_url": "https://checkout.paystack.com/test1234",
            "reference": "REF_TEST_001"
        }

        res = initialize_transaction_with_failover(
            email="buyer@example.com",
            amount_ghs=150.00,
            reference="REF_TEST_001",
            callback_url="https://trust.hendaxis.com/tracking"
        )

        assert res["gateway_used"] == "PAYSTACK"
        assert res["gateway_rank"] == 1
        assert res["authorization_url"] == "https://checkout.paystack.com/test1234"
        mock_paystack.assert_called_once()


@pytest.mark.django_db
def test_secondary_gateway_failover_when_primary_fails():
    with patch('apps.escrow.api.get_platform_settings') as mock_cfg, \
         patch('apps.checkout.services.PaystackAdapter.initialize_transaction', side_effect=Exception("Paystack 503 Service Unavailable")), \
         patch('apps.checkout.adapters.appsnmobile.AppsNMobileAdapter.initialize_transaction') as mock_anm:
        mock_cfg.return_value = {
            "primary_payment_gateway": "PAYSTACK",
            "secondary_payment_gateway": "APPSNMOBILE",
            "tertiary_payment_gateway": "HUBTEL",
            "gateway_failover_enabled": True
        }
        mock_anm.return_value = {
            "authorization_url": "https://checkout.anmgw.com/pay/REF_TEST_002",
            "reference": "REF_TEST_002",
            "status": "success"
        }

        res = initialize_transaction_with_failover(
            email="buyer@example.com",
            amount_ghs=200.00,
            reference="REF_TEST_002",
            callback_url="https://trust.hendaxis.com/tracking"
        )

        assert res["gateway_used"] == "APPSNMOBILE"
        assert res["gateway_rank"] == 2
        assert "PAYSTACK" in res["failover_attempted"]
        assert res["authorization_url"] == "https://checkout.anmgw.com/pay/REF_TEST_002"
        mock_anm.assert_called_once()


@pytest.mark.django_db
def test_tertiary_gateway_failover_when_primary_and_secondary_fail():
    with patch('apps.escrow.api.get_platform_settings') as mock_cfg, \
         patch('apps.checkout.services.PaystackAdapter.initialize_transaction', side_effect=Exception("Paystack Gateway Timeout")), \
         patch('apps.checkout.adapters.appsnmobile.AppsNMobileAdapter.initialize_transaction', side_effect=Exception("AppsNMobile Connection Refused")), \
         patch('apps.checkout.adapters.hubtel.HubtelAdapter.initialize_transaction') as mock_hubtel:
        mock_cfg.return_value = {
            "primary_payment_gateway": "PAYSTACK",
            "secondary_payment_gateway": "APPSNMOBILE",
            "tertiary_payment_gateway": "HUBTEL",
            "gateway_failover_enabled": True
        }
        mock_hubtel.return_value = {
            "authorization_url": "https://pay.hubtel.com/checkout/REF_TEST_003",
            "reference": "REF_TEST_003",
            "status": "success"
        }

        res = initialize_transaction_with_failover(
            email="buyer@example.com",
            amount_ghs=300.00,
            reference="REF_TEST_003",
            callback_url="https://trust.hendaxis.com/tracking"
        )

        assert res["gateway_used"] == "HUBTEL"
        assert res["gateway_rank"] == 3
        assert res["failover_attempted"] == ["PAYSTACK", "APPSNMOBILE", "HUBTEL"]
        assert res["authorization_url"] == "https://pay.hubtel.com/checkout/REF_TEST_003"
        mock_hubtel.assert_called_once()


@pytest.mark.django_db
def test_all_gateways_fail_raises_500():
    with patch('apps.escrow.api.get_platform_settings') as mock_cfg, \
         patch('apps.checkout.services.PaystackAdapter.initialize_transaction', side_effect=Exception("Paystack Down")), \
         patch('apps.checkout.adapters.appsnmobile.AppsNMobileAdapter.initialize_transaction', side_effect=Exception("ANM Down")), \
         patch('apps.checkout.adapters.hubtel.HubtelAdapter.initialize_transaction', side_effect=Exception("Hubtel Down")):
        mock_cfg.return_value = {
            "primary_payment_gateway": "PAYSTACK",
            "secondary_payment_gateway": "APPSNMOBILE",
            "tertiary_payment_gateway": "HUBTEL",
            "gateway_failover_enabled": True
        }

        with pytest.raises(HttpError) as exc_info:
            initialize_transaction_with_failover(
                email="buyer@example.com",
                amount_ghs=50.00,
                reference="REF_TEST_FAIL",
                callback_url="https://trust.hendaxis.com/tracking"
            )
        assert exc_info.value.status_code == 500
        assert "All configured payment engines failed" in str(exc_info.value.message)


@pytest.mark.django_db
def test_failover_disabled_only_tries_primary():
    with patch('apps.escrow.api.get_platform_settings') as mock_cfg, \
         patch('apps.checkout.services.PaystackAdapter.initialize_transaction', side_effect=Exception("Paystack Down")), \
         patch('apps.checkout.adapters.appsnmobile.AppsNMobileAdapter.initialize_transaction') as mock_anm:
        mock_cfg.return_value = {
            "primary_payment_gateway": "PAYSTACK",
            "secondary_payment_gateway": "APPSNMOBILE",
            "tertiary_payment_gateway": "HUBTEL",
            "gateway_failover_enabled": False
        }

        with pytest.raises(HttpError):
            initialize_transaction_with_failover(
                email="buyer@example.com",
                amount_ghs=50.00,
                reference="REF_NO_FAILOVER",
                callback_url="https://trust.hendaxis.com/tracking"
            )
        mock_anm.assert_not_called()


@pytest.mark.django_db
def test_admin_settings_can_update_gateway_hierarchy(mock_request):
    with patch('apps.escrow.api.is_admin_manager', return_value=True):
        update_data = UpdatePlatformSettingsSchema(
            primary_payment_gateway="APPSNMOBILE",
            secondary_payment_gateway="HUBTEL",
            tertiary_payment_gateway="PAYSTACK",
            gateway_failover_enabled=True
        )
        updated = update_admin_settings(mock_request, update_data)

        assert updated["primary_payment_gateway"] == "APPSNMOBILE"
        assert updated["active_payment_gateway"] == "APPSNMOBILE"
        assert updated["secondary_payment_gateway"] == "HUBTEL"
        assert updated["tertiary_payment_gateway"] == "PAYSTACK"
        assert updated["gateway_failover_enabled"] is True

