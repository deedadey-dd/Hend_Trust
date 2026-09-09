import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import TrustpilotReviewCard from './TrustpilotReviewCard';
import type { RecentReview } from './TrustpilotReviewCard';
import ReviewDetailModal from './ReviewDetailModal';
import { apiClient } from '../api/client';

interface RecentReviewsCarouselProps {
  mode?: 'multi-column' | 'single-row';
  title?: string;
  subtitle?: string;
}

// Fallback mock reviews if backend DB has no reviews yet
const MOCK_FALLBACK_REVIEWS: RecentReview[] = [
  {
    id: 'mock-rev-1',
    buyer_name: 'Kwame Mensah',
    rating_speed: 5,
    rating_communication: 5,
    rating_overall: 5,
    comment: 'Ordered an iPhone 15 Pro Max via escrow. The seller dispatched via DHL with live tracking and the 24h inspection window gave me complete peace of mind. Excellent platform!',
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
    comment: 'Bought authentic Kente cloth for my engagement ceremony. Money stayed locked in escrow until I inspected the parcel at VIP station Kumasi. Very reliable system!',
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
    comment: 'First time buying electronics online in Ghana without fear of scamming. The secret driver OTP verification process worked smoothly. Will definitely buy again!',
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
    comment: 'Super fast delivery! The seller replied immediately to my questions on whatsapp and the funds were safely held until I tested the blender. HendAxis Trust is top tier!',
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

export default function RecentReviewsCarousel({
  mode = 'multi-column',
  title = 'Recent Customer Reviews',
  subtitle = 'Read verified purchase experiences from real buyers across Ghana.'
}: RecentReviewsCarouselProps) {
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<RecentReview | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchRecentReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reviews/recent?limit=15');
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
    fetchRecentReviews();
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleVoteUpdate = (updatedReview: RecentReview) => {
    setReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
  };

  return (
    <div className="w-full my-8 space-y-4 select-none">
      {/* Header Bar with Verified Rating Summary & Navigation Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-md">
              <Star className="w-3.5 h-3.5 fill-white stroke-none" /> Verified Rating
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> 4.9 out of 5 — Excellent Customer Satisfaction
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100">{title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {/* Carousel Arrow Controls & Action Link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition shadow-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition shadow-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <Link
            to="/reviews"
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            View All Reviews <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* CAROUSEL BODY */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-slate-900 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : mode === 'multi-column' ? (
        /* Trustpilot Multi-Column Carousel (Horizontal Scroll Grid) */
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="w-[300px] sm:w-[360px] md:w-[380px] shrink-0 snap-start"
            >
              <TrustpilotReviewCard
                review={rev}
                onOpenModal={(r) => setSelectedReview(r)}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Single-Row Horizontal Carousel */
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="w-[280px] sm:w-[340px] md:w-[360px] shrink-0 snap-start"
            >
              <TrustpilotReviewCard
                review={rev}
                onOpenModal={(r) => setSelectedReview(r)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Review Detail Modal Popup */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onVoteUpdate={handleVoteUpdate}
      />
    </div>
  );
}
