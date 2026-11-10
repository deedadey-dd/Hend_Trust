import time
from django.test import TestCase
from django.core.cache import cache
from apps.core.cache_utils import (
    safe_cache_get,
    safe_cache_set,
    safe_cache_delete,
    safe_cache_incr,
    get_namespace_version,
    bump_namespace_version,
    make_versioned_key,
    invalidate_platform_settings_cache,
    invalidate_marketplace_caches,
)


class CacheUtilsTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_safe_cache_set_get_delete(self):
        self.assertTrue(safe_cache_set("test_key", {"ok": True}, timeout=60))
        self.assertEqual(safe_cache_get("test_key"), {"ok": True})
        self.assertTrue(safe_cache_delete("test_key"))
        self.assertIsNone(safe_cache_get("test_key"))

    def test_safe_cache_incr_atomic_and_fixed_window(self):
        v1 = safe_cache_incr("rl:test:1", window_seconds=60)
        v2 = safe_cache_incr("rl:test:1", window_seconds=60)
        v3 = safe_cache_incr("rl:test:1", window_seconds=60)
        self.assertEqual(v1, 1)
        self.assertEqual(v2, 2)
        self.assertEqual(v3, 3)

    def test_model_save_invalidates_caches(self):
        from apps.escrow.models import PlatformSetting
        from apps.users.models import User
        from apps.links.models import PaymentLink

        safe_cache_set("system_platform_settings", {"fee": 5.0}, timeout=300)
        setting = PlatformSetting.objects.create(key="system_config", value={"fee": 3.5})
        self.assertIsNone(safe_cache_get("system_platform_settings"))
        setting.delete()

        seller = User.objects.create_user(
            username="cacheseller",
            email="cacheseller@example.com",
            phone_number="+233240009999",
            password="testpassword123",
            role="SELLER",
        )
        v_before = get_namespace_version("marketplace_dir")
        link = PaymentLink.objects.create(
            seller=seller,
            title="Test Item",
            price_ghs=100.00,
        )
        self.assertGreater(get_namespace_version("marketplace_dir"), v_before)

        v_after_create = get_namespace_version("seller_storefront")
        link.delete()
        self.assertGreater(get_namespace_version("seller_storefront"), v_after_create)

    def test_versioned_namespace_invalidation(self):
        k1 = make_versioned_key("marketplace_dir", "https://trust.hendaxis.com", "shoes", "fashion")
        safe_cache_set(k1, {"shops": [1, 2]}, timeout=120)
        self.assertEqual(safe_cache_get(k1), {"shops": [1, 2]})

        v_after = bump_namespace_version("marketplace_dir")
        self.assertEqual(v_after, 2)

        k2 = make_versioned_key("marketplace_dir", "https://trust.hendaxis.com", "shoes", "fashion")
        self.assertNotEqual(k1, k2)
        self.assertIsNone(safe_cache_get(k2))

    def test_domain_invalidation_helpers(self):
        safe_cache_set("system_platform_settings", {"fee": 2.5}, timeout=300)
        safe_cache_set("public_active_couriers", [{"id": "dhl"}], timeout=300)
        invalidate_platform_settings_cache()
        self.assertIsNone(safe_cache_get("system_platform_settings"))
        self.assertIsNone(safe_cache_get("public_active_couriers"))

        v_dir_before = get_namespace_version("marketplace_dir")
        v_store_before = get_namespace_version("seller_storefront")
        v_rev_before = get_namespace_version("recent_reviews")
        invalidate_marketplace_caches()
        self.assertEqual(get_namespace_version("marketplace_dir"), v_dir_before + 1)
        self.assertEqual(get_namespace_version("seller_storefront"), v_store_before + 1)
        self.assertEqual(get_namespace_version("recent_reviews"), v_rev_before + 1)
