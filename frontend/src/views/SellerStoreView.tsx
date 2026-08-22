import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Star, Award, CheckCircle2, MessageSquare, Loader2, Calendar, PackageCheck, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

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

interface SellerStorefront {
  seller_id: string;
  seller_username: string;
  shop_name?: string;
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

  useEffect(() => {
    if (username) fetchStorefront();
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Seller Hero Profile Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-white">
                  {(store.shop_name || store.seller_username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">{store.shop_name || `@${store.seller_username}'s Store`}</h1>
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
            <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex items-center gap-6">
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

        {/* 3-Axis Rating Scorecard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Score</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-gray-900">{store.avg_overall} / 5.0</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(store.avg_overall) ? 'fill-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Speed</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-gray-900">{store.avg_speed} / 5.0</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(store.avg_speed) ? 'fill-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Communication</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-gray-900">{store.avg_communication} / 5.0</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(store.avg_communication) ? 'fill-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
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
              <p className="font-semibold text-gray-700">No verified reviews yet.</p>
              <p className="text-xs text-gray-400 mt-1">Reviews appear here once buyers confirm receipt of their orders.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {store.reviews.map(r => (
                <li key={r.id} className="p-6 space-y-3 hover:bg-gray-50/50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{r.buyer_name}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 block mt-0.5">Purchased: {r.item_title} • {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating_overall ? 'fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono block mt-0.5">Speed: {r.rating_speed}⭐ | Comm: {r.rating_communication}⭐</span>
                    </div>
                  </div>

                  {r.comment && (
                    <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200/60 leading-relaxed italic">
                      "{r.comment}"
                    </p>
                  )}

                  {/* Seller Reply Display */}
                  {r.seller_reply && (
                    <div className="ml-4 pl-4 border-l-2 border-blue-500 bg-blue-50/50 p-3 rounded-r-xl space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span>{store.shop_name ? `${store.shop_name} (@${store.seller_username})` : `@${store.seller_username}`} (Seller Reply)</span>
                        <span className="text-[10px] text-blue-400">{r.seller_replied_at ? new Date(r.seller_replied_at).toLocaleDateString() : ''}</span>
                      </div>
                      <p className="text-xs text-blue-800">{r.seller_reply}</p>
                    </div>
                  )}

                  {/* Seller Reply Action Form (for owner) */}
                  {isOwner && !r.seller_reply && (
                    <div className="pt-2">
                      {replyingReviewId === r.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Type a polite public reply to this review..."
                            className="w-full text-xs border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setReplyingReviewId(null); setReplyText(''); }}
                              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSellerReplySubmit(r.id)}
                              disabled={isSubmittingReply || !replyText.trim()}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isSubmittingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Publish Reply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setReplyingReviewId(r.id); setReplyText(''); }}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          + Reply to this review
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
