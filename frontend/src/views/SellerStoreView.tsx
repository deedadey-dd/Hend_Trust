import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, ShieldCheck, Star, Award, CheckCircle2, MessageSquare, Loader2, 
  Calendar, PackageCheck, Send, Zap, ChevronRight, ChevronLeft, Pencil, Package, ExternalLink, 
  MessageCircle, Info, Phone, AlertTriangle, X, Tag, Search, Flame, 
  ShoppingBag, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import SEOHead from '../components/SEOHead';
import ReviewDetailModal from '../components/ReviewDetailModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useModal } from '../context/ModalContext';
import type { RecentReview } from '../components/TrustpilotReviewCard';

interface ProductCard {
  link_id: string;
  title: string;
  description: string;
  price_ghs: number;
  image_url: string;
  category?: string;
  escrow_url: string;
  seller_id: string;
  seller_username: string;
  seller_shop_name: string;
  seller_phone: string;
  badge_verified_seller: boolean;
  badge_title?: string;
  seller_avg_rating: number;
  seller_total_reviews: number;
  whatsapp_contact_url: string;
  created_at: string;
}

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
  is_featured?: boolean;
  advertised_until?: string | null;
}

interface SellerStorefront {
  seller_id: string;
  seller_username: string;
  shop_name?: string;
  shop_description?: string;
  shop_category?: string;
  shop_categories?: string[];
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
  active_products?: ProductCard[];
}

const OVERVIEW_ITEMS_PER_PAGE = 6; // 3 x 2 Grid for compact overview
const CATALOG_ITEMS_PER_PAGE = 9;   // 3 x 3 Grid for full catalog browsing
const REVIEWS_PER_PAGE = 6;

