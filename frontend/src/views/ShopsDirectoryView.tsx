import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, Store, Star, Zap, Shield, ShieldCheck, Loader2, 
  X, Wallet, Truck, MessageCircle, ShoppingBag, 
  Sparkles, Layers, Phone, AlertTriangle
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import heroBanner from '../assets/hero_banner.webp';
import SEOHead from '../components/SEOHead';
import RecentReviewsCarousel from '../components/RecentReviewsCarousel';
import { useEscapeKey } from '../utils/useEscapeKey';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

interface ShopProduct {
  link_id: string;
  title: string;
  price_ghs: number;
}

interface ProductCard {
  link_id: string;
  title: string;
  description: string;
  price_ghs: number;
  image_url?: string;
  category?: string;
  escrow_url: string;
  seller_id: string;
  seller_username: string;
  seller_shop_name: string;
  seller_phone?: string;
  seller_profile_picture_url?: string;
  badge_verified_seller: boolean;
  badge_title?: string;
  seller_avg_rating: number;
  seller_total_reviews: number;
  whatsapp_contact_url: string;
  created_at: string;
}

interface ShopCard {
  seller_id: string;
  seller_username: string;
  shop_name: string;
  shop_description: string;
  shop_category: string;
  shop_categories?: string[];
  profile_picture_url?: string;
  banner_url?: string;
  joined_at: string;
  total_completed_escrows: number;
  total_reviews_count: number;
  avg_overall: number;
  badge_title?: string;
  is_featured: boolean;
  advertised_until?: string;
  seller_phone?: string;
  featured_products: ShopProduct[];
}

const IconTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <div className="group/tooltip relative inline-flex items-center justify-center cursor-help">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-1.5 hidden group-hover/tooltip:flex flex-col items-center z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
      <span className="bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-xl border border-slate-700/80">
        {text}
      </span>
      <div className="w-2 h-2 -mt-1 bg-slate-900 rotate-45 border-r border-b border-slate-700/80" />
    </div>
  </div>
);

