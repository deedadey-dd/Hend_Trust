import pytest
from django.core.cache import cache

@pytest.fixture(autouse=True)
def clear_django_cache():
    """Ensure tests run in clean cache state without bleeding cached platform settings or directory responses."""
    cache.clear()
    yield
    cache.clear()
