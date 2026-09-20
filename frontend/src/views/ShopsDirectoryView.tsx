import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Store, Star, Zap, Shield, ShieldCheck, Loader2, Award, ArrowUpRight, X, CheckCircle2, FileText, Wallet, CreditCard } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import heroBanner from '../assets/hero_banner.webp';
import SEOHead from '../components/SEOHead';

import RecentReviewsCarousel from '../components/RecentReviewsCarousel';

import { useEscapeKey } from '../utils/useEscapeKey';

interface ShopProduct {
  link_id: string;
  title: string;
  price_ghs: number;
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
  featured_products: ShopProduct[];
}

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Beauty', 'Home & Living', 'Services', 'General'];

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
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || searchParams.get('search') || '';
  
  const [featuredShops, setFeaturedShops] = useState<ShopCard[]>([]);
  const [standardShops, setStandardShops] = useState<ShopCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const urlQuery = searchParams.get('query') || searchParams.get('search');
    if (urlQuery !== null && urlQuery !== query) {
      setQuery(urlQuery);
    }
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
  const [createdInvoiceUrl, setCreatedInvoiceUrl] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append('query', query.trim());
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      
      const res = await apiClient.get(`/reviews/shops?${params.toString()}`);
      setFeaturedShops(res.data.featured_shops || []);
      setStandardShops(res.data.standard_shops || []);
    } catch {
      console.error("Failed to load directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShops();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

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
        if (res.data.invoice_url) {
          setCreatedInvoiceUrl(res.data.invoice_url);
        }
        setShowApprovalStep(false);
        fetchShops();
      }
    } catch (err: any) {
      setPromoteError(err.response?.data?.message || err.response?.data?.detail || 'Failed to process shop promotion.');
    } finally {
      setIsPromoting(false);
    }
  };

  const renderShopCard = (shop: ShopCard, isAd: boolean = false) => (
    <div
      key={shop.seller_id}
      className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 hover:shadow-xl flex flex-col justify-between ${
        isAd 
          ? 'border-amber-400/80 dark:border-amber-500/70 shadow-md ring-1 ring-amber-400/30' 
          : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50'
      }`}
    >
      {/* 1. Cover Banner Strip */}
      <div className="h-20 sm:h-24 w-full relative bg-slate-900 rounded-t-3xl overflow-hidden">
        {shop.banner_url ? (
          <>
            <img src={shop.banner_url} alt={shop.shop_name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-slate-950/40" />
          </>
        ) : (
          <div className={`w-full h-full ${
            isAd ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 opacity-90' : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 opacity-90'
          }`} />
        )}

        {/* Featured / Promoted Pill */}
        {isAd && (
          <div className="absolute top-2.5 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-950/85 backdrop-blur-md text-amber-400 shadow-md border border-amber-400/70">
              <Zap className="h-3 w-3 fill-amber-400" /> Promoted
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Overlapping Logo + Shop Name & Readily Visible Username */}
          <div className="flex items-start gap-3.5 mb-2.5">
            {/* Logo: -mt-7 (28px) on mobile / -mt-8 (32px) on desktop for exact 50% overlap */}
            <Link to={`/store/${shop.seller_username}`} className="-mt-7 sm:-mt-8 shrink-0 relative z-20 group block">
              {shop.profile_picture_url ? (
                <img
                  src={shop.profile_picture_url}
                  alt={shop.shop_name}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-md bg-white dark:bg-slate-800 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-md border-4 border-white dark:border-slate-900 group-hover:scale-105 transition-transform ${
                  isAd ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                }`}>
                  {(shop.shop_name || shop.seller_username).charAt(0).toUpperCase()}
                </div>
              )}
            </Link>

            {/* Shop Details: Positioned cleanly next to lower half of logo */}
            <div className="min-w-0 flex-1 pt-1">
              <Link to={`/store/${shop.seller_username}`} className="group block">
                {/* Row 1: Shop Name + Badges */}
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate leading-tight">
                    {shop.shop_name}
                  </h3>
                  
                  {/* Verified Escrow Merchant Tooltip Icon */}
                  <IconTooltip text="Verified Escrow Merchant">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-blue-50 dark:fill-blue-900/40 shrink-0" />
                  </IconTooltip>

                  {/* Custom Merchant Award Badge Tooltip Icon */}
                  {shop.badge_title && (
                    <IconTooltip text={shop.badge_title}>
                      <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-900/40 shrink-0" />
                    </IconTooltip>
                  )}
                </div>

                {/* Row 2: Readily Visible Username (Dedicated line, clean font-mono styling) */}
                <p className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline mt-0.5 truncate" title={`@${shop.seller_username}`}>
                  @{shop.seller_username}
                </p>
              </Link>
            </div>
          </div>

          {/* Row 3: Escrows & Ratings Stats + Categories Chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg text-[11px] border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              {shop.total_completed_escrows} Escrows
            </span>

            <span className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-lg text-[11px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              {shop.avg_overall > 0 ? (
                <span className="flex items-center gap-0.5">
                  {shop.avg_overall.toFixed(1)}
                  {shop.total_reviews_count > 0 && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({shop.total_reviews_count})</span>}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400">New</span>
              )}
            </span>

            {(shop.shop_categories && shop.shop_categories.length > 0 ? shop.shop_categories : [shop.shop_category]).map((cat, i) => (
              <span key={i} className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 px-2 py-0.5 rounded-md whitespace-nowrap">
                {cat}
              </span>
            ))}
          </div>

          {/* Horizontal Dividing Line */}
          <hr className="border-slate-100 dark:border-slate-800 my-3" />

          {/* Other Card Details: Description */}
          {shop.shop_description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {shop.shop_description}
            </p>
          )}
        </div>

        {/* Featured Products List */}
        {shop.featured_products && shop.featured_products.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 mt-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Available Payment Links</span>
            <div className="space-y-1.5">
              {shop.featured_products.map(prod => (
                <Link
                  key={prod.link_id}
                  to={`/l/${prod.link_id}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-700/60 transition group text-xs sm:text-sm"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-[200px]">
                    {prod.title}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-0.5">
                    GHS {prod.price_ghs.toFixed(2)}
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const directoryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Verified Escrow Shops Directory — HendAxis Trust',
    'description': 'Browse verified storefronts, online shops, and escrow payment links in Ghana.',
    'url': 'https://trust.hendaxis.com/shops'
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      <SEOHead
        title="Verified Shops Marketplace Directory — HendAxis Trust"
        description="Browse verified online stores, social media sellers, and active escrow payment links in Ghana. Buy with complete buyer protection."
        canonicalUrl="https://trust.hendaxis.com/shops"
        jsonLd={directoryJsonLd}
      />
      
      {/* Hero Banner Section */}
      <div className="bg-slate-950 text-white min-h-[320px] sm:min-h-[380px] px-4 sm:px-6 lg:px-8 pt-6 pb-4 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Marketplace Banner" className="w-full h-full object-cover opacity-100" fetchPriority="high" decoding="async" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/30" />
        </div>
        
        <div className="max-w-5xl w-full mx-auto relative z-10 flex flex-col justify-between flex-1">
          {/* BOTTOM: Search Box & Category Filter Pills with Protective Glassmorphic Container */}
          <div className="space-y-3 mt-auto pt-6 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl">
            {/* Search Box */}
            <form onSubmit={(e) => { e.preventDefault(); fetchShops(); }} className="relative max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search shop name, seller username, or product..."
                className="w-full pl-10 pr-28 py-2.5 hero-search-input rounded-2xl text-xs sm:text-sm border shadow-2xl focus:ring-4 focus:ring-blue-500/30 outline-none font-medium transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Store className="h-3.5 w-3.5" /> Search
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition backdrop-blur-sm cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md border border-blue-400/40 font-bold'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/15 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8">
        
        {/* RECENT CUSTOMER REVIEWS MULTI-COLUMN CAROUSEL */}
        <RecentReviewsCarousel
          mode="multi-column"
          title="Recent Customer Reviews"
          subtitle="Explore verified feedback and ratings from recent escrow purchases across Ghana."
        />
        
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Searching marketplace directory...</p>
          </div>
        ) : (
          <>
            {/* ROW 1: FEATURED SPONSORED ADVERTISED SHOPS */}
            {featuredShops.length > 0 && (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                      <Zap className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">Featured Shops</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Promoted escrow merchants with verified products</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/50 px-3 py-1 rounded-full border border-amber-300/80 dark:border-amber-800">
                    {featuredShops.length} Sponsored Store(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredShops.map(shop => renderShopCard(shop, true))}
                </div>
              </div>
            )}

            {/* ROW 2: ALL STANDARD SHOPS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" /> All Escrow Merchants ({standardShops.length})
                </h2>
              </div>

              {standardShops.length === 0 && featuredShops.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
                  <Shield className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-700" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-slate-200">No matching shops found</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Try adjusting your search keywords or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {standardShops.map(shop => renderShopCard(shop, false))}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* SHOP PROMOTION MODAL */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative my-auto">
            
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white shrink-0">
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
                  <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">Advertise Your Escrow Store</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
                    Promote your store at the top of the Marketplace Directory. Log in or create a seller account to start advertising.
                  </p>
                  <div className="flex gap-3 justify-center pt-2">
                    <Link
                      to="/login"
                      className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      className="py-2.5 px-5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold rounded-xl text-xs transition"
                    >
                      Register Seller
                    </Link>
                  </div>
                </div>
              ) : promoteSuccess ? (
                <div className="text-center space-y-4 py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100">Shop Promoted!</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{promoteSuccess}</p>
                  
                  {createdInvoiceUrl && (
                    <Link
                      to={createdInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
                    >
                      <FileText className="h-4 w-4" />
                      View & Download Invoice Receipt
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setShowPromoteModal(false);
                      setPromoteSuccess('');
                      setShowApprovalStep(false);
                      setApprovalData(null);
                      setCreatedInvoiceUrl(null);
                    }}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition"
                  >
                    Done
                  </button>
                </div>
              ) : showApprovalStep && approvalData ? (
                <div className="space-y-4">
                  {promoteError && (
                    <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-800 text-center">
                      {promoteError}
                    </div>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                      <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <span>Wallet Balance Deduction Consent</span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                      You are about to feature your shop for <strong className="text-gray-900 dark:text-white">{promoteDuration} Days</strong>. 
                      Please confirm that you authorize deducting the ad fee from your available wallet balance.
                    </p>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-amber-100 dark:border-amber-900/40 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-gray-600 dark:text-slate-400">
                        <span>Ad Package ({promoteDuration} Days):</span>
                        <span className="font-semibold text-gray-900 dark:text-slate-200">GHS {approvalData.fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-2">
                        <span>Wallet Balance After Deduction:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">GHS {approvalData.remaining.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={() => handlePromoteSubmit(undefined, false, true)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-green-600/20 disabled:opacity-70 flex justify-center items-center gap-2"
                    >
                      {isPromoting ? <Loader2 className="h-5 w-5 animate-spin" /> : `✓ Approve & Deduct GHS ${approvalData.fee.toFixed(2)}`}
                    </button>

                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={() => handlePromoteSubmit(undefined, true, false)}
                      className="w-full py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition flex justify-center items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay via Paystack Instead
                    </button>

                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={() => {
                        setShowApprovalStep(false);
                        setApprovalData(null);
                      }}
                      className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 font-medium text-center"
                    >
                      Back to Selection
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePromoteSubmit} className="space-y-5">
                  {promoteError && (
                    <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-800 text-center">
                      {promoteError}
                    </div>
                  )}

                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    Feature your store at the top row of the Marketplace Directory. Ad fees are credited directly to platform revenue.
                  </p>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Select Advertising Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPromoteDuration(7)}
                        className={`p-4 rounded-2xl border text-center transition ${
                          promoteDuration === 7
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/20 text-amber-900 dark:text-amber-300 font-bold'
                            : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm">7 Days Ad</span>
                        <span className="block text-lg font-black text-amber-600 dark:text-amber-400 mt-1">GHS 50.00</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPromoteDuration(30)}
                        className={`p-4 rounded-2xl border text-center transition ${
                          promoteDuration === 30
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/20 text-amber-900 dark:text-amber-300 font-bold'
                            : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-sm">30 Days Ad</span>
                        <span className="block text-lg font-black text-amber-600 dark:text-amber-400 mt-1">GHS 150.00</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPromoting}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-700 transition shadow-lg shadow-amber-500/20 disabled:opacity-70 flex justify-center items-center"
                  >
                    {isPromoting ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay GHS ${promoteDuration === 7 ? '50.00' : '150.00'} & Feature Shop`}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FLOATING STICKY ACTION BUTTON */}
      <button
        onClick={() => setShowPromoteModal(true)}
        className={`fixed bottom-6 right-6 z-40 py-3 px-5 rounded-full text-white font-bold text-xs sm:text-sm shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border backdrop-blur-md cursor-pointer ${
          user
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/40 border-amber-300/40'
            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-600/40 border-blue-300/40'
        }`}
      >
        {user ? (
          <>
            <Zap className="h-4 w-4 fill-white animate-pulse" />
            <span>Advertise Your Shop Here</span>
          </>
        ) : (
          <>
            <Store className="h-4 w-4" />
            <span>Create Account to Start Selling</span>
          </>
        )}
      </button>

    </div>
  );
}
