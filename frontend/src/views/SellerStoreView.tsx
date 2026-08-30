import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Star, Award, CheckCircle2, MessageSquare, Loader2, Calendar, PackageCheck, Send, Zap, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import SEOHead from '../components/SEOHead';

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
  item_title: string;
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
    <div className="min-h-screen bg-gray-50 pb-12">
      <SEOHead
        title={storeTitle}
        description={storeDesc}
        canonicalUrl={`https://trust.hendaxis.com/store/${store.seller_username}`}
        ogImage={store.profile_picture_url || 'https://trust.hendaxis.com/og_preview_banner.jpg'}
        jsonLd={storeJsonLd}
      />
      {/* Sticky Top Shop Header Bar */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {store.profile_picture_url ? (
              <img
                src={store.profile_picture_url}
                alt={store.shop_name || store.seller_username}
                className="h-9 w-9 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                {(store.shop_name || store.seller_username).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                {store.shop_name || `@${store.seller_username}'s Store`}
              </h2>
              <span className="text-xs text-gray-500 font-medium">@{store.seller_username}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {store.avg_overall}
            </span>
            {store.badge_title && (
              <span className="hidden sm:inline-flex text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {store.badge_title}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Seller Hero Profile Header */}
        <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ${
          store.banner_url ? 'bg-slate-950' : 'bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900'
        }`}>
          {/* Custom Banner Image Background */}
          {store.banner_url ? (
            <div className="absolute inset-0 z-0">
              <img src={store.banner_url} alt="Store Cover Banner" className="w-full h-full object-cover opacity-100" />
            </div>
          ) : (
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          )}
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {store.profile_picture_url ? (
                  <img
                    src={store.profile_picture_url}
                    alt={store.shop_name || store.seller_username}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-white/40 shadow-md bg-white/10"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl text-white shadow-sm">
                    {(store.shop_name || store.seller_username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {store.shop_name || `@${store.seller_username}'s Store`}
                  </h1>
                  <p className="text-xs text-blue-200 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-white">@{store.seller_username}</span> • <Calendar className="h-3.5 w-3.5 inline" /> Member since {new Date(store.joined_at).getFullYear()}
                  </p>
                </div>
              </div>

              {/* Earned Badge Pill */}
              <div className="pt-2">
                {store.badge_title ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                    <Award className="h-3.5 w-3.5" /> {store.badge_title}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-white/10 text-blue-200 border border-white/10 px-3 py-1 rounded-full text-xs font-medium">
                    🛡️ Building Escrow Reputation History (No Badges Earned Yet)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stat Pill */}
            <div className="bg-white/10 border border-white/10 backdrop-blur-xs rounded-2xl p-5 flex items-center gap-6">
              <div className="text-center">
                <span className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1">
                  {store.avg_overall} <Star className="h-5 w-5 fill-amber-400" />
                </span>
                <span className="text-[11px] text-blue-200 font-medium block mt-0.5">
                  {store.total_reviews_count} Verified Review(s)
                </span>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <span className="text-2xl font-black text-white flex items-center justify-center gap-1">
                  <PackageCheck className="h-5 w-5 text-blue-400" /> {store.total_completed_escrows}
                </span>
                <span className="text-[11px] text-blue-200 font-medium block mt-0.5">
                  Completed Escrows
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Axis Rating Scorecards: 1 Row on Mobile with Star Icons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Overall</span>
            <div className="flex items-center justify-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-4 w-4 sm:h-5 sm:w-5 ${s <= Math.round(store.avg_overall) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Speed</span>
            <div className="flex items-center justify-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-4 w-4 sm:h-5 sm:w-5 ${s <= Math.round(store.avg_speed) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-200 shadow-xs text-center space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Comm</span>
            <div className="flex items-center justify-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-4 w-4 sm:h-5 sm:w-5 ${s <= Math.round(store.avg_communication) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Public Reviews List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" /> Customer Feedback & Reviews ({store.reviews.length})
            </h3>
            <span className="text-xs text-gray-400 font-mono">100% Verified Escrow Buyers</span>
          </div>

          {store.reviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700 text-base">No verified reviews yet.</p>
              <p className="text-sm text-gray-400 mt-1">Reviews appear here once buyers confirm receipt of their orders.</p>
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
                      <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/90 space-y-3 hover:bg-white hover:shadow-md transition flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-base">{r.buyer_name}</span>
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified Buyer
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 block mt-0.5">Purchased: <strong className="text-gray-700">{r.item_title}</strong> • {new Date(r.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`h-4 w-4 ${s <= r.rating_overall ? 'fill-amber-400' : 'text-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500 font-mono block mt-1">Speed: {r.rating_speed}⭐ | Comm: {r.rating_communication}⭐</span>
                            </div>
                          </div>

                          {r.comment && (
                            <p className="text-sm text-gray-800 bg-white p-3.5 rounded-xl border border-gray-200/80 leading-relaxed italic shadow-2xs">
                              "{r.comment}"
                            </p>
                          )}

                          {/* Seller Reply Display */}
                          {r.seller_reply && (
                            <div className="border-l-4 border-blue-600 bg-blue-50/70 p-3.5 rounded-r-xl space-y-1 mt-2">
                              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                                <span>{store.shop_name ? `${store.shop_name} (@${store.seller_username})` : `@${store.seller_username}`} (Seller Reply)</span>
                                <span className="text-xs text-blue-500 font-medium">{r.seller_replied_at ? new Date(r.seller_replied_at).toLocaleDateString() : ''}</span>
                              </div>
                              <p className="text-sm text-blue-950 leading-relaxed">{r.seller_reply}</p>
                            </div>
                          )}
                        </div>

                        {/* Seller Reply Action Form (for owner) */}
                        {isOwner && !r.seller_reply && (
                          <div className="pt-2 border-t border-gray-200/60">
                            {replyingReviewId === r.id ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="Type a polite public reply to this review..."
                                  className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setReplyingReviewId(null); setReplyText(''); }}
                                    className="px-3.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSellerReplySubmit(r.id)}
                                    disabled={isSubmittingReply || !replyText.trim()}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isSubmittingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                    Publish Reply
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setReplyingReviewId(r.id); setReplyText(''); }}
                                className="text-xs font-bold text-blue-600 hover:underline"
                              >
                                + Reply to this review
                              </button>
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
    </div>
  );
}
