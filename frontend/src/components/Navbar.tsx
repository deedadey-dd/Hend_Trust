import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiClient } from '../api/client';
import { 
  Shield, LayoutDashboard, Link2, LogIn, UserPlus, LogOut, Menu, X, Wallet, MapPin, 
  UserCircle, Store, Sun, Moon, Laptop, HelpCircle, Phone, Code, ChevronDown, Settings, Scale,
  ShieldCheck, BookOpen, Sparkles, Gift
} from 'lucide-react';
import TrackingModal from './TrackingModal';
import TermsModal from './TermsModal';
import logoWhite from '../assets/hendaxis_trust_logo_white.svg';
import logoBlack from '../assets/hendaxis_trust_logo_black.svg';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const solutionsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/wallet/balance')
        .then(res => setBalance(res.data.available_balance_ghs))
        .catch(err => console.error("Failed to fetch balance", err));
    }
  }, [isAuthenticated, location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (solutionsRef.current && !solutionsRef.current.contains(target)) {
        setSolutionsOpen(false);
      }
      if (trustRef.current && !trustRef.current.contains(target)) {
        setTrustOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setSolutionsOpen(false);
    setTrustOpen(false);
  }, [location.pathname]);

  // Hide navbar on public checkout pages
  if (location.pathname.startsWith('/l/')) return null;

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    setUserMenuOpen(false);
    setMenuOpen(false);
    navigate('/');
  };

  const navLink = (to: string, label: string, icon: React.ReactNode) => (
    <Link
      to={to}
      onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
        ${location.pathname === to
          ? 'bg-[#0363ff] !text-white shadow-sm'
          : 'text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'}`}
    >
      {icon}
      {label}
    </Link>
  );

  const themeToggleButton = (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm cursor-pointer shrink-0"
      title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
      aria-label="Toggle light and dark theme"
    >
      {theme === 'light' ? (
        <Sun className="h-4 w-4 text-[#ff6d1d]" />
      ) : theme === 'dark' ? (
        <Moon className="h-4 w-4 text-[#0363ff]" />
      ) : (
        <Laptop className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      )}
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-sm text-slate-900 dark:text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}>
              <img src={logoBlack} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain block dark:hidden group-hover:scale-102 transition-transform shrink-0" />
              <img src={logoWhite} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain hidden dark:block group-hover:scale-102 transition-transform shrink-0" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {isAuthenticated ? (
                <>
                  {/* Primary Seller Navigation */}
                  {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                  {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4 text-[#ff6d1d]" />)}
                  {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                  {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                  
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Wallet Balance Badge */}
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-[#0363ff]/10 text-[#0363ff] dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-[#0363ff]/20 transition-colors border border-blue-200 dark:border-[#0363ff]/20 shadow-sm"
                      title="View Wallet Ledger"
                    >
                      <Wallet className="h-4 w-4" />
                      GHS {Number(balance).toFixed(2)}
                    </Link>
                  )}

                  {/* Theme Switcher Button */}
                  {themeToggleButton}

                  {/* User Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setUserMenuOpen(o => !o)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        userMenuOpen
                          ? 'bg-blue-50 dark:bg-slate-800 border-[#0363ff] text-[#0363ff] dark:text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#0363ff] !text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                        {(user?.name || user?.username || 'S')[0].toUpperCase()}
                      </div>
                      <span className="max-w-[100px] truncate text-slate-800 dark:text-slate-200">{user?.name || user?.username || 'Account'}</span>
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu Card */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.username}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                          <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-[#0363ff]/10 border border-blue-200 dark:border-[#0363ff]/20 text-[10px] font-bold text-[#0363ff] dark:text-blue-400 uppercase tracking-wider">
                            {user?.role || 'SELLER'}
                          </div>
                        </div>

                        <div className="py-1 px-1 space-y-0.5">
                          {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') && (
                            <Link
                              to="/admin-portal/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#ff6d1d] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Shield className="h-4 w-4 text-[#ff6d1d]" />
                              Manager Portal
                            </Link>
                          )}

                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Settings className="h-4 w-4 text-slate-500" />
                            Profile & Payout Settings
                          </Link>

                          <Link
                            to="/dashboard?tab=referrals"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
                          >
                            <Gift className="h-4 w-4 text-purple-500" />
                            Refer & Earn Rewards
                          </Link>

                          <Link
                            to="/how-it-works"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Sparkles className="h-4 w-4 text-[#ff6d1d]" />
                            How Escrow Works
                          </Link>

                          <Link
                            to="/trust-center"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0363ff] dark:text-blue-400 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-[#0363ff]" />
                            Trust & Security Center
                          </Link>

                          <Link
                            to="/guides"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <BookOpen className="h-4 w-4 text-[#ff6d1d]" />
                            Safety & Scam Prevention Hub
                          </Link>

                          <Link
                            to="/developers"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Code className="h-4 w-4 text-slate-500" />
                            Developer APIs & SDK
                          </Link>

                          <button
                            onClick={() => { setShowTrackModal(true); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                          >
                            <MapPin className="h-4 w-4 text-slate-500" />
                            Track Order
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowTermsModal(true); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                          >
                            <Scale className="h-4 w-4 text-slate-500" />
                            Terms of Service & Rules
                          </button>

                          <Link
                            to="/help"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <HelpCircle className="h-4 w-4 text-slate-500" />
                            Platform Help & FAQ
                          </Link>
                        </div>

                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-1 space-y-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 text-rose-500" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Streamlined Unauthenticated Guest Navigation */
                <>
                  {navLink('/how-it-works', 'How It Works', <Sparkles className="h-4 w-4 text-[#ff6d1d]" />)}

                  {/* Solutions Dropdown */}
                  <div className="relative" ref={solutionsRef}>
                    <button
                      onClick={() => { setSolutionsOpen(o => !o); setTrustOpen(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        solutionsOpen || location.pathname === '/for-sellers' || location.pathname === '/for-buyers' || location.pathname === '/shops' || location.pathname === '/developers'
                          ? 'text-[#0363ff] bg-blue-50 dark:bg-slate-800 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <span>Solutions</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${solutionsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {solutionsOpen && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <Link
                          to="/for-sellers"
                          onClick={() => setSolutionsOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] flex items-center justify-center shrink-0 mt-0.5">
                            <Store className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">For Sellers & Shops</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Zero CoD losses & instant MoMo payouts</p>
                          </div>
                        </Link>

                        <Link
                          to="/for-buyers"
                          onClick={() => setSolutionsOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#0363ff] flex items-center justify-center shrink-0 mt-0.5">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">For Buyers & Shoppers</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">100% money-back escrow guarantee</p>
                          </div>
                        </Link>

                        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                        <Link
                          to="/shops"
                          onClick={() => setSolutionsOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Store className="h-4 w-4 text-slate-400" />
                          <span>Browse Shops Marketplace</span>
                        </Link>

                        <Link
                          to="/developers"
                          onClick={() => setSolutionsOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Code className="h-4 w-4 text-slate-400" />
                          <span>Developer APIs & SDK</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Trust & Safety Dropdown */}
                  <div className="relative" ref={trustRef}>
                    <button
                      onClick={() => { setTrustOpen(o => !o); setSolutionsOpen(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        trustOpen || location.pathname === '/trust-center' || location.pathname === '/guides' || location.pathname === '/help'
                          ? 'text-[#0363ff] bg-blue-50 dark:bg-slate-800 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <HelpCircle className="h-4 w-4 text-[#0363ff]" />
                      <span>Trust & Help</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${trustOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {trustOpen && (
                      <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <Link
                          to="/help"
                          onClick={() => setTrustOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#0363ff] flex items-center justify-center shrink-0 mt-0.5">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Help & FAQ Knowledge Base</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Escrow guide, logistics, payouts & disputes</p>
                          </div>
                        </Link>

                        <Link
                          to="/trust-center"
                          onClick={() => setTrustOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Trust & Security Center</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Bank-grade vault & Ghana Card KYC</p>
                          </div>
                        </Link>

                        <Link
                          to="/guides"
                          onClick={() => setTrustOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Scam Prevention Hub</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Spot & avoid online shopping scams</p>
                          </div>
                        </Link>

                        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                        <Link
                          to="/contact"
                          onClick={() => setTrustOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>24/7 Contact Support</span>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {navLink('/referrals', 'Refer & Earn', <Gift className="h-4 w-4 text-[#ff6d1d]" />)}
                  
                  <button
                    onClick={() => setShowTrackModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Track Order</span>
                  </button>

                  {/* Theme Switcher Button */}
                  {themeToggleButton}

                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
                  
                  {navLink('/login', 'Log In', <LogIn className="h-4 w-4" />)}
                  
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#0363ff] hover:bg-blue-600 transition-all shadow-md shadow-blue-500/25 ml-1"
                  >
                    <UserPlus className="h-4 w-4 text-white" />
                    <span>Get Started</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Toggle Button */}
            <button
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle Navigation Menu"
            >
              {menuOpen ? <X className="h-6 w-6 text-slate-900 dark:text-white" /> : <Menu className="h-6 w-6 text-slate-900 dark:text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-5 space-y-3 shadow-2xl text-slate-900 dark:text-white animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Theme Switcher Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme Preference:</span>
              <div className="flex gap-1">
                {[
                  { id: 'light', label: 'Light', icon: Sun, color: 'text-amber-500' },
                  { id: 'dark', label: 'Dark', icon: Moon, color: 'text-blue-400' },
                  { id: 'system', label: 'System', icon: Laptop, color: 'text-slate-500 dark:text-slate-400' }
                ].map(t => {
                  const IconComp = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-1 font-semibold transition cursor-pointer ${
                        theme === t.id
                          ? 'bg-blue-600 border-blue-500 !text-white shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {isAuthenticated ? (
              <>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">Merchant Navigation</p>
                  {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                  {navLink('/dashboard?tab=referrals', 'Referrals & Rewards', <Gift className="h-4 w-4 text-purple-500" />)}
                  {navLink('/create-link', 'Create Payment Link', <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                  {navLink('/links', 'My Payment Links', <Link2 className="h-4 w-4" />)}
                  {navLink('/how-it-works', 'How Escrow Works', <Sparkles className="h-4 w-4 text-amber-500" />)}
                  {navLink('/shops', 'Shops Directory', <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">Trust, Safety & Tools</p>
                  {navLink('/trust-center', 'Trust & Security Center', <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />)}
                  {navLink('/guides', 'Safety & Scam Hub', <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                  {navLink('/developers', 'Developer APIs & SDK', <Code className="h-4 w-4 text-slate-600 dark:text-slate-400" />)}
                  <button
                    onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Track Order Status
                  </button>
                  {navLink('/help', 'Platform Help & FAQ', <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                  {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') &&
                    navLink('/admin-portal/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-amber-500" />)
                  }
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">Account & Wallet</p>
                  {navLink('/profile', 'Profile & Payout Settings', <UserCircle className="h-4 w-4" />)}
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Available Balance:
                      </span>
                      <span>GHS {Number(balance).toFixed(2)}</span>
                    </Link>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.username}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                {navLink('/how-it-works', 'How HendAxis Works', <Sparkles className="h-4 w-4 text-[#ff6d1d]" />)}
                {navLink('/referrals', 'Refer & Earn Credits', <Gift className="h-4 w-4 text-[#ff6d1d]" />)}
                {navLink('/trust-center', 'Trust & Security Center', <ShieldCheck className="h-4 w-4 text-[#0363ff]" />)}
                {navLink('/guides', 'Safety & Scam Prevention Hub', <BookOpen className="h-4 w-4 text-[#ff6d1d]" />)}
                {navLink('/for-sellers', 'For Sellers & Merchants', <Store className="h-4 w-4 text-[#ff6d1d]" />)}
                {navLink('/for-buyers', 'For Shoppers & Buyers', <Shield className="h-4 w-4 text-[#0363ff]" />)}
                {navLink('/developers', 'Developer APIs & SDK', <Code className="h-4 w-4 text-slate-500" />)}
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-slate-500" />
                  Track Order Status
                </button>
                {navLink('/help', 'Platform FAQ & Guides', <HelpCircle className="h-4 w-4 text-slate-500" />)}
                {navLink('/contact', 'Contact Support', <Phone className="h-4 w-4 text-slate-500" />)}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-3 space-y-2">
                  {navLink('/login', 'Log In to Account', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0363ff] hover:bg-blue-600 transition-colors w-full justify-center shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    Get Started Free
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Tracking Modal */}
      {showTrackModal && (
        <TrackingModal onClose={() => setShowTrackModal(false)} />
      )}

      {/* Global Terms Modal for Registered Sellers / Users */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </>
  );
}
