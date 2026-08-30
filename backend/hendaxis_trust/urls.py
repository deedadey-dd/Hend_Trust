from django.contrib import admin
from django.urls import path
from .api import api
from apps.core.seo import robots_view, sitemap_view

urlpatterns = [
    path('robots.txt', robots_view, name='robots'),
    path('sitemap.xml', sitemap_view, name='sitemap'),
    path('admin/', admin.site.urls),
    path('api/v1/', api.urls),
]
