import pytest
from decimal import Decimal
from http import HTTPStatus
from django.test import Client
from apps.users.models import User
from apps.links.models import PaymentLink

@pytest.mark.django_db
class TestSecurityAndIDOR:

    @pytest.fixture
    def seller_a(self):
        return User.objects.create_user(
            username='seller_a',
            email='seller_a@example.com',
            phone_number='+233240000101',
            role='SELLER',
            password='Password123!'
        )

    @pytest.fixture
    def seller_b(self):
        return User.objects.create_user(
            username='seller_b',
            email='seller_b@example.com',
            phone_number='+233240000102',
            role='SELLER',
            password='Password123!'
        )

    @pytest.fixture
    def link_seller_a(self, seller_a):
        return PaymentLink.objects.create(
            seller=seller_a,
            title='Seller A Link',
            price_ghs=Decimal('150.00'),
            shipping_fee_ghs=Decimal('10.00')
        )

    def test_unauthenticated_requests_to_protected_endpoints_are_rejected(self):
        client = Client()
        response = client.get('/api/v1/wallet/balance')
        assert response.status_code in [HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN]

    def test_seller_cannot_archive_or_modify_other_seller_link(self, seller_b, link_seller_a):
        client = Client()
        client.force_login(seller_b)
        
        # Attempt to archive Seller A's link as Seller B
        response = client.post(f'/api/v1/links/{link_seller_a.id}/toggle-active')
        assert response.status_code in [HTTPStatus.FORBIDDEN, HTTPStatus.NOT_FOUND, HTTPStatus.UNAUTHORIZED]
        
        # Verify link remains active
        link_seller_a.refresh_from_db()
        assert link_seller_a.is_active is True

    def test_regular_seller_cannot_access_staff_admin_endpoints(self, seller_a):
        client = Client()
        client.force_login(seller_a)
        
        response = client.get('/api/v1/admin/transactions')
        assert response.status_code in [HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED, HTTPStatus.NOT_FOUND]
