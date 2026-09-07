import ipaddress
import logging
from django.conf import settings
from django.http import HttpResponseForbidden
from apps.core.ratelimit import get_client_ip

logger = logging.getLogger('apps.core.security')

class AdminSecurityMiddleware:
    """
    Middleware that enforces IP whitelisting and Cloudflare/Proxy header protection
    for Django Admin and Staff endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_prefix = getattr(settings, 'DJANGO_ADMIN_URL', 'admin/').strip('/')
        req_path = request.path.strip('/')

        # Check if the request is targeting the Django Admin route
        if admin_prefix and (req_path == admin_prefix or req_path.startswith(f"{admin_prefix}/")):
            
            # 1. Cloudflare / Proxy Header Enforcement
            if getattr(settings, 'ENFORCE_CLOUDFLARE_HEADER', False):
                cf_connecting_ip = request.META.get('HTTP_CF_CONNECTING_IP')
                cf_ray = request.META.get('HTTP_CF_RAY')
                admin_token = request.META.get('HTTP_X_ADMIN_SECURITY_TOKEN')
                expected_token = getattr(settings, 'ADMIN_SECURITY_TOKEN', '')

                # Reject direct IP connections bypassing Cloudflare WAF / proxy
                if not (cf_connecting_ip or cf_ray or (expected_token and admin_token == expected_token)):
                    client_ip = get_client_ip(request)
                    logger.warning(
                        "SECURITY ALERT: Direct IP access attempt to Admin URL bypassed Cloudflare WAF. IP: %s, Path: %s",
                        client_ip, request.path
                    )
                    return HttpResponseForbidden("Access Denied: Admin access must route through designated secure gateway.")

            # 2. IP Whitelisting / CIDR Subnet Enforcement
            allowed_ips_str = getattr(settings, 'ADMIN_ALLOWED_IPS', '*')
            if allowed_ips_str and allowed_ips_str.strip() != '*':
                allowed_list = [ip.strip() for ip in allowed_ips_str.split(',') if ip.strip()]
                client_ip_str = get_client_ip(request)
                
                is_allowed = False
                try:
                    client_ip_obj = ipaddress.ip_address(client_ip_str)
                    for rule in allowed_list:
                        try:
                            if '/' in rule:
                                net = ipaddress.ip_network(rule, strict=False)
                                if client_ip_obj in net:
                                    is_allowed = True
                                    break
                            else:
                                if client_ip_obj == ipaddress.ip_address(rule):
                                    is_allowed = True
                                    break
                        except ValueError:
                            continue
                except ValueError:
                    is_allowed = False

                if not is_allowed:
                    logger.warning(
                        "SECURITY ALERT: Unauthorized IP attempt to Admin URL. IP: %s, Path: %s",
                        client_ip_str, request.path
                    )
                    return HttpResponseForbidden("Access Denied: Your IP address is not authorized to access the Admin Portal.")

        return self.get_response(request)
