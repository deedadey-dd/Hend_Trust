import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, ShieldCheck, Star, Award, CheckCircle2, MessageSquare, Loader2, Calendar, PackageCheck, Send, Zap, ChevronRight, Pencil } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import SEOHead from '../components/SEOHead';
import ReviewDetailModal from '../components/ReviewDetailModal';
import type { RecentReview } from '../components/TrustpilotReviewCard';

interface ReviewItem {
  id: string;
  buyer_name: string;
  rating_speed: number;
  rating_communication: number;
  rating_overall: number;
  comment: string;
  seller_reply?: string;
  seller_replied_at?: string;
  created_at: string;
  updated_at?: string;
  edit_count?: number;
  item_title: string;
  item_image_url?: string;
  upvotes_count?: number;
  downvotes_count?: number;
  user_voted?: 'UP' | 'DOWN' | null;
}

interface RecommendedShop {
  seller_id: string;
  seller_username: string;
  shop_name: string;
  shop_description: string;
  profile_picture_url?: string;
  avg_overall: number;
}

interface SellerStorefront {
  seller_id: string;
  seller_username: string;
  shop_name?: string;
  profile_picture_url?: string;
  banner_url?: string;
  joined_at: string;
  total_completed_escrows: number;
  total_reviews_count: number;
  avg_overall: number;
  avg_speed: number;
  avg_communication: number;
  badge_verified_seller: boolean;
  badge_top_rated: boolean;
  badge_title?: string;
  reviews: ReviewItem[];
}

