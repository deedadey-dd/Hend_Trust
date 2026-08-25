import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Link2, Truck, CheckCircle, ArrowRight,
  Lock, Phone, Star, Zap, Users, BarChart3, Search, Store
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import heroBanner from '../assets/hero_banner.jpg';

const STEPS = [
  {
    icon: Link2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Seller creates a payment link',
    desc: 'Set your price, shipping fee, and choose whether to absorb or pass on the escrow fee.'
  },
  {
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Buyer pays into escrow',
    desc: "The buyer's funds are held securely. Neither party can access them until conditions are met."
  },
  {
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Seller ships the item',
    desc: 'The seller dispatches the item with tracking. Both parties see live delivery status.'
  },
  {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Buyer confirms & funds release',
    desc: 'Once the buyer confirms receipt, the seller gets paid instantly. Disputes are handled by our team.'
  },
];

const FEATURES = [
  {
    icon: Lock,
    title: 'Zero-trust escrow',
    desc: 'Funds are held by HendAxis Trust until both parties are satisfied. No advance payment fraud.',
  },
  {
    icon: Phone,
    title: 'OTP-verified checkout',
    desc: 'Every buyer verifies their phone number via OTP before payment is processed.',
  },
  {
    icon: Zap,
    title: 'Instant settlements',
    desc: 'Once the buyer confirms receipt, funds hit your wallet in seconds — not days.',
  },
  {
    icon: Truck,
    title: 'Delivery tracking',
    desc: 'Integrated logistics tracking so buyers know exactly where their item is.',
  },
  {
    icon: Users,
    title: 'Dispute resolution',
    desc: 'Our moderation team handles disputes fairly with full transaction history as evidence.',
  },
  {
    icon: BarChart3,
    title: 'Seller dashboard',
    desc: 'See all your transactions, wallet balance, and payment history in one clean dashboard.',
  },
];

const STATS = [
  { value: 'GHS 0', label: 'Advance payment required' },
  { value: '1.5%', label: 'Platform fee + GHS 10' },
  { value: '5 min', label: 'OTP expiry window' },
  { value: '48 hrs', label: 'Inspection period' },
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

  return (
    <div className="font-sans text-gray-900">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[500px] sm:min-h-[600px] flex flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img src={heroBanner} alt="Hero Banner" className="w-full h-full object-cover opacity-100" />
        </div>
        <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-16 sm:pt-28 pb-4 sm:pb-8 flex flex-col justify-between flex-1">
          {/* Top: Trust Badge */}
          {/* <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm shadow-md">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              Ghana's trusted buyer–seller escrow platform
            </div>
          </div> */}

          {/* Bottom: Marketplace Search Box & Action Buttons */}
          <div className="text-center space-y-4 sm:space-y-6 mt-auto">
            {/* Marketplace Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto shadow-2xl">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search verified shops, sellers, or products (e.g. 'iPhone 15', 'Accra Gadgets')..."
                className="w-full pl-10 sm:pl-12 pr-32 py-2 sm:py-2.5 bg-white/20 backdrop-blur-xs text-gray-600 placeholder-gray-600 rounded-2xl text-xs sm:text-sm border border-white/40 focus:bg-white/95 focus:ring-4 focus:ring-blue-500/40 outline-none font-medium transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3.5 sm:px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center gap-1.5"
              >
                <Store className="h-4 w-4" /> Search Shops
              </button>
            </form>

            {/* Action Buttons: 2 Buttons in 1 Row on Mobile */}
            {/* <div className="flex flex-row gap-2.5 sm:gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link to="/dashboard/create-link"
                  className="inline-flex items-center justify-center gap-1.5 px-5 sm:px-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs sm:text-lg transition-all shadow-lg shadow-blue-900/40 hover:shadow-xl hover:-translate-y-0.5 shrink-0">
                  Create a Payment Link <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register"
                    className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs sm:text-lg transition-all shadow-lg shadow-blue-900/40 hover:shadow-xl hover:-translate-y-0.5 shrink-0">
                    Start Selling Free <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <Link to="/login"
                    className="inline-flex items-center justify-center gap-1.5 px-5 sm:px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-lg transition-all backdrop-blur-sm shrink-0">
                    Log in
                  </Link>
                </>
              )}
            </div> */}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-black text-blue-600 mb-1">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">How it works</h2>
          <p className="text-gray-500 max-w-lg mx-auto">Four simple steps protect both buyer and seller in every transaction.</p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden sm:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-green-200" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className={`relative z-10 h-24 w-24 rounded-2xl ${step.bg} flex items-center justify-center mb-5 shadow-sm`}>
                    <Icon className={`h-10 w-10 ${step.color}`} />
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-black text-gray-500">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{step.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Built for trust</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Every feature is designed to protect both parties from fraud.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to sell with confidence?</h2>
          <p className="text-blue-100 mb-10 text-lg">Create your first escrow payment link in under 30 seconds.</p>
          {isAuthenticated ? (
            <Link to="/dashboard/create-link"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold text-lg hover:bg-blue-50 transition-all shadow-lg">
              Create a Payment Link <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold text-lg hover:bg-blue-50 transition-all shadow-lg">
              Get Started — It's Free <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 text-sm">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-white">HendAxis Trust</span>
          </div>
          <p>© {new Date().getFullYear()} HendAxis Trust. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-white transition-colors">Log in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
