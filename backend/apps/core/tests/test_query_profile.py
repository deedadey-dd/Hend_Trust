"""Query-count / latency profile of hot endpoints (run with `pytest -s -k query_profile`).

Each endpoint is called with a cold cache against a realistic seeded dataset and the number
of SQL queries is asserted against a budget so N+1 regressions fail CI.
"""
import time
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.escrow.models import Transaction, TransactionStatus
from apps.links.models import PaymentLink
from apps.reviews.models import SellerReview
from apps.users.models import User


class _Req:
    def __init__(self, user=None):
        self.user = user
        self.auth = True
        self.META = {"HTTP_HOST": "testserver"}
        self.COOKIES = {}
        self.headers = {}

    def build_absolute_uri(self, path="/"):
        return f"http://testserver{path}"

    def get_host(self):
        return "testserver"

    def is_secure(self):
        return False


@pytest.fixture
def seeded(db):
    sellers = []
    n = 0
    for i in range(25):
        s = User.objects.create_user(
            username=f"prof_seller_{i}", phone_number=f"02400{i:05d}", shop_name=f"Shop {i}", role="SELLER"
        )
        sellers.append(s)
        for j in range(3):
            link = PaymentLink.objects.create(seller=s, title=f"Item {i}-{j}", price_ghs=Decimal("100.00"))
            for k in range(2):
                n += 1
                tx = Transaction.objects.create(
                    link=link,
                    buyer_name=f"Buyer {n}",
                    buyer_phone=f"05500{n:05d}",
                    buyer_email=f"b{n}@example.com",
                    total_amount_ghs=Decimal("111.50"),
                    platform_fee_ghs=Decimal("11.50"),
                    status=TransactionStatus.COMPLETED,
                    paystack_reference=f"PROF_{n}",
                )
                SellerReview.objects.create(
                    transaction=tx, seller=s, buyer_name=tx.buyer_name, rating_overall=5, comment="Great"
                )
    return sellers


def _measure(label, fn, budget):
    cache.clear()
    with CaptureQueriesContext(connection) as ctx:
        t0 = time.perf_counter()
        fn()
        ms = (time.perf_counter() - t0) * 1000
    print(f"[profile] {label:<28} {len(ctx):>4} queries  {ms:7.1f} ms")
    assert len(ctx) <= budget, f"{label}: {len(ctx)} queries exceeds budget {budget}"


def test_query_profile_public_endpoints(seeded):
    from apps.reviews.api import get_marketplace_directory, get_recent_reviews_feed, get_seller_storefront

    _measure("GET /reviews/shops", lambda: get_marketplace_directory(_Req()), 12)
    _measure("GET /reviews/shops?query=item", lambda: get_marketplace_directory(_Req(), query="item"), 15)
    _measure("GET /reviews/recent", lambda: get_recent_reviews_feed(_Req(), limit=15), 6)
    _measure("GET /reviews/seller/{id}", lambda: get_seller_storefront(_Req(), str(seeded[0].id)), 10)


def test_marketplace_directory_pagination(seeded):
    from apps.reviews.api import get_marketplace_directory

    cache.clear()
    p1 = get_marketplace_directory(_Req(), page=1, page_size=10)
    p2 = get_marketplace_directory(_Req(), page=2, page_size=10)
    p3 = get_marketplace_directory(_Req(), page=3, page_size=10)

    assert p1["total_standard_shops"] == 25
    assert [len(p["standard_shops"]) for p in (p1, p2, p3)] == [10, 10, 5]
    assert (p1["has_more"], p2["has_more"], p3["has_more"]) == (True, True, False)
    # Pages never overlap
    ids = [s["seller_id"] for p in (p1, p2, p3) for s in p["standard_shops"]]
    assert len(ids) == len(set(ids)) == 25
    # Matched products / featured shops only ship on the first page
    assert p2["matched_products"] == [] and p2["featured_shops"] == []
    # Page size is capped
    capped = get_marketplace_directory(_Req(), page=1, page_size=9999)
    assert capped["page_size"] == 60


def test_query_profile_seller_endpoints(seeded):
    from apps.escrow.api import get_seller_summary_metrics, get_seller_transactions

    seller = seeded[0]
    _measure("GET /escrow/seller/transactions", lambda: get_seller_transactions(_Req(seller)), 12)
    _measure("GET /escrow/seller/summary-metrics", lambda: get_seller_summary_metrics(_Req(seller)), 40)

