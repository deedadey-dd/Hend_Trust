import pytest
import pyotp
from django.test import RequestFactory, override_settings
from django.http import HttpResponseForbidden
from apps.core.two_factor import (
    generate_totp_secret, get_totp_uri, generate_qr_code_data_uri, verify_totp_code
)
from apps.core.middleware import AdminSecurityMiddleware
from apps.core.views import admin_honeypot_view

@pytest.mark.django_db
class TestAdminSecuritySuite:

    def test_totp_generation_and_verification(self):
        secret = generate_totp_secret()
        assert len(secret) == 32
        
        uri = get_totp_uri("user@example.com", secret)
        assert "otpauth://totp/" in uri
        assert "user%40example.com" in uri or "user@example.com" in uri

        qr_data_uri = generate_qr_code_data_uri(uri)
        assert qr_data_uri.startswith("data:image/png;base64,")

        # Generate valid code and test verification
        totp = pyotp.TOTP(secret)
        current_code = totp.now()
        assert verify_totp_code(secret, current_code) is True
        assert verify_totp_code(secret, "000000") is False

    def test_ip_whitelist_middleware_allowed(self):
        rf = RequestFactory()
        request = rf.get('/hendaxis-secure-portal-9472/login/', REMOTE_ADDR='192.168.1.50')
        
        middleware = AdminSecurityMiddleware(lambda req: "OK")
        
        with override_settings(DJANGO_ADMIN_URL='hendaxis-secure-portal-9472/', ADMIN_ALLOWED_IPS='192.168.1.0/24'):
            response = middleware(request)
            assert response == "OK"

    def test_ip_whitelist_middleware_blocked(self):
        rf = RequestFactory()
        request = rf.get('/hendaxis-secure-portal-9472/login/', REMOTE_ADDR='10.0.0.99')
        
        middleware = AdminSecurityMiddleware(lambda req: "OK")
        
        with override_settings(DJANGO_ADMIN_URL='hendaxis-secure-portal-9472/', ADMIN_ALLOWED_IPS='192.168.1.0/24'):
            response = middleware(request)
            assert isinstance(response, HttpResponseForbidden)

    def test_cloudflare_header_enforcement(self):
        rf = RequestFactory()
        request = rf.get('/hendaxis-secure-portal-9472/login/', REMOTE_ADDR='1.2.3.4')
        
        middleware = AdminSecurityMiddleware(lambda req: "OK")
        
        with override_settings(DJANGO_ADMIN_URL='hendaxis-secure-portal-9472/', ENFORCE_CLOUDFLARE_HEADER=True):
            # Without CF header -> Blocked
            response = middleware(request)
            assert isinstance(response, HttpResponseForbidden)

            # With CF header -> Allowed
            request_with_cf = rf.get('/hendaxis-secure-portal-9472/login/', REMOTE_ADDR='1.2.3.4', HTTP_CF_CONNECTING_IP='1.2.3.4')
            response_ok = middleware(request_with_cf)
            assert response_ok == "OK"

    def test_admin_honeypot_decoy(self):
        rf = RequestFactory()
        request = rf.get('/admin/')
        response = admin_honeypot_view(request)
        assert response.status_code == 200
        assert b"Django Administration" in response.content

        # Honeypot post attempt
        post_req = rf.post('/admin/', {'username': 'hacker', 'password': '123'})
        post_resp = admin_honeypot_view(post_req)
        assert post_resp.status_code == 403
        assert b"Please enter a correct username and password" in post_resp.content
