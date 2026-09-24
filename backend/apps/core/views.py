import logging
from django.shortcuts import render
from django.http import HttpResponseForbidden, JsonResponse
from django.db import connection
from django.core.cache import cache
from apps.core.ratelimit import get_client_ip

logger = logging.getLogger('apps.core.security')
health_logger = logging.getLogger('apps.core.health')

def health_check_view(request):
    """
    Production health check endpoint for Better Stack, Docker, and Nginx.
    Verifies:
      - Django application availability
      - PostgreSQL database connectivity (SELECT 1)
      - Redis cache / broker connectivity (set & get ping)
    Returns:
      HTTP 200: All components healthy.
      HTTP 503: Database or Redis is unavailable.
    """
    db_status = "healthy"
    redis_status = "healthy"
    is_healthy = True

    # Check Database connectivity with lightweight SELECT 1
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as exc:
        db_status = "unhealthy"
        is_healthy = False
        health_logger.error(f"Health Check: Database connection failed: {exc}")

    # Check Redis connectivity with lightweight key ping
    try:
        cache.set('health_check_ping', 'pong', timeout=10)
        if cache.get('health_check_ping') != 'pong':
            raise Exception("Cache ping returned unexpected value")
    except Exception as exc:
        redis_status = "unhealthy"
        is_healthy = False
        health_logger.error(f"Health Check: Redis connection failed: {exc}")

    payload = {
        "status": "healthy" if is_healthy else "unhealthy",
        "database": db_status,
        "redis": redis_status,
    }

    status_code = 200 if is_healthy else 503
    return JsonResponse(payload, status=status_code)

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
