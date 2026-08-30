from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
from apps.users.models import User
from apps.links.models import PaymentLink

def robots_view(request):
    """
    Serves a dynamically generated robots.txt allowing search engines to index
    all public pages, dynamic storefronts, and checkout links while blocking
    private user portals and manager dashboards.
    """
    main_domain = getattr(settings, 'FRONTEND_URL', 'https://trust.hendaxis.com').rstrip('/')
    content = f"""# HendAxis Trust — Robots.txt Rules for Search Engine Crawlers

User-agent: *
Allow: /
Allow: /shops
Allow: /directory
Allow: /store/
Allow: /seller/
Allow: /l/
Allow: /developers
Allow: /docs/api
Allow: /help
Allow: /contact
Allow: /login
Allow: /register
Allow: /activate-account

# Block private seller & admin portals
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /admin
Disallow: /admin/
Disallow: /profile
Disallow: /ledger
Disallow: /create-link
Disallow: /links

# Sitemap index location
Sitemap: {main_domain}/sitemap.xml
"""
    return HttpResponse(content.strip(), content_type="text/plain; charset=utf-8")


def sitemap_view(request):
    """
    Dynamically generates an XML sitemap (sitemap.xml) for Google Search Console,
    including static public pages, active verified shop storefronts, and active payment links.
    """
    main_domain = getattr(settings, 'FRONTEND_URL', 'https://trust.hendaxis.com').rstrip('/')
    pay_domain = getattr(settings, 'PAYMENT_LINK_DOMAIN', 'https://pay.hendaxis.com').rstrip('/')
    now_str = timezone.now().strftime('%Y-%m-%d')

    static_urls = [
        {'loc': f'{main_domain}/', 'priority': '1.0', 'changefreq': 'daily'},
        {'loc': f'{main_domain}/shops', 'priority': '0.9', 'changefreq': 'daily'},
        {'loc': f'{main_domain}/developers', 'priority': '0.8', 'changefreq': 'weekly'},
        {'loc': f'{main_domain}/help', 'priority': '0.8', 'changefreq': 'weekly'},
        {'loc': f'{main_domain}/contact', 'priority': '0.7', 'changefreq': 'monthly'},
        {'loc': f'{main_domain}/login', 'priority': '0.6', 'changefreq': 'monthly'},
        {'loc': f'{main_domain}/register', 'priority': '0.6', 'changefreq': 'monthly'},
    ]

    # Dynamic Seller Storefronts
    seller_urls = []
    sellers = User.objects.filter(shop_name__gt='').exclude(username='')[:500]
    for s in sellers:
        seller_urls.append({
            'loc': f'{main_domain}/store/{s.username}',
            'priority': '0.8',
            'changefreq': 'daily'
        })

    # Dynamic Active Payment Links (using payment link domain pay.hendaxis.com)
    link_urls = []
    active_links = PaymentLink.objects.filter(is_active=True).order_by('-created_at')[:1000]
    for link in active_links:
        link_urls.append({
            'loc': f'{pay_domain}/l/{link.id}',
            'priority': '0.7',
            'changefreq': 'weekly'
        })

    all_urls = static_urls + seller_urls + link_urls

    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_lines.append('<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">')

    for item in all_urls:
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{item["loc"]}</loc>')
        xml_lines.append(f'    <lastmod>{now_str}</lastmod>')
        xml_lines.append(f'    <changefreq>{item["changefreq"]}</changefreq>')
        xml_lines.append(f'    <priority>{item["priority"]}</priority>')
        xml_lines.append('  </url>')

    xml_lines.append('</urlset>')

    xml_content = '\n'.join(xml_lines)
    return HttpResponse(xml_content, content_type="application/xml; charset=utf-8")
