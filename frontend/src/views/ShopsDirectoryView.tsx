import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, Star, Zap, Shield, ShieldCheck, Loader2, Award, ArrowUpRight, X, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import heroBanner from '../assets/hero_banner.jpg';
import SEOHead from '../components/SEOHead';

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
  const [featuredShops, setFeaturedShops] = useState<ShopCard[]>([]);
  const [standardShops, setStandardShops] = useState<ShopCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Promote Shop Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  useEscapeKey(() => setShowPromoteModal(false), showPromoteModal);
  const [promoteDuration, setPromoteDuration] = useState<7 | 30>(7);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');

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

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteError('');
    setPromoteSuccess('');
    setIsPromoting(true);
    try {
      const res = await apiClient.post('/reviews/shop/promote', { duration_days: promoteDuration });
      if (res.data.requires_paystack && res.data.checkout_url) {
        setPromoteSuccess('Redirecting to Paystack for ad payment...');
        window.location.href = res.data.checkout_url;
      } else {
        setPromoteSuccess(res.data.message);
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
          : 'border-gray-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50'
      }`}
    >
      {/* 1. Cover Banner Strip (Height: 80px mobile / 96px desktop) */}
      <div className="h-20 sm:h-24 w-full relative bg-slate-900 rounded-t-3xl overflow-hidden">
        {shop.banner_url ? (
          <img src={shop.banner_url} alt={shop.shop_name} className="w-full h-full object-cover opacity-100" />
        ) : (
          <div className={`w-full h-full ${
            isAd ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 opacity-90' : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 opacity-90'
          }`} />
        )}
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Overlapping Logo (50% banner overlap) + Shop Details */}
          <div className="flex items-start gap-3.5 mb-2">
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
                {/* Line 1: Shop Name + Tooltip Icons (Always 1 Single Line) */}
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-nowrap">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate leading-tight shrink min-w-0">
                    {shop.shop_name}
                  </h3>
                  
                  {/* Verified Escrow Merchant Tooltip Icon */}
                  <IconTooltip text="Verified Escrow Merchant">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 fill-blue-50 dark:fill-blue-900/40 shrink-0" />
                  </IconTooltip>

                  {/* Featured Sponsored Merchant Tooltip Icon */}
                  {isAd && (
                    <IconTooltip text="Featured Sponsored Merchant">
                      <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-500 shrink-0 animate-pulse" />
                    </IconTooltip>
                  )}

                  {/* Custom Merchant Award Badge Tooltip Icon */}
                  {shop.badge_title && (
                    <IconTooltip text={shop.badge_title}>
                      <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-900/40 shrink-0" />
                    </IconTooltip>
                  )}
                </div>

                {/* Line 2: Username + Number of Transactions + Rating Stars (Always 1 Single Line) */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-0.5 sm:mt-1 flex-nowrap min-w-0 overflow-hidden">
                  <span className="font-medium text-gray-600 dark:text-slate-400 truncate max-w-[85px] sm:max-w-[120px] shrink">@{shop.seller_username}</span>
                  <span className="text-gray-300 dark:text-slate-700 shrink-0">•</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 text-[11px]">
                    {shop.total_completed_escrows} Escrows
                  </span>
                  <span className="text-gray-300 dark:text-slate-700 shrink-0">•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-gray-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-800/40 px-1.5 py-0.5 rounded transition shrink-0 whitespace-nowrap">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                    {shop.avg_overall > 0 ? (
                      <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-0.5">
                        {shop.avg_overall.toFixed(1)}
                        {shop.total_reviews_count > 0 && <span className="text-[10px] text-gray-500 dark:text-slate-400 font-normal">({shop.total_reviews_count})</span>}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400">New</span>
                    )}
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* Line 3: Categories below logo */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            {(shop.shop_categories && shop.shop_categories.length > 0 ? shop.shop_categories : [shop.shop_category]).map((cat, i) => (
              <span key={i} className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-800/40 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {cat}
              </span>
            ))}
          </div>

          {/* Horizontal Dividing Line */}
          <hr className="border-gray-100 dark:border-slate-800 my-3.5" />

          {/* Other Card Details: Description */}
          {shop.shop_description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {shop.shop_description}
            </p>
          )}
        </div>

        {/* Featured Products List */}
        {shop.featured_products.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-1.5 mt-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Available Payment Links</span>
            <div className="space-y-1.5">
              {shop.featured_products.map(prod => (
                <Link
                  key={prod.link_id}
                  to={`/l/${prod.link_id}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border border-gray-100 dark:border-slate-700/60 transition group text-xs sm:text-sm"
                >
                  <span className="font-medium text-gray-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate max-w-[200px]">
                    {prod.title}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-0.5">
                    GHS {prod.price_ghs.toFixed(2)}
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
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
    <div className="min-h-screen bg-gray-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      <SEOHead
        title="Verified Shops Marketplace Directory — HendAxis Trust"
        description="Browse verified online stores, social media sellers, and active escrow payment links in Ghana. Buy with complete buyer protection."
        canonicalUrl="https://trust.hendaxis.com/shops"
        jsonLd={directoryJsonLd}
      />
      
      {/* Hero Banner Section */}
      <div className="bg-slate-950 text-white min-h-[320px] sm:min-h-[380px] px-4 sm:px-6 lg:px-8 pt-6 pb-1 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Marketplace Banner" className="w-full h-full object-cover opacity-100" />
        </div>
        
        <div className="max-w-5xl w-full mx-auto relative z-10 flex flex-col justify-between flex-1">
          {/* TOP: Escrow Merchant Marketplace Directory label */}
          {/* <div className="flex items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 bg-black/40 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                <Store className="h-3.5 w-3.5 text-blue-400" /> Escrow Merchant Marketplace Directory
              </span>
            </div>
          </div> */}

          {/* BOTTOM: Search Box & Category Filter Pills */}
          <div className="space-y-2 mt-auto pt-8">
            {/* Search Box */}
            <form onSubmit={(e) => { e.preventDefault(); fetchShops(); }} className="relative max-w-sm">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search shop name, seller username, or product..."
                className="w-full pl-10 pr-28 py-2.5 hero-search-input rounded-2xl text-xs sm:text-sm border shadow-2xl focus:ring-4 focus:ring-blue-500/30 outline-none font-medium transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
              >
                <Store className="h-3.5 w-3.5" /> Search
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition backdrop-blur-sm ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-black/30 hover:bg-black/50 text-white border border-white/10'
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Searching marketplace directory...</p>
          </div>
        ) : (
          <>
            {/* ROW 1: FEATURED SPONSORED ADVERTISED SHOPS */}
            {featuredShops.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 border border-amber-300/80 dark:border-amber-700/60 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                      <Zap className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Featured Shops</h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Promoted escrow merchants with verified products</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative space-y-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 fill-white" />
                <h3 className="text-base font-bold">Advertise Your Store</h3>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
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
                  <button
                    onClick={() => { setShowPromoteModal(false); setPromoteSuccess(''); }}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition"
                  >
                    Done
                  </button>
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
