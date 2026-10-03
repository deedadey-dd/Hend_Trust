import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Link2, Truck, CheckCircle, ArrowRight,
  Lock, Zap, Search, Store,
  ShieldCheck, Star, ShoppingBag,
  CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import heroBanner from '../assets/hero_banner.webp';
import SEOHead from '../components/SEOHead';
import RecentReviewsCarousel from '../components/RecentReviewsCarousel';
import EscrowFeeCalculator from '../components/EscrowFeeCalculator';
import FloatingCalculatorWidget from '../components/FloatingCalculatorWidget';
import TermsModal from '../components/TermsModal';
import TrackingModal from '../components/TrackingModal';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

interface ActiveCourier {
  code: string;
  name: string;
  category: string;
  is_active: boolean;
}

const BUYER_STEPS = [
  {
    icon: Link2,
    color: 'text-[#0363ff]',
    title: '1. Receive / Request Escrow Link',
    desc: 'Ask your Instagram, TikTok, or WhatsApp seller for an escrow payment link with fixed item and delivery costs.'
  },
  {
    icon: Shield,
    color: 'text-[#ff6d1d]',
    title: '2. Deposit into Secure Escrow',
    desc: 'Pay safely with MTN MoMo, Telecel Cash, AT Money, or Card. Funds are locked in trust, not sent to the seller.'
  },
  {
    icon: Truck,
    color: 'text-indigo-600 dark:text-indigo-400',
    title: '3. Track Order & Delivery',
    desc: 'Receive live courier tracking links or a secure 6-digit collection OTP for intercity bus station pick-up.'
  },
  {
    icon: CheckCircle,
    color: 'text-emerald-600',
    title: '4. Inspect & Approve Payout',
    desc: 'Inspect your package within 24–72 hours. If satisfied, approve payment release; if defective, dispute for a full refund.'
  },
];

const SELLER_STEPS = [
  {
    icon: Link2,
    color: 'text-[#0363ff]',
    title: '1. Create Payment Link in 30s',
    desc: 'Set your product price, shipping fee, description, and decide whether to absorb or split the platform protection fee.'
  },
  {
    icon: Shield,
    color: 'text-[#ff6d1d]',
    title: '2. Verified Payment Alert',
    desc: 'Get instant verified SMS and system alerts when the buyer deposits the money into escrow. Zero fake payment risk.'
  },
  {
    icon: Truck,
    color: 'text-indigo-600 dark:text-indigo-400',
    title: '3. Hand Over to Courier',
    desc: 'Dispatch via DHL, Speedaf, FedEx, or Bus Station with automated tracking and dispatch logs attached.'
  },
  {
    icon: CheckCircle,
    color: 'text-emerald-600',
    title: '4. Instant MoMo Payout',
    desc: 'As soon as delivery is confirmed and inspected, funds transfer directly to your wallet and Mobile Money account.'
  },
];

const FEATURES = [
  {
    icon: Lock,
    title: 'Zero-Trust System Escrow',
    desc: 'Funds remain locked in double-entry escrow accounts until the buyer inspects and approves the delivered merchandise.',
    link: '/trust-center',
    linkText: 'Explore security architecture'
  },
  {
    icon: ShieldCheck,
    title: '🛡️ Verified Seller Badges',
    desc: 'Sellers undergo manual identity and Ghana Card document verification in the Manager Portal before earning the official badge.',
    link: '/shops',
    linkText: 'Browse verified directory'
  },
  {
    icon: Truck,
    title: 'Dual Logistics (Path A & B)',
    desc: 'Formal courier tracking (DHL, FedEx, UPS, Speedaf) alongside informal bus station driver OTP verification.',
    link: '/how-it-works',
    linkText: 'See logistics workflow'
  },
  {
    icon: Star,
    title: 'Escrow-Gated Reviews',
    desc: 'Authentic 3-axis ratings (Speed, Communication, Satisfaction) submitted strictly after completed escrow transactions.',
    link: '/reviews',
    linkText: 'Read verified reviews'
  },
  {
    icon: Zap,
    title: 'Tiered Buyer Inspection',
    desc: 'Automatic inspection protection windows: 24 hours (< GHS 2k), 48 hours (GHS 2k–10k), and 72 hours (>= GHS 10k).',
    link: '/for-buyers',
    linkText: 'Learn buyer safeguards'
  },
  {
    icon: Store,
    title: 'Public Shop Directories',
    desc: 'Sellers showcase verified storefronts (/store/:username) and featured marketplace ads on the central Directory.',
    link: '/for-sellers',
    linkText: 'Start seller storefront'
  },
];

