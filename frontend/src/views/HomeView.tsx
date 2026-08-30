import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Link2, Truck, CheckCircle, ArrowRight,
  Lock, Zap, Search, Store,
  ShieldCheck, Star, HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import heroBanner from '../assets/hero_banner.jpg';
import SEOHead from '../components/SEOHead';

const STEPS = [
  {
    icon: Link2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: '1. Seller Creates Payment Link',
    desc: 'Set your item price, shipping cost, and choose whether to absorb or pass the platform escrow fee.'
  },
  {
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: '2. Buyer Pays into Escrow',
    desc: 'Pay via Mobile Money (MTN, Telecel, AT) or Card. Funds are held safely in system escrow.'
  },
  {
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: '3. Multi-Channel Dispatch',
    desc: 'Ship via formal courier (DHL, Speedaf, FedEx) with live tracking links or informal bus station with Secret 6-Digit OTP.'
  },
  {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: '4. Tiered Inspection & Payout',
    desc: 'Buyer inspects during a 24h, 48h, or 72h window. Upon confirmation, funds release instantly to seller wallet.'
  },
];

const FEATURES = [
  {
    icon: Lock,
    title: 'Zero-Trust System Escrow',
    desc: 'Funds remain locked in double-entry escrow accounts until the buyer inspects and approves the delivered merchandise.',
  },
  {
    icon: ShieldCheck,
    title: '🛡️ Verified Seller Badges',
    desc: 'Sellers undergo manual identity and Ghana Card document verification in the Manager Portal before earning the official Verified Badge.',
  },
  {
    icon: Truck,
    title: 'Dual Logistics (Path A & B)',
    desc: 'Formal courier webhooks (DHL, FedEx, UPS, Speedaf) and informal bus station driver OTP verification.',
  },
  {
    icon: Star,
    title: 'Escrow-Gated Reviews',
    desc: 'Authentic 3-axis ratings (Speed, Communication, Satisfaction) submitted strictly after completed escrows.',
  },
  {
    icon: Zap,
    title: 'Tiered Buyer Inspection',
    desc: 'Automatic inspection protection: 24 hours (< GHS 2k), 48 hours (GHS 2k–10k), and 72 hours (>= GHS 10k).',
  },
  {
    icon: Store,
    title: 'Public Shop Directories',
    desc: 'Sellers showcase verified storefronts (`/store/:username`) and featured marketplace ads on the central Directory.',
  },
];

const STATS = [
  { value: 'GHS 0', label: 'Advance payment risk' },
  { value: '1.5%', label: 'Platform fee + GHS 10' },
  { value: '24–72h', label: 'Tiered inspection guarantee' },
  { value: 'Multi-Courier', label: 'DHL, Speedaf, FedEx & Bus OTP' },
];

export default function HomeView() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
    <div className="font-sans text-slate-900 bg-slate-950">
      <SEOHead
        title="HendAxis Trust — Ghana's Buyer-Seller Escrow Payment Platform"
        description="Pay securely, sell with confidence. HendAxis Trust protects online transactions across Ghana with double-entry escrow, MoMo & card integration, formal courier webhooks, and verified seller badges."
        canonicalUrl="https://trust.hendaxis.com/"
        jsonLd={homeJsonLd}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[560px] sm:min-h-[640px] flex flex-col justify-between border-b border-slate-800">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Hero Banner" className="w-full h-full object-cover opacity-100" />
        </div>
        <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-2 flex flex-col justify-between flex-1">
          {/* Bottom: Marketplace Search Box & Action Buttons */}
          <div className="text-center space-y-1 mt-auto pt-6">
            {/* Marketplace Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto shadow-2xl">
              <Search className="h-5 w-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search verified shops, sellers, or products (e.g. 'iPhone 15', 'Accra Tech')..."
                className="w-full pl-10 sm:pl-12 pr-32 py-3.5 hero-search-input rounded-2xl text-sm sm:text-base outline-none font-medium transition-all shadow-2xl"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-2 sm:px-2 bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <Store className="h-4 w-4" /> Search Shops
              </button>
            </form>

            {/* Action Buttons: 2 Buttons in 1 Row on Mobile */}
            <div className="flex flex-row gap-3 justify-center items-center pt-1">
              {isAuthenticated ? (
                <Link to="/dashboard/create-link"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 shrink-0">
                  Create Payment Link <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 shrink-0">
                    Start Selling Free <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <Link to="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-xl hero-glass-btn font-bold text-sm sm:text-base transition-all shrink-0">
                    Log in
                  </Link>
                </>
              )}
              <Link to="/help"
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-3.5 rounded-xl hero-glass-btn !text-amber-300 font-bold text-sm sm:text-base transition-all shrink-0">
                <HelpCircle className="h-4 w-4 text-amber-300" /> Platform Guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label} className="p-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-400 mb-1">{s.value}</p>
              <p className="text-sm sm:text-base text-slate-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-slate-900 dark:text-white">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-white">How HendAxis Trust Works</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base font-medium">Four robust steps guarantee 100% financial and merchandise safety for both parties.</p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden sm:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="relative z-10 h-20 w-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-5 shadow-xl">
                    <Icon className={`h-9 w-9 ${step.color}`} />
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm font-black text-blue-600 dark:text-blue-400">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-base sm:text-lg">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-slate-50/80 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4 text-slate-900 dark:text-white">Built for Complete Trust</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto text-sm sm:text-base font-medium">Every feature eliminates merchant scamming, buyer non-payment, and delivery defaults.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-xl transition-all group">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-base sm:text-lg">{f.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-950 text-white border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 !text-white">Ready to sell & buy with 100% confidence?</h2>
          <p className="!text-blue-200 mb-8 text-base font-medium">Join Ghana's verified vendors. Create your first payment link in under 30 seconds.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard/create-link"
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

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">HendAxis Trust</span>
          </div>
          <p>© {new Date().getFullYear()} HendAxis Trust. All rights reserved.</p>
          <div className="flex gap-6 font-semibold">
            <Link to="/shops" className="hover:text-white transition-colors">Marketplace Directory</Link>
            <Link to="/help" className="hover:text-white transition-colors">Platform Guide</Link>
            <Link to="/login" className="hover:text-white transition-colors">Log in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
