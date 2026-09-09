import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Star, ThumbsUp, ThumbsDown, Share2, Store, Check, Zap, MessageCircle } from 'lucide-react';
import type { RecentReview } from './TrustpilotReviewCard';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useEscapeKey } from '../utils/useEscapeKey';

interface ReviewDetailModalProps {
  review: RecentReview | null;
  onClose: () => void;
  onVoteUpdate?: (updatedReview: RecentReview) => void;
  showVisitStoreButton?: boolean;
}

export default function ReviewDetailModal({ review, onClose, onVoteUpdate, showVisitStoreButton = true }: ReviewDetailModalProps) {
  useEscapeKey(onClose, !!review);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [voting, setVoting] = useState(false);
  const [currentReview, setCurrentReview] = useState<RecentReview | null>(review);
  const [voteError, setVoteError] = useState('');

  useEffect(() => {
    setCurrentReview(review);
    setVoteError('');
  }, [review]);

  if (!currentReview) return null;

  const handleVote = async (type: 'UP' | 'DOWN') => {
    if (!user) {
      setVoteError('Please log in or register to vote on customer reviews.');
      return;
    }

    setVoteError('');
    setVoting(true);

    try {
      const res = await apiClient.post(`/reviews/${currentReview.id}/vote`, { vote_type: type });
      const updated: RecentReview = {
        ...currentReview,
        upvotes_count: res.data.upvotes_count,
        downvotes_count: res.data.downvotes_count,
        user_voted: res.data.user_voted
      };
      setCurrentReview(updated);
      if (onVoteUpdate) {
        onVoteUpdate(updated);
      }
    } catch (err: any) {
      setVoteError(err.response?.data?.message || 'Failed to submit vote.');
    } finally {
      setVoting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/store/${currentReview.shop.seller_username}?review_id=${currentReview.id}`;
    const shareData = {
      title: `Review for ${currentReview.shop.shop_name} on HendAxis Trust`,
      text: `"${currentReview.comment}" — ${currentReview.buyer_name}`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard if share interface fails or is dismissed
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      console.error('Failed to copy share link.');
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className={`${starSize} flex items-center justify-center rounded ${
              star <= rating ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'
            }`}
          >
            <Star className="w-3 h-3 fill-current stroke-none" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              Verified Review
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Buyer Avatar & Overall Star Rating */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white text-lg shadow-md ring-4 ring-emerald-500/20">
                {currentReview.buyer_name ? currentReview.buyer_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">
                  {currentReview.buyer_name || 'Verified Buyer'}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Published {new Date(currentReview.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="text-right">
              {renderStars(currentReview.rating_overall, 'md')}
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                {currentReview.rating_overall}.0 out of 5 Stars
              </span>
            </div>
          </div>

          {/* Tight Inline Rating Parameters Breakdown */}
          <div className="flex items-center gap-3 flex-wrap bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs">
            <div className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-700">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Delivery Speed:</span>
              <span className="font-bold text-gray-900 dark:text-slate-100">{currentReview.rating_speed} / 5</span>
            </div>

            <div className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-slate-700">
              <MessageCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Communication:</span>
              <span className="font-bold text-gray-900 dark:text-slate-100">{currentReview.rating_communication} / 5</span>
            </div>
          </div>

          {/* Customer Uploaded Product Image (If Present) */}
          {currentReview.item_image_url && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">Product Photo</span>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 max-h-60 bg-slate-950 flex items-center justify-center p-2 shadow-inner">
                <img
                  src={currentReview.item_image_url}
                  alt={currentReview.item_title || 'Purchased Product'}
                  className="max-h-56 w-auto object-contain rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Purchased Item Title Badge */}
          {currentReview.item_title && (
            <div className="text-xs">
              <span className="text-gray-400 dark:text-slate-500 font-semibold block mb-1">Purchased Item</span>
              <span className="font-bold text-gray-800 dark:text-slate-200 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 px-3 py-1.5 rounded-xl block">
                {currentReview.item_title}
              </span>
            </div>
          )}

          {/* Review Comment Content */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 block">Customer Feedback</span>
            <p className="text-sm sm:text-base text-gray-800 dark:text-slate-200 leading-relaxed italic bg-gray-50/60 dark:bg-slate-800/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/60">
              "{currentReview.comment || 'Merchandise delivered as described. Highly recommended!'}"
            </p>
          </div>

          {/* Seller Reply Box (If Present) */}
          {currentReview.seller_reply && (
            <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                  Response from {currentReview.shop.shop_name}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-100 leading-relaxed">
                {currentReview.seller_reply}
              </p>
            </div>
          )}

          {/* Merchant Profile Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              {currentReview.shop.profile_picture_url ? (
                <img
                  src={currentReview.shop.profile_picture_url}
                  alt={currentReview.shop.shop_name}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-white/20 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 border-2 border-white/20">
                  <Store className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-bold text-sm truncate text-white">{currentReview.shop.shop_name}</h4>
                <p className="text-xs text-slate-300 truncate">@{currentReview.shop.seller_username}</p>
              </div>
            </div>

            {showVisitStoreButton && (
              <Link
                to={`/store/${currentReview.shop.seller_username}`}
                onClick={onClose}
                className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition shrink-0 whitespace-nowrap shadow-md"
              >
                Visit Store
              </Link>
            )}
          </div>

          {/* Vote Login Warning Message */}
          {voteError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
              <span>{voteError}</span>
              {!user && (
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Log In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: Upvote / Downvote & Share Buttons */}
        <div className="p-4 px-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {/* Upvote & Downvote Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mr-1 hidden sm:inline">
              Was this review helpful?
            </span>
            <button
              onClick={() => handleVote('UP')}
              disabled={voting}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                currentReview.user_voted === 'UP'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${currentReview.user_voted === 'UP' ? 'fill-white' : ''}`} />
              <span>Helpful ({currentReview.upvotes_count || 0})</span>
            </button>

            <button
              onClick={() => handleVote('DOWN')}
              disabled={voting}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                currentReview.user_voted === 'DOWN'
                  ? 'bg-red-500 text-white border-red-500 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-400'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${currentReview.user_voted === 'DOWN' ? 'fill-white' : ''}`} />
              <span>({currentReview.downvotes_count || 0})</span>
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="py-2 px-4 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Share Review'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
