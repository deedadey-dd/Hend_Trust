"""
Rate limiting decorator using Django's cache framework.
Supports per-IP and per-user limits with configurable windows and max attempts.
"""
import logging
from functools import wraps
from ninja.errors import HttpError
from apps.core.cache_utils import (
    safe_cache_get,
    safe_cache_set,
    safe_cache_delete,
    safe_cache_incr,
)

logger = logging.getLogger(__name__)


def get_client_ip(request) -> str:
    """Extract the real client IP, accounting for proxies."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def rate_limit(
    key_prefix: str,
    max_calls: int,
    window_seconds: int,
    use_user: bool = False,
    error_message: str = None,
):
    """
    Decorator to rate-limit Django Ninja endpoint functions.

    Args:
        key_prefix:     Unique prefix for this endpoint's cache key.
        max_calls:      Maximum number of calls allowed within the window.
        window_seconds: Time window in seconds.
        use_user:       If True and user is authenticated, key by user ID instead of IP.
        error_message:  Custom 429 message (defaults to a generic one).
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            if use_user and hasattr(request, 'user') and request.user.is_authenticated:
                identifier = f"user_{request.user.pk}"
            else:
                identifier = f"ip_{get_client_ip(request)}"

            cache_key = f"rl:{key_prefix}:{identifier}"
            current = safe_cache_get(cache_key, 0) or 0

            if current >= max_calls:
                logger.warning(
                    "Rate limit exceeded: key=%s identifier=%s",
                    key_prefix,
                    identifier,
                )
                raise HttpError(
                    429,
                    error_message or "Too many requests. Please wait before trying again."
                )

            # Atomically increment fixed-window counter without resetting TTL on subsequent hits
            safe_cache_incr(cache_key, window_seconds=window_seconds)

            return func(request, *args, **kwargs)
        return wrapper
    return decorator


def lockout_on_failure(
    key_prefix: str,
    max_attempts: int = 5,
    lockout_seconds: int = 900,  # 15 minutes
):
    """
    Returns helper functions for tracking sequential failures and locking out.
    Designed to be used inside view functions (not as a decorator) to allow
    clearing the counter on success.

    Usage:
        check_lockout, record_failure, clear_failures = lockout_on_failure('login', identifier)
        check_lockout()          # raises HttpError(429) if locked out
        record_failure()         # increments counter; locks if threshold reached
        clear_failures()         # resets counter on success
    """
    def factory(identifier: str):
        cache_key = f"lockout:{key_prefix}:{identifier}"

        def check_lockout():
            val = safe_cache_get(cache_key, 0) or 0
            if val >= max_attempts:
                raise HttpError(
                    429,
                    f"Account temporarily locked due to too many failed attempts. "
                    f"Please try again after {lockout_seconds // 60} minutes."
                )

        def record_failure():
            current = safe_cache_get(cache_key, 0) or 0
            new_val = current + 1
            safe_cache_set(cache_key, new_val, timeout=lockout_seconds)
            logger.warning(
                "Failed attempt recorded: key=%s:%s count=%d",
                key_prefix, identifier, new_val
            )

        def clear_failures():
            safe_cache_delete(cache_key)

        return check_lockout, record_failure, clear_failures

    return factory
