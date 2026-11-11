"""
Centralized, fail-safe Redis cache utilities and O(1) versioned namespace invalidation.

Why versioned namespaces?
Django's native RedisCache backend does not support wildcard key deletion (`delete_pattern`).
By embedding a lightweight integer version (`ns_ver:<namespace>`) into parameterized cache keys
(e.g. marketplace directory search/category filters, seller storefronts, recent review feeds),
we can invalidate all permutations of a namespace in O(1) time via atomic `cache.incr()`.
"""
import hashlib
import logging
from typing import Any, Optional
from django.core.cache import cache

logger = logging.getLogger(__name__)

_NAMESPACE_TTL = 86400 * 7  # 7 days


def safe_cache_get(key: str, default: Any = None) -> Any:
    """Retrieve a key from cache, returning `default` if Redis is unreachable."""
    try:
        val = cache.get(key, default)
        return val
    except Exception as exc:
        logger.warning("Cache GET failed for key=%s: %s", key, exc)
        return default


def safe_cache_set(key: str, value: Any, timeout: Optional[int] = 300) -> bool:
    """Store a key in cache, failing open if Redis is unreachable."""
    try:
        cache.set(key, value, timeout=timeout)
        return True
    except Exception as exc:
        logger.warning("Cache SET failed for key=%s: %s", key, exc)
        return False


def safe_cache_delete(key: str) -> bool:
    """Delete a key from cache, failing open if Redis is unreachable."""
    try:
        cache.delete(key)
        return True
    except Exception as exc:
        logger.warning("Cache DELETE failed for key=%s: %s", key, exc)
        return False


def safe_cache_incr(key: str, window_seconds: int) -> int:
    """
    Atomically increment a fixed-window counter in cache without resetting its TTL on each hit.
    Returns the new counter value (1 on first hit in the window).
    """
    try:
        if cache.add(key, 1, timeout=window_seconds):
            return 1
        try:
            return int(cache.incr(key))
        except ValueError:
            cache.set(key, 1, timeout=window_seconds)
            return 1
    except Exception as exc:
        logger.warning("Cache INCR failed for key=%s: %s", key, exc)
        return 1


def get_namespace_version(namespace: str) -> int:
    """Return the current integer version for a cache namespace (defaults to 1)."""
    ver_key = f"ns_ver:{namespace}"
    try:
        ver = cache.get(ver_key)
        if ver is None:
            cache.add(ver_key, 1, timeout=_NAMESPACE_TTL)
            return 1
        return int(ver)
    except Exception as exc:
        logger.warning("Failed to get namespace version for %s: %s", namespace, exc)
        return 1


def bump_namespace_version(namespace: str) -> int:
    """
    Atomically increment the version for `namespace`, invalidating all versioned keys
    under that namespace in O(1) time.
    """
    ver_key = f"ns_ver:{namespace}"
    try:
        if cache.add(ver_key, 2, timeout=_NAMESPACE_TTL):
            return 2
        try:
            return int(cache.incr(ver_key))
        except ValueError:
            cache.set(ver_key, 2, timeout=_NAMESPACE_TTL)
            return 2
    except Exception as exc:
        logger.warning("Failed to bump namespace version for %s: %s", namespace, exc)
        return 1


def make_versioned_key(namespace: str, *parts: Any) -> str:
    """
    Build a deterministic, collision-free cache key scoped to the current version of `namespace`.
    """
    version = get_namespace_version(namespace)
    raw_suffix = ":".join(str(p or "").strip().lower() for p in parts)
    digest = hashlib.sha256(raw_suffix.encode("utf-8")).hexdigest()[:20]
    return f"{namespace}:v{version}:{digest}"


def invalidate_platform_settings_cache() -> None:
    """Invalidate cached platform settings and dependent public configuration caches."""
    safe_cache_delete("system_platform_settings")
    safe_cache_delete("public_active_couriers")


def invalidate_marketplace_caches() -> None:
    """
    Invalidate marketplace directory, seller storefronts, and recent review feeds
    whenever shops, active payment links, featured ads, or seller reviews change.
    """
    bump_namespace_version("marketplace_dir")
    bump_namespace_version("seller_storefront")
    bump_namespace_version("recent_reviews")