export default function SellerStoreView() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const [store, setStore] = useState<SellerStorefront | null>(null);
  const [recommendedShops, setRecommendedShops] = useState<RecommendedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected review for detail modal
  const [selectedReview, setSelectedReview] = useState<RecentReview | null>(null);

  // Seller reply state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchStorefront = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/reviews/seller/${username}`);
      setStore(res.data);
    } catch {
      setError('Seller profile not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedShops = async () => {
    try {
      const res = await apiClient.get('/reviews/shops');
      const allShops: RecommendedShop[] = [
        ...(res.data.featured_shops || []),
        ...(res.data.standard_shops || [])
      ];
      setRecommendedShops(allShops);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (username) {
      fetchStorefront();
      fetchRecommendedShops();
    }
  }, [username]);

  const openReviewModal = (r: ReviewItem) => {
    if (!store) return;
    const mapped: RecentReview = {
      id: r.id,
      buyer_name: r.buyer_name,
      rating_speed: r.rating_speed,
      rating_communication: r.rating_communication,
      rating_overall: r.rating_overall,
      comment: r.comment,
      seller_reply: r.seller_reply,
      seller_replied_at: r.seller_replied_at,
      created_at: r.created_at,
      item_title: r.item_title,
      item_image_url: r.item_image_url || '',
      upvotes_count: r.upvotes_count || 0,
      downvotes_count: r.downvotes_count || 0,
      user_voted: r.user_voted || null,
      shop: {
        seller_id: store.seller_id,
        seller_username: store.seller_username,
        shop_name: store.shop_name || `@${store.seller_username}'s Store`,
        profile_picture_url: store.profile_picture_url || ''
      }
    };
    setSelectedReview(mapped);
  };

  const handleSellerReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await apiClient.post(`/reviews/${reviewId}/seller-reply`, { reply: replyText.trim() });
      setReplyingReviewId(null);
      setReplyText('');
      fetchStorefront();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
    </div>
  );

  if (error || !store) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-medium">{error}</div>
  );

  const isOwner = user && (
    user.id === store.seller_id || 
    (user.email && user.email.split('@')[0].toLowerCase() === store.seller_username.toLowerCase()) ||
    (user.username && user.username.toLowerCase() === store.seller_username.toLowerCase())
  );

  // Filter recommended shops to exclude current seller
  const filteredAds = recommendedShops.filter(
    s => s.seller_username.toLowerCase() !== store.seller_username.toLowerCase()
  );

  const storeTitle = `${store.shop_name || `@${store.seller_username}'s Store`} — Verified Seller on HendAxis Trust`;
  const storeDesc = `Buy safely from ${store.shop_name || store.seller_username} in Ghana using HendAxis Trust escrow protection. ${store.total_completed_escrows} completed escrows, ${store.avg_overall.toFixed(1)}/5 rating.`;
  const storeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    'name': store.shop_name || `@${store.seller_username}'s Store`,
    'url': `https://trust.hendaxis.com/store/${store.seller_username}`,
    'image': store.profile_picture_url || 'https://trust.hendaxis.com/og_preview_banner.jpg',
    'aggregateRating': store.total_reviews_count > 0 ? {
      '@type': 'AggregateRating',
      'ratingValue': store.avg_overall.toFixed(1),
      'reviewCount': store.total_reviews_count
    } : undefined
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-12 transition-colors">
      <SEOHead
        title={storeTitle}
        description={storeDesc}
        canonicalUrl={`https://trust.hendaxis.com/store/${store.seller_username}`}
        ogImage={store.profile_picture_url || 'https://trust.hendaxis.com/og_preview_banner.jpg'}
        jsonLd={storeJsonLd}
      />
      {/* Sticky Top Shop Header Bar (Comprehensive Storefront Identity & Trust Bar) */}
      <div className="sticky top-16 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 shadow-xs transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Shop Logo + Name + Verified Badges + Username + Member Since */}
          <div className="flex items-center gap-3 min-w-0">
            {store.profile_picture_url ? (
              <img
                src={store.profile_picture_url}
                alt={store.shop_name || store.seller_username}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl object-cover border-2 border-gray-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 shadow-sm"
              />
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-sm">
                {(store.shop_name || store.seller_username).charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                  {store.shop_name || `@${store.seller_username}'s Store`}
                </h1>
                
                {/* Verified Seller Badge */}
                {store.badge_verified_seller && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Verified
                  </span>
                )}

                {/* Award / Top-Rated Badge */}
                {store.badge_title && !store.badge_title.toLowerCase().includes('verified seller') && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                    <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {store.badge_title}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">@{store.seller_username}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400 dark:text-slate-500" /> Member since {new Date(store.joined_at).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Escrows Count & Rating Stats Chips */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Completed Escrows Pill */}
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 py-1 rounded-xl text-xs shadow-2xs">
              <PackageCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{store.total_completed_escrows} Escrows</span>
            </span>

            {/* Overall Rating Pill */}
            <span className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 sm:px-3 py-1 rounded-xl text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{store.avg_overall.toFixed(1)}</span>
              {store.total_reviews_count > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({store.total_reviews_count})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* 1. SELLER COVER BANNER (Undarkened, Clean Banner Image) */}
        <div className="rounded-3xl h-44 sm:h-56 md:h-64 w-full relative overflow-hidden shadow-md bg-slate-900 border border-gray-200/60 dark:border-slate-800">
          {store.banner_url ? (
            <img 
              src={store.banner_url} 
              alt="Store Cover Banner" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 relative">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          )}
        </div>

        {/* 2. COMPACT 3-AXIS RATING SCORECARDS (Reduced vertical height & overlapping banner bottom) */}
        <div className="-mt-6 sm:-mt-7 relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4 px-3 sm:px-6">
          {/* Overall Rating Card */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 transition-all hover:shadow-lg">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Overall
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${s <= Math.round(store.avg_overall) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                {store.avg_overall.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Speed Rating Card */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 transition-all hover:shadow-lg">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Speed
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${s <= Math.round(store.avg_speed) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                {store.avg_speed.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Communication Rating Card */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl border border-gray-200/90 dark:border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 transition-all hover:shadow-lg">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Comm
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${s <= Math.round(store.avg_communication) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                {store.avg_communication.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Public Reviews List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Customer Feedback & Reviews ({store.reviews.length})
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">100% Verified Escrow Buyers</span>
          </div>

          {store.reviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-slate-400">
              <Shield className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="font-semibold text-gray-700 dark:text-slate-300 text-base">No verified reviews yet.</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Reviews appear here once buyers confirm receipt of their orders.</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {store.reviews.map((r, idx) => {
                  const adIndex = Math.floor(idx / 3) % (filteredAds.length || 1);
                  const showAd = (idx > 0 && idx % 3 === 0 && filteredAds.length > 0);
                  const adShop = filteredAds[adIndex];

                  return (
                    <React.Fragment key={r.id}>
                      {/* Dynamic Recommended Shop Advert Card in Review Feed */}
                      {showAd && adShop && (
                        <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-400/30 my-2">
                          <div className="flex items-center gap-3">
                            {adShop.profile_picture_url ? (
                              <img src={adShop.profile_picture_url} alt={adShop.shop_name} className="h-12 w-12 rounded-xl object-cover border border-white/20 shadow-sm" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-sm">
                                {adShop.shop_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                <Zap className="h-3 w-3 fill-amber-400" /> Featured Escrow Merchant
                              </span>
                              <h4 className="font-bold text-base text-white mt-1">{adShop.shop_name}</h4>
                              <p className="text-xs text-blue-200 line-clamp-1">{adShop.shop_description}</p>
                            </div>
                          </div>
                          <Link
                            to={`/store/${adShop.seller_username}`}
                            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1 self-stretch sm:self-auto justify-center"
                          >
                            Explore Shop <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      )}

                      {/* Review Card */}
                      <div
                        onClick={() => openReviewModal(r)}
                        className="bg-gray-50/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 space-y-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="space-y-3">
                          {/* Top Row: Buyer Name + Verified Badge (Left) and Vertically Stacked Ratings (Right) */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{r.buyer_name}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                                </span>
                              </div>
                            </div>

                            {/* Vertically Stacked Overall, Speed, and Comm Ratings */}
                            <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                              {/* Overall Rating */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Overall:</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating_overall ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                  ))}
                                </div>
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{r.rating_overall.toFixed(1)}</span>
                              </div>

                              {/* Speed Rating */}
                              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 dark:text-slate-400">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Speed:</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3 w-3 ${s <= r.rating_speed ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                  ))}
                                </div>
                                <span className="font-bold text-gray-800 dark:text-slate-200">{r.rating_speed.toFixed(1)}</span>
                              </div>

                              {/* Communication Rating */}
                              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 dark:text-slate-400">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Comm:</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3 w-3 ${s <= r.rating_communication ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                  ))}
                                </div>
                                <span className="font-bold text-gray-800 dark:text-slate-200">{r.rating_communication.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Row across the card: Purchased Item Name and Date (in italics) */}
                          <div className="flex items-center justify-between gap-2 text-xs py-1.5 px-3 bg-white dark:bg-slate-900/90 rounded-xl border border-gray-200/80 dark:border-slate-700/80 shadow-2xs">
                            <span className="text-gray-600 dark:text-slate-300 truncate">
                              Purchased: <strong className="font-bold text-gray-900 dark:text-white">{r.item_title}</strong>
                            </span>
                            <span className="italic text-gray-500 dark:text-slate-400 shrink-0 text-[11px] flex items-center gap-1.5">
                              {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              {(r.edit_count || 0) > 0 && (
                                <span className="font-semibold text-blue-500 dark:text-blue-400 not-italic">
                                  (Edited {r.edit_count}x)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Customer Feedback Comment */}
                          {r.comment && (
                            <p className="text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-700 leading-relaxed italic shadow-2xs">
                              "{r.comment}"
                            </p>
                          )}

                          {/* Seller Reply Display with Edit Option */}
                          {r.seller_reply && replyingReviewId !== r.id && (
                            <div className="border-l-4 border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-r-xl space-y-1.5 mt-2">
                              <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                                <span className="text-blue-500">Seller's Reply</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-blue-500 dark:text-blue-400 font-medium italic">
                                    {r.seller_replied_at ? new Date(r.seller_replied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                                  </span>
                                  {isOwner && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReplyingReviewId(r.id);
                                        setReplyText(r.seller_reply || '');
                                      }}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer ml-1"
                                      title="Edit your reply"
                                    >
                                      <Pencil className="h-3 w-3" /> Edit
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-blue-950 dark:text-blue-100 leading-relaxed">{r.seller_reply}</p>
                            </div>
                          )}
                        </div>

                        {/* Seller Reply Form (For creating new reply OR editing existing reply) */}
                        {isOwner && (replyingReviewId === r.id || !r.seller_reply) && (
                          <div className="pt-2 border-t border-gray-200/60 dark:border-slate-700 mt-2" onClick={e => e.stopPropagation()}>
                            {replyingReviewId === r.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {r.seller_reply ? 'Edit Your Reply' : 'Reply as Seller'}
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="Type a polite public reply to this review..."
                                  className="w-full text-sm border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setReplyingReviewId(null); setReplyText(''); }}
                                    className="px-3.5 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSellerReplySubmit(r.id)}
                                    disabled={isSubmittingReply || !replyText.trim()}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                  >
                                    {isSubmittingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                    {r.seller_reply ? 'Update Reply' : 'Publish Reply'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              !r.seller_reply && (
                                <button
                                  type="button"
                                  onClick={() => { setReplyingReviewId(r.id); setReplyText(''); }}
                                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  + Reply to this review
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        showVisitStoreButton={false}
      />
    </div>
  );
}
