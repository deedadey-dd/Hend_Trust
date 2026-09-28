import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, Search, MessageSquare, ShieldCheck, Award, ExternalLink, 
  Send, Loader2, CheckCircle2, CornerDownRight, 
  Share2, Check, AlertCircle, Eye
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../context/ModalContext';
import { ImageLightboxModal } from './ImageLightboxModal';

interface SellerReviewItem {
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
}

interface SellerStorefrontData {
  seller_id: string;
  seller_username: string;
  shop_name?: string;
  shop_description?: string;
  shop_category?: string;
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
  reviews: SellerReviewItem[];
}

interface SellerReviewsTabProps {
  onNavigateToBadges?: () => void;
}

export const SellerReviewsTab: React.FC<SellerReviewsTabProps> = ({ onNavigateToBadges }) => {
  const { user } = useAuthStore();
  const modal = useModal();
  const [storeData, setStoreData] = useState<SellerStorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<'ALL' | '5' | '4' | '3' | 'LOW' | 'UNREPLIED' | 'REPLIED'>('ALL');

  // Reply submission state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Lightbox state
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchSellerStore = async () => {
    if (!user?.username) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/reviews/seller/${user.username}`);
      setStoreData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch seller reviews:', err);
      setError(err.response?.data?.detail || 'Failed to load merchant review data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerStore();
  }, [user?.username]);

  const handleStartReply = (review: SellerReviewItem) => {
    setReplyingReviewId(review.id);
    setReplyText(review.seller_reply || '');
  };

  const handleCancelReply = () => {
    setReplyingReviewId(null);
    setReplyText('');
  };

  const handleSaveReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await apiClient.post(`/reviews/${reviewId}/seller-reply`, {
        reply: replyText.trim()
      });
      await modal.alert({
        title: 'Reply Published',
        message: 'Your official merchant reply has been posted to this review and is now publicly visible on your storefront.',
        type: 'success',
        icon: 'check'
      });
      setReplyingReviewId(null);
      setReplyText('');
      fetchSellerStore();
    } catch (err: any) {
      await modal.alert({
        title: 'Reply Failed',
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to submit reply. Please try again.',
        type: 'danger',
        icon: 'alert'
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCopyStoreLink = () => {
    if (!user?.username) return;
    const storeUrl = `${window.location.origin}/shop/${user.username}`;
    navigator.clipboard.writeText(storeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const reviews = storeData?.reviews || [];

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        r.buyer_name.toLowerCase().includes(q) ||
        r.item_title.toLowerCase().includes(q) ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.seller_reply && r.seller_reply.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (starFilter === '5') return r.rating_overall === 5;
      if (starFilter === '4') return r.rating_overall === 4;
      if (starFilter === '3') return r.rating_overall === 3;
      if (starFilter === 'LOW') return r.rating_overall < 3;
      if (starFilter === 'UNREPLIED') return !r.seller_reply;
      if (starFilter === 'REPLIED') return Boolean(r.seller_reply);
      return true;
    });
  }, [reviews, searchQuery, starFilter]);

  // Star distribution breakdown
  const starCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating_overall || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const totalReviewsCount = reviews.length;
  const unrepliedCount = reviews.filter(r => !r.seller_reply).length;
  const replyRate = totalReviewsCount > 0 
    ? Math.round(((totalReviewsCount - unrepliedCount) / totalReviewsCount) * 100) 
    : 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="w-8 h-8 text-[#0363ff] animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your merchant reputation & customer reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="font-bold text-rose-900 dark:text-rose-200">Unable to Load Customer Reviews</h3>
        <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>
        <button
          onClick={fetchSellerStore}
          className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── REPUTATION OVERVIEW HERO BANNER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0363ff]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#ff6d1d]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#0363ff]/20 border border-[#0363ff]/40 rounded-full text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0363ff]" />
                  Merchant Store Reputation
                </span>
                {storeData?.badge_title && (
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    {storeData.badge_title}
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black mt-2.5 tracking-tight flex items-center gap-2.5">
                Customer Reviews & Store Ratings
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                View feedback submitted by verified buyers across your completed escrow transactions. Respond to buyer reviews to build trust and increase sales conversion.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-blue-300" />
                    <span>Share Storefront</span>
                  </>
                )}
              </button>

              <a
                href={`/shop/${user?.username}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-[#0363ff] hover:bg-[#0252d4] rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
              >
                <Eye className="w-4 h-4" />
                <span>View Public Store</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Average Rating</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {storeData?.avg_overall ? storeData.avg_overall.toFixed(1) : '5.0'}
                </span>
                <div className="flex flex-col">
                  <div className="flex text-amber-400 text-xs">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(storeData?.avg_overall || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{totalReviewsCount} review{totalReviewsCount === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Delivery Speed</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-blue-400">
                  {storeData?.avg_speed ? storeData.avg_speed.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Dispatch & fulfillment speed</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Communication</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-400">
                  {storeData?.avg_communication ? storeData.avg_communication.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Responsiveness & support</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Response Rate</span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {replyRate}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {unrepliedCount === 0 ? 'All reviews replied' : `${unrepliedCount} pending reply`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & CONTROLS ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by buyer name, item title, or keywords..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0363ff]"
            />
          </div>

          {/* Embed Badges Link */}
          {onNavigateToBadges && (
            <button
              type="button"
              onClick={onNavigateToBadges}
              className="text-xs text-[#0363ff] dark:text-blue-400 hover:underline font-semibold flex items-center gap-1.5 self-end md:self-auto cursor-pointer"
            >
              <Award className="w-4 h-4 text-[#ff6d1d]" />
              <span>Get Embeddable Trust Badges for Instagram & Website →</span>
            </button>
          )}
        </div>

        {/* Star & Status Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
          
          <button
            type="button"
            onClick={() => setStarFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              starFilter === 'ALL'
                ? 'bg-[#0363ff] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Reviews ({totalReviewsCount})
          </button>

          <button
            type="button"
            onClick={() => setStarFilter('5')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              starFilter === '5'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            5 Stars ({starCounts[5]})
          </button>

          <button
            type="button"
            onClick={() => setStarFilter('4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              starFilter === '4'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            4 Stars ({starCounts[4]})
          </button>

          <button
            type="button"
            onClick={() => setStarFilter('3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              starFilter === '3'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            3 Stars ({starCounts[3]})
          </button>

          <button
            type="button"
            onClick={() => setStarFilter('LOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              starFilter === 'LOW'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ≤ 2 Stars ({starCounts[2] + starCounts[1]})
          </button>

          {unrepliedCount > 0 && (
            <button
              type="button"
              onClick={() => setStarFilter('UNREPLIED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                starFilter === 'UNREPLIED'
                  ? 'bg-[#ff6d1d] text-white shadow-sm'
                  : 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6d1d] border border-orange-200 dark:border-orange-900/50 hover:bg-orange-100'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              Needs Reply ({unrepliedCount})
            </button>
          )}

          <button
            type="button"
            onClick={() => setStarFilter('REPLIED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              starFilter === 'REPLIED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Replied ({totalReviewsCount - unrepliedCount})
          </button>
        </div>
      </div>

      {/* ─── REVIEWS LIST ─────────────────────────────────────────── */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-[#0363ff] rounded-2xl flex items-center justify-center mx-auto">
            <Star className="w-8 h-8 fill-blue-500/20" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {reviews.length === 0 ? 'No Customer Reviews Yet' : 'No Reviews Matching Your Filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {reviews.length === 0 
              ? 'When buyers receive their dispatched escrow parcels and rate their experience, verified ratings and comments will appear here.'
              : 'Try clearing your search query or selecting a different rating filter above.'}
          </p>
          {reviews.length > 0 && starFilter !== 'ALL' && (
            <button
              onClick={() => { setStarFilter('ALL'); setSearchQuery(''); }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(r => {
            const isReplying = replyingReviewId === r.id;
            const hasReply = Boolean(r.seller_reply);

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header: Buyer info & stars */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm uppercase shrink-0 shadow-sm">
                      {r.buyer_name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {r.buyer_name}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Buyer
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Purchased: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{r.item_title}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= r.rating_overall
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 dark:text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {new Date(r.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub ratings (Speed / Communication) */}
                <div className="flex items-center gap-4 text-xs font-mono bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span>⚡ Delivery Speed:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{r.rating_speed} / 5</span>
                  </div>
                  <div className="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex items-center gap-1.5">
                    <span>💬 Communication:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{r.rating_communication} / 5</span>
                  </div>
                </div>

                {/* Comment Text */}
                {r.comment ? (
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    "{r.comment}"
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 font-sans">
                    Buyer gave a 5-star rating without written remarks.
                  </p>
                )}

                {/* Review Image (if any) */}
                {r.item_image_url && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setLightboxImg(r.item_image_url || null)}
                      className="relative group inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition cursor-pointer"
                    >
                      <img
                        src={r.item_image_url}
                        alt="Buyer review evidence"
                        className="w-20 h-20 object-cover"
                      />
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                        Enlarge
                      </span>
                    </button>
                  </div>
                )}

                {/* ─── MERCHANT REPLY DISPLAY ─────────────────────────────────── */}
                {hasReply && !isReplying && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="w-4 h-4 text-[#0363ff]" />
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                          Your Official Store Reply
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.seller_replied_at && (
                          <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">
                            {new Date(r.seller_replied_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartReply(r)}
                          className="text-[11px] text-[#0363ff] dark:text-blue-400 hover:underline font-bold ml-2 cursor-pointer"
                        >
                          Edit Reply
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans pl-6">
                      {r.seller_reply}
                    </p>
                  </div>
                )}

                {/* ─── INLINE REPLY FORM ────────────────────────────────────────── */}
                {isReplying ? (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 mt-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#0363ff]" />
                        Write Public Merchant Response
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {replyText.trim().length} chars
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Thank the buyer, address feedback, or provide helpful context for future buyers..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0363ff]"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelReply}
                        disabled={submittingReply}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReply(r.id)}
                        disabled={submittingReply || !replyText.trim()}
                        className="px-4 py-1.5 bg-[#0363ff] hover:bg-[#0252d4] text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {submittingReply ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  !hasReply && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleStartReply(r)}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#0363ff]" />
                        <span>Reply to Buyer</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <ImageLightboxModal
          src={lightboxImg}
          isOpen={Boolean(lightboxImg)}
          onClose={() => setLightboxImg(null)}
        />
      )}
    </div>
  );
};

export default SellerReviewsTab;
