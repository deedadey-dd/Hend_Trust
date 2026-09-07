from django.conf import settings
from django.contrib import admin
from django.urls import path
from .api import api
from apps.core.seo import robots_view, sitemap_view
from apps.core.views import admin_honeypot_view

admin_url_path = getattr(settings, 'DJANGO_ADMIN_URL', 'admin/').strip('/') + '/'

urlpatterns = [
    path('robots.txt', robots_view, name='robots'),
    path('sitemap.xml', sitemap_view, name='sitemap'),
    path(admin_url_path, admin.site.urls),
    path('api/v1/', api.urls),
]

# If admin URL is customized away from 'admin/', set decoy honeypot trap on /admin/
if admin_url_path != 'admin/':
    urlpatterns.insert(2, path('admin/', admin_honeypot_view, name='admin_honeypot'))

