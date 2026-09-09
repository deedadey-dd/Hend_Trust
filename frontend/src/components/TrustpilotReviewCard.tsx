import { Link } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, Store } from 'lucide-react';

export interface RecentReviewShop {
  seller_id: string;
  seller_username: string;
  shop_name: string;
  profile_picture_url?: string;
}

export interface RecentReview {
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
  item_image_url?: string;
  upvotes_count: number;
  downvotes_count: number;
  user_voted?: 'UP' | 'DOWN' | null;
  shop: RecentReviewShop;
}

interface TrustpilotReviewCardProps {
  review: RecentReview;
  onOpenModal: (review: RecentReview) => void;
}

export default function TrustpilotReviewCard({ review, onOpenModal }: TrustpilotReviewCardProps) {
  // Green Star Rating Box
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className={`w-5 h-5 flex items-center justify-center rounded ${
              star <= rating ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'
            }`}
          >
            <Star className="w-3 h-3 fill-current stroke-none" />
          </div>
        ))}
      </div>
    );
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div
      onClick={() => onOpenModal(review)}
      className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group h-full select-none"
    >
      <div>
        {/* Buyer Header: Avatar + Display Name + Rating Stars */}
        <div className="flex items-center gap-3 mb-3.5">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white text-base shadow-sm ring-2 ring-emerald-500/20">
            {getInitial(review.buyer_name)}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm truncate">
              {review.buyer_name || 'Verified Buyer'}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              {renderStars(review.rating_overall)}
            </div>
          </div>
        </div>

        {/* Product Image Thumbnail + Item Purchase Sub-label */}
        <div className="flex items-center gap-2 mb-2">
          {review.item_image_url && (
            <img
              src={review.item_image_url}
              alt={review.item_title}
              className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-slate-700 shrink-0"
            />
          )}
          {review.item_title && (
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full inline-block truncate max-w-full">
              {review.item_title}
            </div>
          )}
        </div>

        {/* Review Body Text */}
        <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4 italic">
          "{review.comment || 'Great experience buying online! Highly recommended seller.'}"
        </p>
      </div>

      {/* Footer: Shop Information & Vote Counts */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
        <Link
          to={`/store/${review.shop.seller_username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 min-w-0 group/shop hover:opacity-80 transition"
        >
          {review.shop.profile_picture_url ? (
            <img
              src={review.shop.profile_picture_url}
              alt={review.shop.shop_name}
              className="w-7 h-7 rounded-lg object-cover border border-gray-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              <Store className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="min-w-0">
            <span className="block text-xs font-bold text-gray-900 dark:text-slate-100 truncate group-hover/shop:text-emerald-600 dark:group-hover/shop:text-emerald-400 transition">
              {review.shop.shop_name}
            </span>
            <span className="block text-[10px] text-gray-400 dark:text-slate-500 truncate">
              @{review.shop.seller_username}
            </span>
          </div>
        </Link>

        {/* Upvote & Downvote Count Pill */}
        <div className="flex items-center gap-2 shrink-0 text-[11px] text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-semibold hover:text-emerald-600">
            <ThumbsUp className={`w-3.5 h-3.5 ${review.user_voted === 'UP' ? 'text-emerald-600 fill-emerald-500' : ''}`} />
            {review.upvotes_count || 0}
          </span>
          <span className="flex items-center gap-1 font-semibold hover:text-red-500">
            <ThumbsDown className={`w-3.5 h-3.5 ${review.user_voted === 'DOWN' ? 'text-red-500 fill-red-500' : ''}`} />
            {review.downvotes_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