export default function ShopsDirectoryView() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';

  const [matchedProducts, setMatchedProducts] = useState<ProductCard[]>([]);
  const [featuredShops, setFeaturedShops] = useState<ShopCard[]>([]);
  const [standardShops, setStandardShops] = useState<ShopCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS' | 'SHOPS'>('ALL');
  const [showAllStores, setShowAllStores] = useState(false);

  useEffect(() => {
    const urlQuery = searchParams.get('query') || searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || 'All';
    if (urlQuery !== query) setQuery(urlQuery);
    if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
  }, [searchParams]);

  // Promote Shop Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  useEscapeKey(() => setShowPromoteModal(false), showPromoteModal);
  const [promoteDuration, setPromoteDuration] = useState<7 | 30>(7);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');
  const [showApprovalStep, setShowApprovalStep] = useState(false);
  const [approvalData, setApprovalData] = useState<{ fee: number; remaining: number } | null>(null);

  // Interstitial Confirm Shipping Modal State for Featured Links
  const [shippingModalItem, setShippingModalItem] = useState<{ product: ShopProduct; shop: ShopCard } | null>(null);
  useEscapeKey(() => setShippingModalItem(null), Boolean(shippingModalItem));

  const getProductWhatsappUrl = (
    phoneRaw?: string,
    pTitle?: string,
    pPrice?: number,
    sName?: string,
    pCategory?: string,
    pImg?: string
  ) => {
    let clean = (phoneRaw || '').trim().replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');
    if (clean.startsWith('0')) {
      clean = '233' + clean.slice(1);
    }
    const params = new URLSearchParams();
    if (pTitle) params.set('title', pTitle);
    if (pPrice) params.set('price', pPrice.toFixed(2));
    if (pCategory) params.set('category', pCategory);
    if (pImg) params.set('img', pImg);
    const createLinkUrl = `${window.location.origin}/create-link?${params.toString()}`;

    const msg = `Hi ${sName || 'Seller'}, I saw your product "${pTitle}" (GH₵ ${(pPrice || 0).toFixed(2)}) on HendAxis Trust.\n\nMy delivery location is: [Your Town / Region]\nCould you confirm availability and total price with shipping?\n\nGenerate Escrow Link for this order:\n${createLinkUrl}`;
    return clean ? `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  const getShopWhatsappUrl = (phoneRaw?: string, sName?: string, username?: string) => {
    let clean = (phoneRaw || '').trim().replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');
    if (clean.startsWith('0')) {
      clean = '233' + clean.slice(1);
    }
    const storeUrl = `${window.location.origin}/store/${username}`;
    const msg = `Hi ${sName || username || 'Seller'}, I found your store on HendAxis Trust (${storeUrl}). I'd like to make an inquiry.`;
    return clean ? `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}` : '';
  };

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append('query', query.trim());
      if (selectedCategory !== 'All') params.append('category', selectedCategory);

      const res = await apiClient.get(`/reviews/shops?${params.toString()}`);
      setMatchedProducts(res.data.matched_products || []);
      setFeaturedShops(res.data.featured_shops || []);
      setStandardShops(res.data.standard_shops || []);
    } catch {
      console.error("Failed to load marketplace directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory();

      // Sync browser URL parameters with current search state smoothly
      const params = new URLSearchParams(window.location.search);
      if (query.trim()) {
        params.set('query', query.trim());
        params.delete('search');
      } else {
        params.delete('query');
        params.delete('search');
      }
      if (selectedCategory && selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      } else {
        params.delete('category');
      }

      const currentSearch = window.location.search.replace(/^\?/, '');
      const newSearch = params.toString();
      if (currentSearch !== newSearch) {
        setSearchParams(params, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName);
    setQuery(''); // Reset query text so user browses the selected category directly
    const params = new URLSearchParams();
    if (catName !== 'All') {
      params.set('category', catName);
    }
    setSearchParams(params, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDirectory();
    const params = new URLSearchParams(window.location.search);
    if (query.trim()) {
      params.set('query', query.trim());
      params.delete('search');
    } else {
      params.delete('query');
      params.delete('search');
    }
    if (selectedCategory && selectedCategory !== 'All') {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    setSearchParams(params, { replace: true });
  };

  const handlePromoteSubmit = async (
    e?: React.FormEvent,
    payViaGatewayOverride: boolean = false,
    isApprovedWallet: boolean = false
  ) => {
    if (e) e.preventDefault();
    setPromoteError('');
    setPromoteSuccess('');
    setIsPromoting(true);
    try {
      const res = await apiClient.post('/reviews/shop/promote', {
        duration_days: promoteDuration,
        pay_via_gateway: payViaGatewayOverride,
        approved_wallet_deduction: isApprovedWallet
      });

      if (res.data.requires_approval) {
        setApprovalData({
          fee: res.data.fee_amount_ghs,
          remaining: res.data.remaining_balance_ghs
        });
        setShowApprovalStep(true);
        setIsPromoting(false);
        return;
      }

      if (res.data.requires_paystack && res.data.checkout_url) {
        setPromoteSuccess('Redirecting to Paystack for ad payment...');
        window.location.href = res.data.checkout_url;
      } else {
        setPromoteSuccess(res.data.message);
        setShowApprovalStep(false);
        fetchDirectory();
      }
    } catch (err: any) {
      setPromoteError(err.response?.data?.message || err.response?.data?.detail || 'Failed to process shop promotion.');
    } finally {
      setIsPromoting(false);
    }
  };

  // Render Product Card
  const renderProductCard = (product: ProductCard) => (
    <div
      key={product.link_id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all group"
    >
      <div>
        {/* Product Image Preview */}
        <div className="relative w-full h-44 sm:h-48 rounded-2xl bg-slate-100 dark:bg-slate-950 overflow-hidden mb-3 border border-slate-200/80 dark:border-slate-800">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1.5">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              <span className="text-[11px] font-medium">HendAxis Escrow Product</span>
            </div>
          )}

          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-950/80 text-white backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Escrow Protected
            </span>
          </div>

          {product.category && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-950/80 text-indigo-200 backdrop-blur-md border border-indigo-400/30">
                {product.category}
              </span>
            </div>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {product.title}
        </h3>

        {/* Price & Shipping Exclusion Disclaimer */}
        <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              GH₵ {product.price_ghs.toFixed(2)}
            </span>
          </div>

          {/* Prominent Shipping Cost Disclaimer Badge */}
          <div
            className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40"
            title="Shipping cost is calculated based on your location and agreed upon with the seller."
          >
            <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Shipping cost is based on your location</span>
          </div>
        </div>
      </div>

      {/* Seller Info (Left) & Direct Icon Action Links (Right) */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 gap-2">
        <Link
          to={`/store/${product.seller_username}`}
          className="flex items-center gap-1.5 min-w-0 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          title={`Visit ${product.seller_shop_name || product.seller_username}'s storefront`}
        >
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
            {(product.seller_shop_name || product.seller_username || 'S')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-xs">
                {product.seller_shop_name || `@${product.seller_username}`}
              </span>
              {product.badge_verified_seller && (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            {product.seller_avg_rating > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                {product.seller_avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </Link>

        {/* Icon-Only Links: Phone and WhatsApp */}
        <div className="flex items-center gap-1.5 shrink-0">
          {product.seller_phone && (
            <a
              href={`tel:${product.seller_phone}`}
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer"
              title={`Call seller (${product.seller_phone})`}
              aria-label={`Call seller at ${product.seller_phone}`}
            >
              <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </a>
          )}
          {product.whatsapp_contact_url ? (
            <a
              href={product.whatsapp_contact_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
              title="Chat with seller on WhatsApp"
              aria-label="Chat with seller on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          ) : (
            <Link
              to={`/store/${product.seller_username}`}
              className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition"
              title="Visit Store"
              aria-label="Visit seller storefront"
            >
              <Store className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  // Render Shop Card
  const renderShopCard = (shop: ShopCard, isFeaturedAd: boolean = false) => {
    const shopWhatsappUrl = getShopWhatsappUrl(shop.seller_phone, shop.shop_name, shop.seller_username);
    const categoryName = shop.shop_categories && shop.shop_categories.length > 0
      ? shop.shop_categories[0]
      : (shop.shop_category || 'Ghanaian Marketplace');

    return (
      <div
        key={shop.seller_id}
        className={`rounded-3xl p-5 sm:p-6 transition-all border flex flex-col justify-between shadow-sm hover:shadow-xl ${
          isFeaturedAd
            ? 'bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 border-amber-400 dark:border-amber-600/60 ring-2 ring-amber-400/20 shadow-amber-500/10'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/40'
        }`}
      >
        <div className="space-y-3">
          {/* Top Header: Avatar, Name, Handle, Featured Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/store/${shop.seller_username}`} className="shrink-0">
                {shop.profile_picture_url ? (
                  <img
                    src={shop.profile_picture_url}
                    alt={shop.shop_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    {(shop.shop_name || shop.seller_username).charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="min-w-0">
                <Link to={`/store/${shop.seller_username}`} className="group block">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {shop.shop_name}
                    </h3>
                    <IconTooltip text="Verified Escrow Merchant">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    </IconTooltip>
                  </div>
                  <p className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                    @{shop.seller_username}
                  </p>
                </Link>
              </div>
            </div>

            {isFeaturedAd && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Zap className="w-3 h-3 fill-white" /> Featured Ad
              </span>
            )}
          </div>

          {/* Stats & Category Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[11px] border border-slate-200/80 dark:border-slate-700/60">
              <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              {shop.total_completed_escrows} Deals
            </span>

            <span className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-lg text-[11px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              {shop.avg_overall > 0 ? shop.avg_overall.toFixed(1) : 'New'}
              {shop.total_reviews_count > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">({shop.total_reviews_count})</span>
              )}
            </span>

            {(shop.shop_categories && shop.shop_categories.length > 0 ? shop.shop_categories : [shop.shop_category]).slice(0, 2).map((cat, i) => (
              <span key={i} className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 px-2 py-0.5 rounded-md whitespace-nowrap">
                {cat}
              </span>
            ))}
          </div>

          {/* Description or Smart Fallback */}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed min-h-[32px]">
            {shop.shop_description || `Verified escrow store on HendAxis Trust specializing in ${categoryName} with 100% buyer protection.`}
          </p>

          {/* Featured Links (if any) OR Custom Orders Placeholder Box */}
          {shop.featured_products && shop.featured_products.length > 0 ? (
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Featured Links</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                  <Truck className="h-2.5 w-2.5" /> Confirm shipping first
                </span>
              </div>
              <div className="space-y-1.5">
                {shop.featured_products.slice(0, 2).map(prod => (
                  <button
                    key={prod.link_id}
                    type="button"
                    onClick={() => setShippingModalItem({ product: prod, shop })}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-300 dark:hover:border-amber-700 transition group text-xs text-left cursor-pointer"
                    title="Click to verify delivery terms with seller before payment"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate max-w-[170px]">
                      {prod.title}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 flex items-center gap-1 shrink-0 font-mono">
                      GH₵ {prod.price_ghs.toFixed(2)}
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded font-sans font-bold">Inquire</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Storefront Catalog</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" /> Escrow Ready
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate text-[11px] font-medium">Accepts custom escrow orders & direct inquiries</span>
                </div>
                <Link
                  to={`/store/${shop.seller_username}`}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-1.5"
                >
                  Browse →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Standardized Bottom Action Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Link
            to={`/store/${shop.seller_username}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Visit Storefront →</span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {shop.seller_phone && (
              <a
                href={`tel:${shop.seller_phone}`}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer"
                title={`Call ${shop.shop_name || shop.seller_username}`}
                aria-label={`Call merchant at ${shop.seller_phone}`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </a>
            )}
            {shopWhatsappUrl && (
              <a
                href={shopWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
                title="Chat on WhatsApp"
                aria-label="Chat with merchant on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalShops = featuredShops.length + standardShops.length;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      <SEOHead
        title="Marketplace Directory — Find Products & Verified Escrow Shops in Ghana"
        description="Search active escrow products, verified online stores, and boutique merchants in Ghana. Transparent pricing with scam-free buyer protection."
        canonicalUrl="/shops"
      />

      {/* Hero Search Section */}
      <div className="bg-slate-950 text-white min-h-[340px] sm:min-h-[400px] px-4 sm:px-6 lg:px-8 pt-8 pb-6 relative overflow-hidden flex flex-col justify-between border-b border-slate-800">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Marketplace Banner" className="w-full h-full object-cover opacity-100" fetchPriority="high" decoding="async" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/45 to-slate-950/20" />
        </div>

        <div className="max-w-5xl w-full mx-auto relative z-10 flex flex-col justify-between flex-1">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Ghana's Escrow Marketplace
            </div>
            {/* <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              Search Products & Verified Stores
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto drop-shadow">
              Find products by name or description. Buy directly with escrow protection or message the merchant on WhatsApp.
            </p> */}
          </div>

          {/* Transparent Search Bar & Category Scroller (NO solid outer card) */}
          <div className="space-y-3 mt-4 w-full">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
              <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products or stores (e.g. 'iPhone 15', 'Bone straight wig', 'Sneakers', 'Solar')..."
                className="w-full pl-12 pr-32 sm:pr-36 py-3.5 bg-black/40 hover:bg-black/50 focus:bg-black/60 backdrop-blur-md rounded-2xl text-xs sm:text-sm border border-white/20 shadow-xl focus:ring-4 focus:ring-blue-500/30 outline-none font-medium transition-all text-white placeholder-slate-300"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    const params = new URLSearchParams(window.location.search);
                    params.delete('query');
                    params.delete('search');
                    setSearchParams(params, { replace: true });
                  }}
                  className="absolute right-24 sm:right-28 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full transition cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" /> Search
              </button>
            </form>

            {/* Category Filter Pills (All 16 Categories) with scrollbar hidden */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pt-1">
              <button
                onClick={() => handleCategorySelect('All')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition backdrop-blur-md cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'All'
                    ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                    : 'bg-black/35 hover:bg-black/50 text-white/90 hover:text-white border border-white/20'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> All Categories
              </button>

              {MARKETPLACE_CATEGORIES.map(cat => {
                const IconComp = cat.icon;
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition backdrop-blur-md cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                        : 'bg-black/35 hover:bg-black/50 text-white/90 hover:text-white border border-white/20'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{cat.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {/* View Mode Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Results
            </button>

            <button
              onClick={() => setActiveTab('SHOPS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'SHOPS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              Verified Stores ({totalShops})
            </button>

            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'PRODUCTS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Products ({matchedProducts.length})
            </button>
          </div>

          {/* Promote Shop Button for Merchants */}
          <button
            onClick={() => setShowPromoteModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4 fill-white" /> Advertise My Shop
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Searching marketplace for products & stores...</p>
          </div>
        ) : (
          <div className="space-y-12">

            {/* 1. VERIFIED ESCROW STORES SECTION (Row 1: Sponsored/Paid, Rows 2-3: Standard shops) */}
            {(activeTab === 'ALL' || activeTab === 'SHOPS') && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      Verified Escrow Stores ({totalShops})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      KYC-verified merchants with buyer protection guarantees.
                    </p>
                  </div>
                </div>

                {/* ROW 1: FEATURED SPONSORED STORES (Paid Advertisements) */}
                {featuredShops.length > 0 && (
                  <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                          <Zap className="h-4 w-4 fill-white" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">Featured Sponsored Stores</h3>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">Promoted escrow merchants with verified active catalogs</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/50 px-3 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-800">
                        {featuredShops.length} Sponsored
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredShops.map(shop => renderShopCard(shop, true))}
                    </div>
                  </div>
                )}

                {/* ROWS 2 & 3: STANDARD / RANDOM STORES */}
                {standardShops.length > 0 && (
                  <div className="space-y-4">
                    {featuredShops.length > 0 && (
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>All Verified Merchants</span>
                      </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {((showAllStores || activeTab === 'SHOPS') ? standardShops : standardShops.slice(0, 6)).map(shop => renderShopCard(shop, false))}
                    </div>

                    {/* View All / Collapse Button */}
                    {standardShops.length > 6 && activeTab === 'ALL' && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setShowAllStores(!showAllStores)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{showAllStores ? 'Show Fewer Stores' : `View All Verified Stores (${totalShops})`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {standardShops.length === 0 && featuredShops.length === 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                    <Shield className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No matching stores found</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search terms or category filter.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. RECENT CUSTOMER REVIEWS (Shown when browsing without active search query) */}
            {!query.trim() && (activeTab === 'ALL') && (
              <div className="pt-2">
                <RecentReviewsCarousel
                  mode="multi-column"
                  title="Recent Customer Reviews"
                  subtitle="Explore verified feedback and ratings from recent escrow purchases across Ghana."
                />
              </div>
            )}

            {/* 3. MATCHED PRODUCTS & ESCROW OFFERS GRID */}
            {(activeTab === 'ALL' || activeTab === 'PRODUCTS') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                      {query.trim() ? `Search Results for "${query}"` : 'Marketplace Products & Escrow Offers'} ({matchedProducts.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Shipping cost is based on your location and agreed upon with the merchant.
                    </p>
                  </div>
                </div>

                {matchedProducts.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
                    <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No matching products found</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Try searching with general keywords (e.g. 'phone', 'bag', 'shoes') or browse categories.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {matchedProducts.map(renderProductCard)}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* SHOP PROMOTION MODAL */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative my-auto">
            
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 fill-white" />
                <h3 className="text-base font-bold">Advertise Your Store</h3>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {!user ? (
                <div className="text-center space-y-4 py-4">
                  <Zap className="h-12 w-12 text-amber-500 mx-auto" />
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Advertise Your Escrow Store</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Log in as a verified seller to feature your shop at the top of the Marketplace Directory.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Log In to Advertise
                  </Link>
                </div>
              ) : showApprovalStep && approvalData ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-blue-600" />
                      Wallet Payment Confirmation
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                      Deducting <strong>GH₵ {approvalData.fee.toFixed(2)}</strong> from your available wallet balance for {promoteDuration} days of featured advertising.
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Remaining wallet balance after deduction: <strong>GH₵ {approvalData.remaining.toFixed(2)}</strong>
                    </p>
                  </div>

                  {promoteError && <p className="text-xs text-rose-500">{promoteError}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePromoteSubmit(undefined, false, true)}
                      disabled={isPromoting}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      {isPromoting ? 'Processing...' : 'Confirm & Deduct Wallet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePromoteSubmit(undefined, true, false)}
                      disabled={isPromoting}
                      className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Pay via MoMo / Card
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePromoteSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Feature your shop at the top of the Marketplace Directory with a "Featured Ad ⚡" badge to drive buyer discovery.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setPromoteDuration(7)}
                      className={`p-3.5 rounded-2xl border cursor-pointer text-center transition ${
                        promoteDuration === 7
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs font-bold block">7 Days</span>
                      <span className="text-lg font-black text-amber-600">GH₵ 50</span>
                    </div>

                    <div
                      onClick={() => setPromoteDuration(30)}
                      className={`p-3.5 rounded-2xl border cursor-pointer text-center transition ${
                        promoteDuration === 30
                          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs font-bold block">30 Days</span>
                      <span className="text-lg font-black text-amber-600">GH₵ 150</span>
                    </div>
                  </div>

                  {promoteError && <p className="text-xs text-rose-500">{promoteError}</p>}
                  {promoteSuccess && <p className="text-xs text-emerald-500">{promoteSuccess}</p>}

                  <button
                    type="submit"
                    disabled={isPromoting}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {isPromoting ? 'Processing Promotion...' : `Promote Shop for GH₵ ${promoteDuration === 7 ? '50' : '150'}`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interstitial Confirm Shipping Modal for Featured Shop Links */}
      {shippingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                    Confirm Delivery with Seller
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify shipping fees to your destination
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShippingModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selected Product Snapshot */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                  {shippingModalItem.product.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Store: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{shippingModalItem.shop.shop_name}</strong>
                </p>
              </div>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                GH₵ {shippingModalItem.product.price_ghs.toFixed(2)}
              </span>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Important Shipping Notice</span>
              </div>
              <p className="leading-relaxed text-[11.5px]">
                Shipping costs in Ghana depend on your specific city/town and chosen transport method (e.g. Courier or Station Bus OTP).
              </p>
              <p className="leading-relaxed text-[11.5px] font-medium text-amber-900 dark:text-amber-100">
                If your delivery location costs more than what is included in this link, the seller may ask for an additional shipping fee before dispatching your package.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <a
                href={getProductWhatsappUrl(
                  shippingModalItem.shop.seller_phone,
                  shippingModalItem.product.title,
                  shippingModalItem.product.price_ghs,
                  shippingModalItem.shop.shop_name,
                  shippingModalItem.shop.shop_category
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat on WhatsApp to Confirm Delivery</span>
              </a>

              {shippingModalItem.shop.seller_phone && (
                <a
                  href={`tel:${shippingModalItem.shop.seller_phone}`}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 text-center"
                >
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Call Seller ({shippingModalItem.shop.seller_phone})</span>
                </a>
              )}

              <div className="pt-2 text-center">
                <Link
                  to={`/l/${shippingModalItem.product.link_id}`}
                  onClick={() => setShippingModalItem(null)}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline"
                >
                  I have already agreed on delivery — Proceed to Checkout →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
