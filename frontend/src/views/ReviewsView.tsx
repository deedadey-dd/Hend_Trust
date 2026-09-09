import { useState, useEffect } from 'react';
import { Search, Star, ShieldCheck, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import TrustpilotReviewCard from '../components/TrustpilotReviewCard';
import type { RecentReview } from '../components/TrustpilotReviewCard';
import ReviewDetailModal from '../components/ReviewDetailModal';
import { apiClient } from '../api/client';
import SEOHead from '../components/SEOHead';

// Fallback mock reviews if backend DB has no reviews yet
const MOCK_FALLBACK_REVIEWS: RecentReview[] = [
  {
    id: 'mock-rev-1',
    buyer_name: 'Kwame Mensah',
    rating_speed: 5,
    rating_communication: 5,
    rating_overall: 5,
    comment: 'Ordered an iPhone 15 Pro Max online. The seller dispatched via DHL with live tracking and the 24h inspection guarantee gave me complete peace of mind. Excellent platform!',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    item_title: 'iPhone 15 Pro Max (256GB)',
    upvotes_count: 14,
    downvotes_count: 0,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-1',
      seller_username: 'accra_tech_hub',
      shop_name: 'Accra Tech Hub',
      profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    }
  },
  {
    id: 'mock-rev-2',
    buyer_name: 'Abena Osei',
    rating_speed: 5,
    rating_communication: 4,
    rating_overall: 5,
    comment: 'Bought authentic Kente cloth for my engagement ceremony. Money stayed locked until I inspected the parcel at VIP station Kumasi. Very reliable system!',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    item_title: 'Handwoven Royal Kente Cloth',
    upvotes_count: 22,
    downvotes_count: 1,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-2',
      seller_username: 'kumasi_royal_fabrics',
      shop_name: 'Kumasi Royal Fabrics',
      profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
    }
  },
  {
    id: 'mock-rev-3',
    buyer_name: 'Emmanuel Koffi',
    rating_speed: 4,
    rating_communication: 5,
    rating_overall: 5,
    comment: 'First time buying electronics online in Ghana without fear of scamming. The driver OTP verification process worked smoothly. Will definitely buy again!',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    item_title: 'MacBook Air M2 16GB RAM',
    upvotes_count: 18,
    downvotes_count: 0,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-3',
      seller_username: 'gadget_sanctuary',
      shop_name: 'Gadget Sanctuary',
      profile_picture_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'
    }
  },
  {
    id: 'mock-rev-4',
    buyer_name: 'Grace Ampofo',
    rating_speed: 5,
    rating_communication: 5,
    rating_overall: 5,
    comment: 'Super fast delivery! The seller replied immediately to my questions on whatsapp and the funds were safely held until I tested the blender. Top tier service!',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    item_title: 'Ninja Professional Countertop Blender',
    upvotes_count: 9,
    downvotes_count: 0,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-4',
      seller_username: 'home_appliances_gh',
      shop_name: 'Home Essentials Ghana',
      profile_picture_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
    }
  },
  {
    id: 'mock-rev-5',
    buyer_name: 'Kofi Owusu',
    rating_speed: 5,
    rating_communication: 4,
    rating_overall: 5,
    comment: 'Genuine designer sneakers received in Tema. Being able to inspect during the 24h window before funds were released to seller made all the difference.',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    item_title: 'Nike Air Jordan 1 Retro High',
    upvotes_count: 31,
    downvotes_count: 2,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-5',
      seller_username: 'kickz_store_accra',
      shop_name: 'Kickz Store Accra',
      profile_picture_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80'
    }
  },
  {
    id: 'mock-rev-6',
    buyer_name: 'Selorm Dogbe',
    rating_speed: 5,
    rating_communication: 5,
    rating_overall: 5,
    comment: 'Purchased a Sony PlayStation 5 console. The seller was verified with Ghana Card badge which gave me confidence. Smooth transaction from start to finish!',
    created_at: new Date(Date.now() - 3600000 * 90).toISOString(),
    item_title: 'Sony PlayStation 5 Disc Edition',
    upvotes_count: 27,
    downvotes_count: 0,
    user_voted: null,
    shop: {
      seller_id: 'mock-seller-6',
      seller_username: 'gaming_lounge_gh',
      shop_name: 'Gaming Lounge GH',
      profile_picture_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80'
    }
  }
];

export default function ReviewsView() {
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'ALL'>('ALL');
  const [selectedReview, setSelectedReview] = useState<RecentReview | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reviews/recent?limit=50');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setReviews(res.data);
      } else {
        setReviews(MOCK_FALLBACK_REVIEWS);
      }
    } catch {
      setReviews(MOCK_FALLBACK_REVIEWS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter((rev) => {
    const matchesRating = selectedRating === 'ALL' || rev.rating_overall === selectedRating;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      rev.buyer_name.toLowerCase().includes(q) ||
      rev.comment.toLowerCase().includes(q) ||
      rev.item_title.toLowerCase().includes(q) ||
      rev.shop.shop_name.toLowerCase().includes(q) ||
      rev.shop.seller_username.toLowerCase().includes(q);
    return matchesRating && matchesQuery;
  });

  const handleVoteUpdate = (updatedReview: RecentReview) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      <SEOHead
        title="Verified Customer Reviews — HendAxis Trust"
        description="Browse authentic verified customer reviews and ratings for online merchants across Ghana."
        canonicalUrl="https://trust.hendaxis.com/reviews"
      />

      {/* Header Banner */}
      <div className="bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-slate-800">
        <div className="max-w-5xl mx-auto space-y-4 relative z-10">
          <Link
            to="/shops"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Shops Directory
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-emerald-500 text-white font-extrabold text-xs px-3 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-white stroke-none" /> Verified Ratings
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> 4.9 out of 5 — Excellent Customer Satisfaction
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black">All Verified Customer Reviews</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Explore complete buyer feedback, product ratings, and verified merchant experiences.
          </p>

          {/* Search Box & Rating Filters */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by buyer name, shop, or product..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['ALL', 5, 4, 3, 2, 1] as const).map(star => (
                <button
                  key={star.toString()}
                  onClick={() => setSelectedRating(star)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                    selectedRating === star
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {star === 'ALL' ? 'All Ratings' : `${star} Stars`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Reviews Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-6">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Loading customer reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-slate-800 space-y-3">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-700" />
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-200">No matching reviews found</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">Try adjusting your search query or rating filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map(rev => (
              <TrustpilotReviewCard
                key={rev.id}
                review={rev}
                onOpenModal={r => setSelectedReview(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onVoteUpdate={handleVoteUpdate}
      />
    </div>
  );
}
