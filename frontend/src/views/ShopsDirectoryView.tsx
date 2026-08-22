import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, Star, Zap, Shield, ChevronRight, Loader2, Award, ArrowUpRight, X, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

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
  const [promoteDuration, setPromoteDuration] = useState<7 | 30>(7);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');

  const fetchShops = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.query = query.trim();
      if (selectedCategory !== 'All') params.category = selectedCategory;
      
      const res = await apiClient.get('/reviews/shops', { params });
      setFeaturedShops(res.data.featured_shops);
      setStandardShops(res.data.standard_shops);
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
      className={`bg-white rounded-2xl border transition-all hover:shadow-lg flex flex-col justify-between overflow-hidden relative ${
        isAd ? 'border-amber-300 ring-2 ring-amber-400/30 shadow-md' : 'border-gray-200'
      }`}
    >
      {/* Card Header & Content */}
      <div className="p-6 space-y-4">
        
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-sm ${
              isAd ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700'
            }`}>
              @{shop.seller_username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-gray-900 text-base">{shop.shop_name}</h3>
                {isAd && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    <Zap className="h-3 w-3 fill-amber-500" /> Featured Ad
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 font-medium mr-1">@{shop.seller_username}</span>
                {(shop.shop_categories && shop.shop_categories.length > 0 ? shop.shop_categories : [shop.shop_category]).slice(0, 3).map((cat, i) => (
                  <span key={i} className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rating & Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1 font-bold text-gray-900 bg-amber-50 text-amber-900 border border-amber-200/60 px-2.5 py-1 rounded-lg">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {shop.avg_overall > 0 ? `${shop.avg_overall} / 5.0` : 'New Seller'}
            {shop.total_reviews_count > 0 && <span className="text-gray-500 font-normal">({shop.total_reviews_count})</span>}
          </span>

          {shop.badge_title && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
              <Award className="h-3.5 w-3.5" /> {shop.badge_title}
            </span>
          )}

          <span className="text-gray-400 font-mono">
            {shop.total_completed_escrows} Escrows Completed
          </span>
        </div>

        {/* Shop Description */}
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {shop.shop_description}
        </p>

        {/* Featured Products List */}
        {shop.featured_products.length > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Available Payment Links</span>
            <div className="space-y-1">
              {shop.featured_products.map(prod => (
                <Link
                  key={prod.link_id}
                  to={`/l/${prod.link_id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-blue-50/70 border border-gray-100 transition group text-xs"
                >
                  <span className="font-medium text-gray-700 group-hover:text-blue-700 truncate max-w-[200px]">
                    {prod.title}
                  </span>
                  <span className="font-bold text-gray-900 group-hover:text-blue-600 flex items-center gap-0.5">
                    GHS {prod.price_ghs.toFixed(2)}
                    <ArrowUpRight className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Action */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <Link
          to={`/store/${shop.seller_username}`}
          className="w-full py-2 px-4 rounded-xl text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 transition flex items-center justify-center gap-1 group"
        >
          View Full Store Ratings & Reviews
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60 pb-16">
      
      {/* Hero Banner Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 mb-3">
                <Store className="h-3.5 w-3.5 text-blue-400" /> Escrow Merchant Marketplace Directory
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Discover Verified Escrow Shops & Products
              </h1>
              <p className="text-sm text-blue-200 mt-1 max-w-xl">
                Browse rated sellers, search products, and buy with 100% money-back escrow protection.
              </p>
            </div>

            {user && (
              <button
                onClick={() => setShowPromoteModal(true)}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 self-start sm:self-auto"
              >
                <Zap className="h-4 w-4 fill-white" /> Advertise Your Shop Here
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative max-w-2xl">
            <Search className="h-5 w-5 absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search shop name, seller username, or product (e.g. 'iPhone 15', 'Sneakers')..."
              className="w-full pl-11 pr-4 py-3 bg-white text-gray-900 rounded-2xl text-sm shadow-xl focus:ring-4 focus:ring-blue-500/30 outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white/10 hover:bg-white/20 text-blue-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Searching marketplace directory...</p>
          </div>
        ) : (
          <>
            {/* ROW 1: FEATURED SPONSORED ADVERTISED SHOPS */}
            {featuredShops.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-300/80 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                      <Zap className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Featured Advertised Shops</h2>
                      <p className="text-xs text-gray-500">Promoted escrow merchants with verified products</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
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
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" /> All Escrow Merchants ({standardShops.length})
                </h2>
              </div>

              {standardShops.length === 0 && featuredShops.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 space-y-3">
                  <Shield className="h-12 w-12 mx-auto text-gray-300" />
                  <h3 className="text-base font-bold text-gray-800">No matching shops found</h3>
                  <p className="text-xs text-gray-400">Try adjusting your search keywords or category filter.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative space-y-4">
            
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 fill-white" />
                <h3 className="text-base font-bold">Advertise Your Store</h3>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {promoteSuccess ? (
                <div className="text-center space-y-4 py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                  <h4 className="text-lg font-bold text-gray-900">Shop Promoted!</h4>
                  <p className="text-xs text-gray-500">{promoteSuccess}</p>
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
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 text-center">
                      {promoteError}
                    </div>
                  )}

                  <p className="text-xs text-gray-600">
                    Feature your store at the top row of the Marketplace Directory. Ad fees are credited directly to platform revenue.
                  </p>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-700">Select Advertising Duration</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPromoteDuration(7)}
                        className={`p-4 rounded-2xl border text-center transition ${
                          promoteDuration === 7
                            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 text-amber-900 font-bold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="block text-sm">7 Days Ad</span>
                        <span className="block text-lg font-black text-amber-600 mt-1">GHS 50.00</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPromoteDuration(30)}
                        className={`p-4 rounded-2xl border text-center transition ${
                          promoteDuration === 30
                            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 text-amber-900 font-bold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="block text-sm">30 Days Ad</span>
                        <span className="block text-lg font-black text-amber-600 mt-1">GHS 150.00</span>
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

    </div>
  );
}