const STATS = [
  { value: '100%', label: 'Buyer & Seller Escrow Protection' },
  { value: 'GHS 0', label: 'Advance Payment Scam Risk' },
  { value: '1.5%', label: 'Platform Fee + GHS 10.00' },
  { value: '24–72h', label: 'Mandatory Inspection Guarantee' },
];

export default function HomeView() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStepTab, setActiveStepTab] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [activeCouriers, setActiveCouriers] = useState<ActiveCourier[]>([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const navigate = useNavigate();

  // Fetch active couriers dynamically from backend admin settings
  useEffect(() => {
    apiClient.get('/delivery/active-couriers')
      .then(res => {
        if (Array.isArray(res.data)) {
          setActiveCouriers(res.data);
        }
      })
      .catch(() => {
        setActiveCouriers([]);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shops?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/shops');
    }
  };

  const homeJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialService',
      'name': 'HendAxis Trust',
      'url': 'https://trust.hendaxis.com',
      'logo': 'https://trust.hendaxis.com/favicon.svg',
      'description': "Ghana's premier buyer-seller escrow payment platform. Pay securely via Mobile Money or Card.",
      'areaServed': 'GH'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'url': 'https://trust.hendaxis.com',
      'name': 'HendAxis Trust',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': 'https://trust.hendaxis.com/shops?query={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <SEOHead
        title="HendAxis Trust — Ghana's Buyer-Seller Escrow Payment Platform"
        description="Pay securely, sell with confidence. HendAxis Trust protects online transactions across Ghana with double-entry escrow, MoMo & card integration, formal courier webhooks, and verified seller badges."
        canonicalUrl="https://trust.hendaxis.com/"
        jsonLd={homeJsonLd}
      />

      {/* ── Section 1: Hero Banner (Unobstructed Artwork & Primary CTAs) ── */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[500px] sm:min-h-[580px] md:min-h-[640px] flex flex-col justify-between border-b border-slate-800">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Hero Banner" className="w-full h-full object-cover opacity-100" fetchPriority="high" decoding="async" loading="eager" />
        </div>
        <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-6 flex flex-col justify-between flex-1">
          {/* Action Buttons: Clean & Unobstructed at bottom of hero banner */}
          <div className="text-center mt-auto pt-6">
            <div className="flex flex-row gap-3 justify-center items-center flex-wrap">
              {isAuthenticated ? (
                <Link to="/create-link"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-blue-600/95 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 shrink-0">
                  Create Payment Link <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-xl bg-blue-600/95 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 shrink-0">
                    Start Selling Free <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <Link to="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-xl hero-glass-btn font-bold text-sm sm:text-base transition-all shrink-0">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Supported Payment Rails & Dynamic Courier Trust Strip ── */}
      <section className="bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Payment Rails */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Supported Rails:</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-2xs">MTN MoMo</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-2xs">Telecel Cash</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs">AT Money</span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">Cards (Visa/Mastercard)</span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Ghana Card KYC
            </span>
          </div>

          {/* Dynamic Active Couriers from Admin Settings */}
          {activeCouriers.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-blue-500" /> Integrated Logistics:
              </span>
              {activeCouriers.map(courier => (
                <span
                  key={courier.code}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs"
                  title={`${courier.name} Verified Partner`}
                >
                  {courier.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ── Compact Marketplace & Product Discovery Strip ── */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 sm:py-7 px-4 sm:px-6 transition-colors shadow-2xs">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-3.5">
          {/* Header Above Search Bar */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Search Marketplace</span>
            </h2>
            <Link
              to="/shops"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
            >
              Browse all shops <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative shadow-xs rounded-xl sm:rounded-2xl">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search verified shops"
              placeholder="Search verified shops, products, descriptions, or categories (e.g. 'iPhone 15', 'Sneakers', 'Solar')..."
              className="w-full pl-10 sm:pl-12 pr-28 sm:pr-32 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3.5 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg sm:rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>
          </form>

          {/* 2-Line Horizontal Category Matrix */}
          <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 sm:justify-center">
            {MARKETPLACE_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.id}
                  to={`/shops?category=${encodeURIComponent(cat.name)}`}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:hover:border-blue-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition-all shadow-2xs whitespace-nowrap shrink-0"
                >
                  <Icon className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{cat.shortName || cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3: Dual Persona Split (Are you Buying or Selling?) ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-[#0363ff] dark:text-blue-400 border border-blue-200 dark:border-blue-800 mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Dual-Sided Protection
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">Built for Ghanaian Shoppers & Social Merchants</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base mt-2">
            Whether you are buying from an Instagram boutique or selling high-ticket electronics, HendAxis Trust eliminates transaction risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card A: For Shoppers & Buyers */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-blue-200/80 dark:border-blue-900/50 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#0363ff] flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">For Buyers & Shoppers</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Shop Online Without the Fear of Fake Vendors
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Never send Mobile Money to an unfamiliar social media seller and pray they deliver. Your money is protected in third-party escrow until you physically inspect your goods.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>100% Money-Back Guarantee:</strong> Full refund if goods are counterfeit or never arrive.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>24h–72h Inspection Window:</strong> Confirm size, quality, and condition before releasing funds.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Impartial Dispute Resolution:</strong> Direct mediation desk backed by verified dispatch logs.</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <Link
                to="/for-buyers"
                className="px-5 py-3 rounded-xl bg-[#0363ff] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <span>Learn Buyer Protection</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shops"
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Explore Verified Stores</span>
              </Link>
            </div>
          </div>

          {/* Card B: For Sellers & Merchants */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-orange-200/80 dark:border-orange-900/50 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] flex items-center justify-center">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#ff6d1d]">For Sellers & Merchants</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Eliminate "Pay on Delivery" Losses & Fake Alerts
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Stop wasting dispatch rider delivery fees on fake buyers who reject parcels or turn off their phones upon arrival. Accept guaranteed payments before shipping.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Zero CoD Defaults:</strong> Buyer funds are pre-locked in escrow before dispatch.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Verified Seller Trust Badge:</strong> Ghana Card verification builds instant buyer confidence.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Instant MoMo Payouts:</strong> Automated transfers to MTN, Telecel, AT, or commercial banks.</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <Link
                to="/for-sellers"
                className="px-5 py-3 rounded-xl bg-[#ff6d1d] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <span>Seller Solutions</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={isAuthenticated ? "/create-link" : "/register"}
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
              >
                <Link2 className="h-4 w-4 text-[#ff6d1d]" />
                <span>Create Payment Link</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-slate-100 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label} className="p-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{s.value}</p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent Customer Reviews Carousel ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-2">
        <RecentReviewsCarousel
          mode="single-row"
          title="Recent Buyer Reviews"
          subtitle="Read verified feedback from real buyers across Ghana about items and merchants."
        />
      </section>

      {/* ── Section 4: How It Works (Perspective Toggle: Buyer vs Seller) ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-slate-900 dark:text-white">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900 dark:text-white">How HendAxis Escrow Works</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base font-medium">
            Four transparent steps guarantee complete financial and merchandise safety.
          </p>

          {/* Perspective Toggle Buttons */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 mt-6">
            <button
              onClick={() => setActiveStepTab('BUYER')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStepTab === 'BUYER'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>For Buyers</span>
            </button>
            <button
              onClick={() => setActiveStepTab('SELLER')}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStepTab === 'SELLER'
                  ? 'bg-[#ff6d1d] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>For Sellers</span>
            </button>
          </div>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden sm:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {(activeStepTab === 'BUYER' ? BUYER_STEPS : SELLER_STEPS).map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center animate-in fade-in duration-200">
                  <div className="relative z-10 h-20 w-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-5 shadow-xl">
                    <Icon className={`h-9 w-9 ${step.color}`} />
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm font-black text-blue-600 dark:text-blue-400">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base sm:text-lg">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>Read full step-by-step escrow documentation</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Section 5: Features Grid with Direct GTM Deep Links ── */}
      <section className="bg-slate-50/80 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-white">Built for Complete Trust</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base font-medium">
              Every feature eliminates merchant scamming, buyer non-payment, and delivery defaults.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-xl transition-all group flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-base sm:text-lg">{f.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">{f.desc}</p>
                  </div>
                  <Link
                    to={f.link}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mt-auto pt-2"
                  >
                    <span>{f.linkText}</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 6: Fee Calculator Section ── */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-slate-900 dark:text-white">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 mb-3">
            Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900 dark:text-white">Estimate Your Escrow Fees</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-medium">
            Know exactly what you pay or receive upfront. Platform protection fee is 1.5% + GHS 10.00 calculated on the item price plus delivery.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <EscrowFeeCalculator defaultAmount={250} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-950 text-white border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 !text-white">Ready to sell & buy with 100% confidence?</h2>
          <p className="!text-blue-200 mb-8 text-base font-medium">Join Ghana's verified vendors. Create your first payment link in under 30 seconds.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/create-link"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white !text-blue-950 font-extrabold text-base hover:bg-blue-50 transition-all shadow-xl">
                Create a Payment Link <ArrowRight className="h-5 w-5 !text-blue-950" />
              </Link>
            ) : (
              <Link to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white !text-blue-950 font-extrabold text-base hover:bg-blue-50 transition-all shadow-xl">
                Get Started — It's Free <ArrowRight className="h-5 w-5 !text-blue-950" />
              </Link>
            )}
            <Link to="/shops"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 !text-slate-100 font-extrabold text-base transition-all shadow-xl">
              <Store className="h-5 w-5 text-blue-400" /> Browse Verified Shops
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 7: Comprehensive 4-Column Modern Footer ── */}
      <footer className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs border-t border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Column 1: Platform & Solutions */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Platform</p>
              <ul className="space-y-2 font-medium">
                <li><Link to="/for-buyers" className="hover:text-blue-600 dark:hover:text-white transition-colors">For Buyers & Shoppers</Link></li>
                <li><Link to="/for-sellers" className="hover:text-blue-600 dark:hover:text-white transition-colors">For Sellers & Merchants</Link></li>
                <li><Link to="/shops" className="hover:text-blue-600 dark:hover:text-white transition-colors">Verified Shop Directory</Link></li>
                <li><Link to="/referrals" className="hover:text-blue-600 dark:hover:text-white transition-colors">Refer & Earn Rewards</Link></li>
                <li><Link to="/reviews" className="hover:text-blue-600 dark:hover:text-white transition-colors">Customer Reviews</Link></li>
              </ul>
            </div>

            {/* Column 2: Trust & Security */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Trust & Security</p>
              <ul className="space-y-2 font-medium">
                <li><Link to="/how-it-works" className="hover:text-blue-600 dark:hover:text-white transition-colors">How Escrow Works</Link></li>
                <li><Link to="/trust-center" className="hover:text-blue-600 dark:hover:text-white transition-colors">Trust & Security Center</Link></li>
                <li><Link to="/guides" className="hover:text-blue-600 dark:hover:text-white transition-colors">Scam Prevention Guides</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="hover:text-blue-600 dark:hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Terms of Service & Rules
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Developers & Tools */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Developers & Tools</p>
              <ul className="space-y-2 font-medium">
                <li><Link to="/developers" className="hover:text-blue-600 dark:hover:text-white transition-colors">Developer Hub & APIs</Link></li>
                <li><Link to="/docs/api" className="hover:text-blue-600 dark:hover:text-white transition-colors">Drop-in SDK & Webhooks</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(true)}
                    className="hover:text-blue-600 dark:hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Track Order Status
                  </button>
                </li>
                <li><Link to="/login" className="hover:text-blue-600 dark:hover:text-white transition-colors">Seller Login</Link></li>
                <li><Link to="/register" className="hover:text-blue-600 dark:hover:text-white transition-colors">Register Account</Link></li>
              </ul>
            </div>

            {/* Column 4: Support & Contact */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Support & Contact</p>
              <ul className="space-y-2 font-medium">
                <li><Link to="/help" className="hover:text-blue-600 dark:hover:text-white transition-colors">Help Center & FAQs</Link></li>
                <li><Link to="/contact" className="hover:text-blue-600 dark:hover:text-white transition-colors">Contact Support Desk</Link></li>
                <li className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>📍 Greater Accra Region, Ghana</span>
                </li>
                <li className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>⏰ Mon–Sat: 8:00 AM – 8:00 PM GMT</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">HendAxis Trust</span>
              <span className="text-[11px] text-slate-400">|</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Ghana's Buyer-Seller Escrow Platform</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} HendAxis Trust Limited. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Escrow Calculator Widget */}
      <FloatingCalculatorWidget />

      {/* Global Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Global Tracking Modal */}
      {showTrackModal && (
        <TrackingModal onClose={() => setShowTrackModal(false)} />
      )}
    </div>
  );
}
