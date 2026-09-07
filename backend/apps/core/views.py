import logging
from django.shortcuts import render
from django.http import HttpResponseForbidden
from apps.core.ratelimit import get_client_ip

logger = logging.getLogger('apps.core.security')

def admin_honeypot_view(request):
    """
    Decoy trap endpoint mounted on default '/admin/' when custom DJANGO_ADMIN_URL is active.
    Logs unauthorized scanning attempts (IP, timestamp, user agent, attempted credentials).
    """
    client_ip = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    method = request.method
    attempted_username = request.POST.get('username', '') if method == 'POST' else ''

    logger.warning(
        "HONEYPOT TRAP TRIGGERED: Unauthorized scan on decoy /admin/. IP: %s | User-Agent: %s | Method: %s | Username Attempted: %s",
        client_ip, user_agent, method, attempted_username or 'N/A'
    )

    if method == 'POST':
        # Render fake login failure message to trap bots into repeating attempts
        context = {
            'error_message': 'Please enter a correct username and password. Note that both fields may be case-sensitive.',
            'username': attempted_username,
        }
        return render(request, 'admin_honeypot.html', context, status=403)

    return render(request, 'admin_honeypot.html', {}, status=200)
