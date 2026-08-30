import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

export default function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = 'https://trust.hendaxis.com/og_preview_banner.jpg',
  type = 'website',
  jsonLd
}: SEOHeadProps) {
  useEffect(() => {
    // 1. Update Title
    const fullTitle = title.includes('HendAxis') ? title : `${title} | HendAxis Trust`;
    document.title = fullTitle;

    // Helper to update meta tag by name or property
    const updateMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(`meta[${selector}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Update Meta Description
    updateMeta('name', 'name', 'description', description);
    updateMeta('name', 'name', 'twitter:title', fullTitle);
    updateMeta('name', 'name', 'twitter:description', description);
    updateMeta('name', 'name', 'twitter:image', ogImage);

    // 3. Update Open Graph
    updateMeta('property', 'property', 'og:title', fullTitle);
    updateMeta('property', 'property', 'og:description', description);
    updateMeta('property', 'property', 'og:type', type);
    updateMeta('property', 'property', 'og:image', ogImage);

    const currentUrl = canonicalUrl || window.location.href;
    updateMeta('property', 'property', 'og:url', currentUrl);

    // 4. Update Canonical Link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', currentUrl);

    // 5. Inject / Update JSON-LD Structured Data
    if (jsonLd) {
      let scriptEl = document.getElementById('json-ld-schema');
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'json-ld-schema';
        scriptEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      // Cleanup script on unmount if needed
    };
  }, [title, description, canonicalUrl, ogImage, type, jsonLd]);

  return null;
}