export default function SellerStoreView() {
  const modal = useModal();
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const [store, setStore] = useState<SellerStorefront | null>(null);
  const [recommendedShops, setRecommendedShops] = useState<RecommendedShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab State: 'overview' | 'products' | 'reviews'
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'reviews'>('overview');

  // Products Pagination & Filtering State
  const [overviewProductPage, setOverviewProductPage] = useState(1);
  const [catalogProductPage, setCatalogProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productSortBy, setProductSortBy] = useState<'popular' | 'newest' | 'price_low' | 'price_high'>('popular');

  // Reviews Tab Filtering & Search State
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'ALL'>('ALL');
  const [reviewPage, setReviewPage] = useState(1);

  // Carousel ref for Overview tab reviews
  const reviewCarouselRef = useRef<HTMLDivElement>(null);
  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Selected review for detail modal
  const [selectedReview, setSelectedReview] = useState<RecentReview | null>(null);

  // Interstitial Confirm Shipping / Delivery Modal for Products
  const [shippingModalProduct, setShippingModalProduct] = useState<ProductCard | null>(null);
  useEscapeKey(() => setShippingModalProduct(null), Boolean(shippingModalProduct));

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
      // Only include shops that have an active paid advertisement (featured_shops)
      setRecommendedShops(res.data.featured_shops || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (username) {
      fetchStorefront();
      fetchRecommendedShops();
      setOverviewProductPage(1);
      setCatalogProductPage(1);
      setReviewPage(1);
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
      await modal.alert({
        title: 'Reply Failed',
        message: err.response?.data?.message || 'Failed to submit reply.',
        type: 'danger',
        icon: 'alert'
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const scrollReviewCarousel = (direction: 'left' | 'right') => {
    if (reviewCarouselRef.current) {
      const { scrollLeft, clientWidth } = reviewCarouselRef.current;
      const scrollAmount = clientWidth * 0.75;
      reviewCarouselRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // ── Sorted Products Logic for Overview (Top 3 Popular in Row 1, then Recent) ──
  const overviewOrderedProducts = useMemo(() => {
    if (!store?.active_products || store.active_products.length === 0) return [];
    return [...store.active_products];
  }, [store?.active_products]);

  // Paginated products for Overview (3x2 = 6 per page)
  const totalOverviewPages = Math.ceil((overviewOrderedProducts.length || 0) / OVERVIEW_ITEMS_PER_PAGE);
  const currentOverviewProducts = useMemo(() => {
    const start = (overviewProductPage - 1) * OVERVIEW_ITEMS_PER_PAGE;
    return overviewOrderedProducts.slice(start, start + OVERVIEW_ITEMS_PER_PAGE);
  }, [overviewOrderedProducts, overviewProductPage]);

  // ── Filtered & Sorted Products for Catalog Tab ──
  const availableCategories = useMemo(() => {
    if (!store?.active_products) return [];
    const cats = new Set<string>();
    store.active_products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [store?.active_products]);

  const catalogFilteredProducts = useMemo(() => {
    if (!store?.active_products) return [];
    let list = [...store.active_products];

    // Search filter
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }

    // Category filter
    if (productCategoryFilter !== 'ALL') {
      list = list.filter(p => p.category === productCategoryFilter);
    }

    // Sorting
    if (productSortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (productSortBy === 'price_low') {
      list.sort((a, b) => a.price_ghs - b.price_ghs);
    } else if (productSortBy === 'price_high') {
      list.sort((a, b) => b.price_ghs - a.price_ghs);
    }

    return list;
  }, [store?.active_products, productSearch, productCategoryFilter, productSortBy]);

  const totalCatalogPages = Math.ceil((catalogFilteredProducts.length || 0) / CATALOG_ITEMS_PER_PAGE);
  const currentCatalogProducts = useMemo(() => {
    const start = (catalogProductPage - 1) * CATALOG_ITEMS_PER_PAGE;
    return catalogFilteredProducts.slice(start, start + CATALOG_ITEMS_PER_PAGE);
  }, [catalogFilteredProducts, catalogProductPage]);

  // ── Sorted Reviews for Carousel (Recent First) ──
  const sortedReviews = useMemo(() => {
    if (!store?.reviews) return [];
    return [...store.reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [store?.reviews]);

  // ── Filtered Reviews for Reviews Tab ──
  const filteredReviewsList = useMemo(() => {
    if (!store?.reviews) return [];
    let list = [...store.reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (reviewRatingFilter !== 'ALL') {
      list = list.filter(r => Math.round(r.rating_overall) === reviewRatingFilter);
    }

    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      list = list.filter(r => 
        r.buyer_name.toLowerCase().includes(q) || 
        r.item_title.toLowerCase().includes(q) || 
        (r.comment && r.comment.toLowerCase().includes(q))
      );
    }

    return list;
  }, [store?.reviews, reviewRatingFilter, reviewSearch]);

  const totalReviewPages = Math.ceil((filteredReviewsList.length || 0) / REVIEWS_PER_PAGE);
  const currentPaginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * REVIEWS_PER_PAGE;
    return filteredReviewsList.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredReviewsList, reviewPage]);

  // Rating breakdown stats
  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (store?.reviews) {
      store.reviews.forEach(r => {
        const rounded = Math.min(5, Math.max(1, Math.round(r.rating_overall)));
        counts[rounded] = (counts[rounded] || 0) + 1;
      });
    }
    return counts;
  }, [store?.reviews]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
    </div>
  );

  if (error || !store) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-red-500 font-medium">{error}</div>
  );

  const isOwner = Boolean(user && (
    user.id === store.seller_id || 
    (user.email && user.email.split('@')[0].toLowerCase() === store.seller_username.toLowerCase()) ||
    (user.username && user.username.toLowerCase() === store.seller_username.toLowerCase())
  ));

  // Filter recommended paid advertised shops to exclude current seller
  const paidFeaturedAds = recommendedShops.filter(
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

  // Reusable Compact Product Card Component
  const renderProductCard = (prod: ProductCard, isPopularRow: boolean = false) => (
    <div
      key={prod.link_id}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all flex flex-col overflow-hidden group relative"
    >
      {/* Product Image */}
      <div 
        onClick={() => setShippingModalProduct(prod)}
        className="h-36 sm:h-40 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0 cursor-pointer"
      >
        {prod.image_url ? (
          <img
            src={prod.image_url}
            alt={prod.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-950 text-slate-400 p-3 text-center">
            <Package className="h-8 w-8 text-slate-500 mb-1" />
            <span className="text-xs font-semibold text-slate-300 line-clamp-1">{prod.title}</span>
          </div>
        )}

        {/* Popular Badge if in first row / top items */}
        {isPopularRow && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider shadow-md">
              <Flame className="h-3 w-3 fill-white" /> Popular
            </span>
          </div>
        )}

        {/* Floating Price Tag */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
          <span className="px-2 py-0.5 rounded-lg bg-slate-950/90 backdrop-blur-md text-emerald-400 font-extrabold text-[11px] sm:text-xs shadow-lg border border-emerald-500/30 font-mono">
            GH₵ {Number(prod.price_ghs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {prod.category && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-300 text-[9.5px] font-medium truncate max-w-[110px]">
              {prod.category}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h4 
            onClick={() => setShippingModalProduct(prod)}
            className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
            title={prod.title}
          >
            {prod.title}
          </h4>
          {prod.description && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {prod.description}
            </p>
          )}
        </div>

        {/* Shipping Notice Trigger (Compact 1-line) */}
        <button
          type="button"
          onClick={() => setShippingModalProduct(prod)}
          className="w-full flex items-center justify-between text-[10.5px] text-slate-600 dark:text-slate-400 bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-1 truncate">
            <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0">📦 Shipping:</span>
            <span className="truncate">Based on location</span>
          </div>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Action Buttons: 1-line Compact Buy Button + Contact Icons */}
        <div className="pt-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setShippingModalProduct(prod)}
            className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center whitespace-nowrap truncate cursor-pointer"
          >
            <span className="truncate">Buy via Escrow</span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {prod.seller_phone && (
              <a
                href={`tel:${prod.seller_phone}`}
                className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition shadow-2xs cursor-pointer"
                title={`Call seller (${prod.seller_phone})`}
                aria-label={`Call seller at ${prod.seller_phone}`}
              >
                <Phone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </a>
            )}
            {prod.whatsapp_contact_url ? (
              <a
                href={prod.whatsapp_contact_url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition cursor-pointer"
                title="Chat with seller on WhatsApp"
                aria-label="Chat with seller on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            ) : (
              <Link
                to={`/l/${prod.link_id}`}
                className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition"
                title="View Payment Link"
                aria-label="View Payment Link"
              >
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-16 transition-colors">
      <SEOHead
        title={storeTitle}
        description={storeDesc}
        canonicalUrl={`https://trust.hendaxis.com/store/${store.seller_username}`}
        ogImage={store.profile_picture_url || 'https://trust.hendaxis.com/og_preview_banner.jpg'}
        jsonLd={storeJsonLd}
      />

      {/* Sticky Top Shop Header Bar (Storefront Identity & Trust Bar) */}
      <div className="sticky top-16 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 shadow-xs transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Shop Logo + Name + Verified Badges + Username */}
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
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 py-1 rounded-xl text-xs shadow-2xs">
              <PackageCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{store.total_completed_escrows} Escrows</span>
            </span>

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

      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* 1. SELLER COVER BANNER */}
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

        {/* 2. COMPACT 3-AXIS RATING SCORECARDS */}
        <div className="-mt-6 sm:-mt-7 relative z-10 grid grid-cols-3 gap-2.5 sm:gap-4 px-3 sm:px-6">
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

        {/* 2.5 STORE INFORMATION, CATEGORIES & BIO */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-slate-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                <Tag className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Categories:
              </span>
              {store.shop_categories && store.shop_categories.length > 0 ? (
                store.shop_categories.map(cat => (
                  <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
                    {cat}
                  </span>
                ))
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs">
                  {store.shop_category || 'General Marketplace'}
                </span>
              )}
            </div>

            {store.shop_description && (
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                {store.shop_description}
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2 self-start sm:self-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Escrow Protected Store</span>
          </div>
        </div>

        {/* ── STORE NAVIGATION TABS (Overview, Products, Reviews) ── */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200/80 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200/80 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>All Products</span>
            {store.active_products && store.active_products.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                {store.active_products.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200/80 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Customer Reviews</span>
            {store.reviews && store.reviews.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                {store.reviews.length}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: OVERVIEW TAB
            - 3x2 Paginated Products (Row 1 Popular, then Recent)
            - Reviews Carousel (Recent First with Horizontal Navigation)
            - Featured / Recommended Escrow Merchants (Paid Ads Only)
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Products Section (3x2 Grid = 6 items with Pagination) */}
            <div ref={productsSectionRef} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Store Products & Offers
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80">
                      {store.active_products?.length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    First row features popular items, followed by recent catalog additions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-xl shrink-0" title="Shipping fees are based on your location.">
                    <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Shipping based on location</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {currentOverviewProducts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 dark:text-slate-400">
                    <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                    <p className="font-semibold text-gray-700 dark:text-slate-300 text-base">No active products listed yet.</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Products and instant checkout links from this seller will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                      {currentOverviewProducts.map((prod, idx) => {
                        // First 3 items (Row 1) on Page 1 are tagged as Popular
                        const isPopular = overviewProductPage === 1 && idx < 3;
                        return renderProductCard(prod, isPopular);
                      })}
                    </div>

                    {/* 3x2 Pagination Controls */}
                    {totalOverviewPages > 1 && (
                      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          Showing <strong className="text-gray-900 dark:text-white font-bold">{((overviewProductPage - 1) * OVERVIEW_ITEMS_PER_PAGE) + 1}</strong> - <strong className="text-gray-900 dark:text-white font-bold">{Math.min(overviewProductPage * OVERVIEW_ITEMS_PER_PAGE, overviewOrderedProducts.length)}</strong> of <strong className="text-gray-900 dark:text-white font-bold">{overviewOrderedProducts.length}</strong> products
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={overviewProductPage === 1}
                            onClick={() => {
                              setOverviewProductPage(p => Math.max(1, p - 1));
                              productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                            aria-label="Previous product page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          {Array.from({ length: totalOverviewPages }).map((_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => {
                                  setOverviewProductPage(pageNum);
                                  productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className={`h-8 w-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  overviewProductPage === pageNum
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            disabled={overviewProductPage === totalOverviewPages}
                            onClick={() => {
                              setOverviewProductPage(p => Math.min(totalOverviewPages, p + 1));
                              productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                            aria-label="Next product page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Shop's Customer Reviews Carousel (Recent Reviews First) ── */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Store Feedback & Reviews ({sortedReviews.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Verified purchase reviews from confirmed escrow transactions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Carousel Left / Right Arrows */}
                  {sortedReviews.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollReviewCarousel('left')}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition cursor-pointer"
                        aria-label="Scroll reviews left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollReviewCarousel('right')}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition cursor-pointer"
                        aria-label="Scroll reviews right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200/80 dark:border-blue-800/80 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Reviews</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {sortedReviews.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <Shield className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm">No verified reviews yet.</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Reviews appear here once buyers confirm receipt of orders.</p>
                </div>
              ) : (
                <div
                  ref={reviewCarouselRef}
                  className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory"
                >
                  {sortedReviews.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => openReviewModal(r)}
                      className="w-[300px] sm:w-[340px] md:w-[360px] shrink-0 snap-start bg-gray-50/80 dark:bg-slate-800/70 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                    >
                      <div className="space-y-2.5">
                        {/* Header: Buyer Name + 3 Axis Ratings */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition block truncate max-w-[150px]">
                              {r.buyer_name}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2 py-0.2 rounded-full font-semibold mt-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                            </span>
                          </div>

                          <div className="flex flex-col items-end text-right">
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`h-3 w-3 ${s <= r.rating_overall ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                ))}
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100">{r.rating_overall.toFixed(1)}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                              Speed {r.rating_speed.toFixed(1)} • Comm {r.rating_communication.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Purchased Item Title */}
                        <div className="text-[11px] py-1 px-2.5 bg-white dark:bg-slate-900/90 rounded-lg border border-gray-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1">
                          <span className="text-gray-600 dark:text-slate-300 truncate">
                            Item: <strong className="font-bold text-gray-900 dark:text-white">{r.item_title}</strong>
                          </span>
                          <span className="italic text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
                            {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Review Comment */}
                        {r.comment && (
                          <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed italic line-clamp-3 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                            "{r.comment}"
                          </p>
                        )}
                      </div>

                      {/* Seller Reply preview */}
                      {r.seller_reply && (
                        <div className="mt-2.5 border-l-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 p-2 rounded-r-lg text-[11px] text-blue-900 dark:text-blue-200">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px] uppercase tracking-wider block">Seller Reply:</span>
                          <span className="line-clamp-1">{r.seller_reply}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Featured & Sponsored Escrow Merchants (Paid Advertisements Only) ── */}
            {paidFeaturedAds.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 text-white shadow-md border border-amber-400/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      <Zap className="h-3 w-3 fill-amber-400" /> Sponsored Merchants
                    </span>
                    <h3 className="text-lg font-extrabold text-white mt-1">Featured Stores</h3>
                  </div>
                  <Link
                    to="/shops"
                    className="text-xs font-bold text-blue-200 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>Browse All Shops</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {paidFeaturedAds.slice(0, 3).map((adShop) => (
                    <div
                      key={adShop.seller_id}
                      className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between gap-3 hover:bg-white/15 transition group"
                    >
                      <div className="flex items-center gap-3">
                        {adShop.profile_picture_url ? (
                          <img src={adShop.profile_picture_url} alt={adShop.shop_name} className="h-11 w-11 rounded-xl object-cover border border-white/20 shrink-0" />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center shrink-0">
                            {adShop.shop_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-300 transition">
                            {adShop.shop_name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-amber-300 mt-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{adShop.avg_overall.toFixed(1)}</span>
                            <span className="text-blue-200 font-mono text-[11px]">@{adShop.seller_username}</span>
                          </div>
                        </div>
                      </div>

                      {adShop.shop_description && (
                        <p className="text-xs text-blue-100/80 line-clamp-2">
                          {adShop.shop_description}
                        </p>
                      )}

                      <Link
                        to={`/store/${adShop.seller_username}`}
                        className="w-full py-2 bg-white/20 hover:bg-amber-400 hover:text-slate-950 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <span>Visit Store</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: DEDICATED PRODUCTS TAB
            - Full Product Catalog with Search, Category Filter, Sort
            - 3x3 Paginated Grid (9 items per page)
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6 transition-colors">
            {/* Header + Search + Filter Controls */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Complete Store Catalog ({catalogFilteredProducts.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Browse all available products and create secure escrow checkouts.
                  </p>
                </div>
              </div>

              {/* Search, Category Filter & Sorting Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                {/* Search Bar */}
                <div className="sm:col-span-5 relative">
                  <Search className="h-4 w-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setCatalogProductPage(1);
                    }}
                    placeholder="Search store products..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {productSearch && (
                    <button
                      onClick={() => { setProductSearch(''); setCatalogProductPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="sm:col-span-4 relative">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => {
                      setProductCategoryFilter(e.target.value);
                      setCatalogProductPage(1);
                    }}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Categories ({store.active_products?.length || 0})</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Sort Dropdown */}
                <div className="sm:col-span-3 relative">
                  <select
                    value={productSortBy}
                    onChange={(e) => {
                      setProductSortBy(e.target.value as any);
                      setCatalogProductPage(1);
                    }}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="popular">Popular First</option>
                    <option value="newest">Newest First</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Products 3x3 Grid */}
            {currentCatalogProducts.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-slate-400">
                <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                <p className="font-semibold text-gray-700 dark:text-slate-300 text-base">No matching products found.</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Try adjusting your search terms or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {currentCatalogProducts.map((prod, idx) => {
                  const isPopular = productSortBy === 'popular' && catalogProductPage === 1 && idx < 3;
                  return renderProductCard(prod, isPopular);
                })}
              </div>
            )}

            {/* Catalog 3x3 Pagination */}
            {totalCatalogPages > 1 && (
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Showing <strong className="text-gray-900 dark:text-white font-bold">{((catalogProductPage - 1) * CATALOG_ITEMS_PER_PAGE) + 1}</strong> - <strong className="text-gray-900 dark:text-white font-bold">{Math.min(catalogProductPage * CATALOG_ITEMS_PER_PAGE, catalogFilteredProducts.length)}</strong> of <strong className="text-gray-900 dark:text-white font-bold">{catalogFilteredProducts.length}</strong> products
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={catalogProductPage === 1}
                    onClick={() => setCatalogProductPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    aria-label="Previous product page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalCatalogPages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCatalogProductPage(pageNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                          catalogProductPage === pageNum
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={catalogProductPage === totalCatalogPages}
                    onClick={() => setCatalogProductPage(p => Math.min(totalCatalogPages, p + 1))}
                    className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    aria-label="Next product page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: DEDICATED REVIEWS TAB
            - Rating Distribution Breakdown Scorecards
            - Filter by Star Rating (5, 4, 3, 2, 1) & Search
            - Comprehensive Reviews Feed with Seller Replies & Modal
           ══════════════════════════════════════════════════════════ */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Reviews Summary Breakdown Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score big block */}
                <div className="md:col-span-4 text-center md:text-left space-y-1.5 md:border-r border-gray-100 dark:border-slate-800 md:pr-6">
                  <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white font-mono">
                    {store.avg_overall.toFixed(1)}
                  </span>
                  <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(store.avg_overall) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    Based on {store.total_reviews_count} verified buyer review{store.total_reviews_count === 1 ? '' : 's'}
                  </p>
                </div>

                {/* Right: Star Filter Bars */}
                <div className="md:col-span-8 space-y-1.5">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = ratingCounts[stars] || 0;
                    const percent = store.total_reviews_count > 0 ? (count / store.total_reviews_count) * 100 : 0;
                    const isSelected = reviewRatingFilter === stars;

                    return (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => {
                          setReviewRatingFilter(isSelected ? 'ALL' : stars);
                          setReviewPage(1);
                        }}
                        className={`w-full flex items-center gap-2 text-xs py-1 px-2 rounded-xl transition cursor-pointer ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-950/60 font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="w-12 text-left font-semibold text-gray-700 dark:text-slate-300 shrink-0">
                          {stars} star{stars === 1 ? '' : 's'}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-500 dark:text-slate-400 font-mono text-[11px] shrink-0">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filter & Reviews List Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Verified Customer Reviews ({filteredReviewsList.length})
                  </h3>
                  {reviewRatingFilter !== 'ALL' && (
                    <button
                      onClick={() => { setReviewRatingFilter('ALL'); setReviewPage(1); }}
                      className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center gap-1"
                    >
                      <span>Filtered: {reviewRatingFilter}★</span>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Search in reviews */}
                <div className="relative min-w-[220px]">
                  <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => {
                      setReviewSearch(e.target.value);
                      setReviewPage(1);
                    }}
                    placeholder="Search reviews..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {reviewSearch && (
                    <button
                      onClick={() => { setReviewSearch(''); setReviewPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {filteredReviewsList.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-slate-400">
                  <Shield className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                  <p className="font-semibold text-gray-700 dark:text-slate-300 text-base">No reviews match your filters.</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Try resetting the star rating or search query.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentPaginatedReviews.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => openReviewModal(r)}
                        className="bg-gray-50/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-gray-200/90 dark:border-slate-700/80 space-y-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="space-y-3">
                          {/* Top Row: Buyer Name + Verified Badge and Vertically Stacked Ratings */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{r.buyer_name}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                                </span>
                              </div>
                            </div>

                            {/* Ratings Stack */}
                            <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Overall:</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating_overall ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                  ))}
                                </div>
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{r.rating_overall.toFixed(1)}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 dark:text-slate-400">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Speed:</span>
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3 w-3 ${s <= r.rating_speed ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                                  ))}
                                </div>
                                <span className="font-bold text-gray-800 dark:text-slate-200">{r.rating_speed.toFixed(1)}</span>
                              </div>

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

                          {/* Purchased Item & Date */}
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

                          {/* Comment */}
                          {r.comment && (
                            <p className="text-sm text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-700 leading-relaxed italic shadow-2xs">
                              "{r.comment}"
                            </p>
                          )}

                          {/* Seller Reply */}
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

                        {/* Seller Reply Form */}
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
                    ))}
                  </div>

                  {/* Reviews Pagination */}
                  {totalReviewPages > 1 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Showing <strong className="text-gray-900 dark:text-white font-bold">{((reviewPage - 1) * REVIEWS_PER_PAGE) + 1}</strong> - <strong className="text-gray-900 dark:text-white font-bold">{Math.min(reviewPage * REVIEWS_PER_PAGE, filteredReviewsList.length)}</strong> of <strong className="text-gray-900 dark:text-white font-bold">{filteredReviewsList.length}</strong> reviews
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={reviewPage === 1}
                          onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                          aria-label="Previous review page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {Array.from({ length: totalReviewPages }).map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setReviewPage(pageNum)}
                              className={`h-8 w-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                reviewPage === pageNum
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          disabled={reviewPage === totalReviewPages}
                          onClick={() => setReviewPage(p => Math.min(totalReviewPages, p + 1))}
                          className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                          aria-label="Next review page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        showVisitStoreButton={false}
      />

      {/* Interstitial Confirm Shipping / Delivery Modal */}
      {shippingModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    Confirm Delivery with Seller
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify shipping fees to your destination
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShippingModalProduct(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selected Product Snapshot */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                  {shippingModalProduct.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Store: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{shippingModalProduct.seller_shop_name || store.shop_name}</strong>
                </p>
              </div>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                GH₵ {Number(shippingModalProduct.price_ghs).toFixed(2)}
              </span>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Important Shipping Notice</span>
              </div>
              <p className="leading-relaxed text-[11.5px]">
                Shipping costs in Ghana depend on your specific city/town and chosen transport method (e.g. Courier or Station Bus OTP).
              </p>
              <p className="leading-relaxed text-[11.5px] font-medium text-amber-900 dark:text-amber-100">
                If your delivery location costs more than what is included in this link, the seller may ask for an additional shipping fee before dispatching your package.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {shippingModalProduct.whatsapp_contact_url ? (
                <a
                  href={shippingModalProduct.whatsapp_contact_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat on WhatsApp to Confirm Delivery</span>
                </a>
              ) : (
                <Link
                  to={`/l/${shippingModalProduct.link_id}`}
                  onClick={() => setShippingModalProduct(null)}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Proceed to Escrow Checkout</span>
                </Link>
              )}

              {shippingModalProduct.seller_phone && (
                <a
                  href={`tel:${shippingModalProduct.seller_phone}`}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 text-center"
                >
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Call Seller ({shippingModalProduct.seller_phone})</span>
                </a>
              )}

              <div className="pt-2 text-center">
                <Link
                  to={`/l/${shippingModalProduct.link_id}`}
                  onClick={() => setShippingModalProduct(null)}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline"
                >
                  I have already agreed on delivery — Proceed to Checkout →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
