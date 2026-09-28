import { useState, useEffect } from 'react';
import { 
  Star, Search, Store, ExternalLink, 
  Loader2, ShieldCheck, ShoppingBag
} from 'lucide-react';
import { apiClient } from '../api/client';
import RateSellerModal from './RateSellerModal';

interface BuyerReviewItem {
  id: string;
  transaction_id: string;
  paystack_reference: string;
  item_title: string;
  seller_username?: string;
  shop_name?: string;
  rating_overall: number;
  rating_speed: number;
  rating_communication: number;
  comment?: string;
  seller_reply?: string;
  seller_replied_at?: string;
  edit_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface BuyerReviewsTabProps {
  onNavigateToPurchases?: () => void;
}

export default function BuyerReviewsTab({ onNavigateToPurchases }: BuyerReviewsTabProps) {
  const [reviews, setReviews] = useState<BuyerReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState<'ALL' | '5' | '4' | '3' | 'LOW'>('ALL');
  const [editingReview, setEditingReview] = useState<BuyerReviewItem | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reviews/buyer/my-reviews');
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch buyer reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating_overall || 5), 0) / totalReviews).toFixed(1)
    : '5.0';
  const fiveStarCount = reviews.filter(r => (r.rating_overall || 5) === 5).length;
  const repliedCount = reviews.filter(r => Boolean(r.seller_reply)).length;

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = (
      (r.item_title && r.item_title.toLowerCase().includes(q)) ||
      (r.seller_username && r.seller_username.toLowerCase().includes(q)) ||
      (r.shop_name && r.shop_name.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q)) ||
      (r.paystack_reference && r.paystack_reference.toLowerCase().includes(q))
    );

    if (!matchesSearch) return false;

    if (starFilter === '5') return r.rating_overall === 5;
    if (starFilter === '4') return r.rating_overall === 4;
    if (starFilter === '3') return r.rating_overall === 3;
    if (starFilter === 'LOW') return r.rating_overall < 3;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ─── HEADER & STATS BANNER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider text-amber-300">
                Verified Feedback Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight flex items-center gap-2.5">
                My Reviews & Past Ratings
              </h1>
              <p className="text-sm text-amber-100/80 mt-1 max-w-xl">
                Track all verified reviews you have submitted for past transactions, view merchant replies, and update your experience scores anytime.
              </p>
            </div>
            {onNavigateToPurchases && (
              <button
                type="button"
                onClick={onNavigateToPurchases}
                className="self-start sm:self-auto px-5 py-3 bg-[#0363ff] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-4 h-4" /> View My Purchases
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs text-amber-200 block font-medium">Reviews Submitted</span>
              <span className="text-2xl font-black text-white mt-1 block">{totalReviews}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs text-amber-200 block font-medium">Average Rating Given</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-300">{avgRating}</span>
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs text-amber-200 block font-medium">5-Star Experiences</span>
              <span className="text-2xl font-black text-emerald-300 mt-1 block">{fiveStarCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs text-amber-200 block font-medium">Store Replies Received</span>
              <span className="text-2xl font-black text-blue-300 mt-1 block">{repliedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTROLS & SEARCH BAR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product title, store name, review text, or order reference..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Star Rating Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {(['ALL', '5', '4', '3', 'LOW'] as const).map(tier => (
            <button
              key={tier}
              type="button"
              onClick={() => setStarFilter(tier)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                starFilter === tier
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tier === 'ALL' && 'All Ratings'}
              {tier === '5' && '⭐ 5 Stars'}
              {tier === '4' && '⭐ 4 Stars'}
              {tier === '3' && '⭐ 3 Stars'}
              {tier === 'LOW' && '⭐ 1-2 Stars'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── REVIEW CARDS LIST ────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading your verified feedback history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-500">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {search || starFilter !== 'ALL' ? 'No matching reviews found' : 'No reviews given yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {search || starFilter !== 'ALL'
              ? 'Try changing your search keywords or resetting the star rating filters.'
              : 'Once your orders are delivered and inspected, you can rate your experience with sellers. Your verified feedback and seller responses will appear here.'}
          </p>
          {onNavigateToPurchases && !search && starFilter === 'ALL' && (
            <button
              type="button"
              onClick={onNavigateToPurchases}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0363ff] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
            >
              Go to Purchases
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Item, Store & Edit Count */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {r.item_title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Store className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {r.shop_name || `@${r.seller_username || 'seller'}`}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-400 truncate">
                        {r.paystack_reference}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {(r.edit_count || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Edited {r.edit_count}x
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>

                {/* Star Ratings Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Overall</span>
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 mt-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= (r.rating_overall || 5) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{r.rating_overall || 5}/5</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Delivery</span>
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 mt-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= (r.rating_speed || 5) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{r.rating_speed || 5}/5</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Service</span>
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 mt-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= (r.rating_communication || 5) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{r.rating_communication || 5}/5</span>
                  </div>
                </div>

                {/* Comment Text */}
                {r.comment ? (
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                    "{r.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No written comment provided.</p>
                )}

                {/* Seller Reply */}
                {r.seller_reply && (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 p-3 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Reply from {r.shop_name || `@${r.seller_username || 'Seller'}`}:
                      </span>
                      {r.seller_replied_at && (
                        <span className="font-normal text-emerald-600 dark:text-emerald-400">
                          {new Date(r.seller_replied_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed pl-1">
                      "{r.seller_reply}"
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-slate-400">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`/l/${r.paystack_reference}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    title="View public transaction receipt"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setEditingReview(r)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer flex items-center gap-1"
                  >
                    ✎ Edit Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── EDIT REVIEW MODAL ────────────────────────────────────────────── */}
      {editingReview && (
        <RateSellerModal
          transactionId={editingReview.transaction_id}
          paystackReference={editingReview.paystack_reference}
          itemTitle={editingReview.item_title}
          sellerName={editingReview.shop_name || editingReview.seller_username || 'Seller'}
          shopName={editingReview.shop_name}
          sellerUsername={editingReview.seller_username}
          initialOverall={editingReview.rating_overall}
          initialSpeed={editingReview.rating_speed}
          initialCommunication={editingReview.rating_communication}
          initialComment={editingReview.comment}
          initialEditCount={editingReview.edit_count}
          initialCreatedAt={editingReview.created_at}
          initialUpdatedAt={editingReview.updated_at}
          onClose={() => setEditingReview(null)}
          onSuccess={async () => {
            setEditingReview(null);
            await fetchReviews();
          }}
        />
      )}
    </div>
  );
}
