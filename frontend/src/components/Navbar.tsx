import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiClient } from '../api/client';
import { 
  Shield, LayoutDashboard, Link2, LogIn, UserPlus, LogOut, Menu, X, Wallet, MapPin, 
  Store, Sun, Moon, Laptop, HelpCircle, Phone, Code, ChevronDown, Settings, Scale,
  ShieldCheck, BookOpen, Sparkles, Gift, ArrowRight, ShoppingBag, Terminal, CheckCircle2,
  Star
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

  // Refs for outside clicks & hover delay debouncing
  const dropdownRef = useRef<HTMLDivElement>(null);
  const solutionsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  const solutionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trustTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  // Hover Handlers with safe 160ms mouseout buffer
  const handleSolutionsEnter = () => {
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    if (trustTimeoutRef.current) clearTimeout(trustTimeoutRef.current);
    setTrustOpen(false);
    setSolutionsOpen(true);
  };

  const handleSolutionsLeave = () => {
    solutionsTimeoutRef.current = setTimeout(() => {
      setSolutionsOpen(false);
    }, 160);
  };

  const handleTrustEnter = () => {
    if (trustTimeoutRef.current) clearTimeout(trustTimeoutRef.current);
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    setSolutionsOpen(false);
    setTrustOpen(true);
  };

  const handleTrustLeave = () => {
    trustTimeoutRef.current = setTimeout(() => {
      setTrustOpen(false);
    }, 160);
  };

  const handleUserMenuEnter = () => {
    if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
    setUserMenuOpen(true);
  };

  const handleUserMenuLeave = () => {
    userMenuTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, 180);
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

  // Close dropdowns on route change & clear pending timeouts
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setSolutionsOpen(false);
    setTrustOpen(false);

    return () => {
      if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
      if (trustTimeoutRef.current) clearTimeout(trustTimeoutRef.current);
      if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
    };
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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 shadow-sm text-slate-900 dark:text-white transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group shrink-0 focus:outline-none" 
              onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}
            >
              <img src={logoBlack} alt="HendAxis Trust Logo" className="h-10 sm:h-12 w-auto object-contain block dark:hidden group-hover:scale-102 transition-transform shrink-0" />
              <img src={logoWhite} alt="HendAxis Trust Logo" className="h-10 sm:h-12 w-auto object-contain hidden dark:block group-hover:scale-102 transition-transform shrink-0" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {isAuthenticated ? (
                <>
                  {user?.role === 'BUYER' ? (
                    <>
                      {navLink('/dashboard?tab=purchases', 'My Purchases', <ShoppingBag className="h-4 w-4 text-[#0363ff]" />)}
                      {navLink('/dashboard?tab=reviews', 'My Reviews', <Star className="h-4 w-4 text-amber-500 fill-amber-500" />)}
                      {navLink('/shops', 'Verified Shops', <Store className="h-4 w-4" />)}
                      <button
                        type="button"
                        onClick={() => setShowTrackModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <span>Track Order</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Primary Seller Navigation */}
                      {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                      {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4 text-[#ff6d1d]" />)}
                      {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                      {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                    </>
                  )}
                  
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

                  {/* Wallet Balance Badge (Hidden for pure buyers if 0/null) */}
                  {balance !== null && user?.role !== 'BUYER' && (
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

                  {/* Authenticated User Profile Dropdown (Hover + Click) */}
                  <div 
                    className="relative" 
                    ref={dropdownRef}
                    onMouseEnter={handleUserMenuEnter}
                    onMouseLeave={handleUserMenuLeave}
                  >
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
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Grouped Dropdown Menu Card */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* User Header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.username}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-[#0363ff]/10 border border-blue-200 dark:border-[#0363ff]/20 text-[10px] font-extrabold text-[#0363ff] dark:text-blue-400 uppercase tracking-wider">
                            <CheckCircle2 className="h-3 w-3 text-[#0363ff]" />
                            {user?.role || 'SELLER'}
                          </div>
                        </div>

                        {/* Section 1: Workspace & Settings */}
                        <div className="py-1 px-1 space-y-0.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                            {user?.role === 'BUYER' ? 'Buyer Hub' : 'Workspace'}
                          </p>
                          
                          {user?.role === 'BUYER' && (
                            <>
                              <Link
                                to="/dashboard?tab=purchases"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0363ff] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                              >
                                <ShoppingBag className="h-4 w-4 text-[#0363ff]" />
                                My Purchases & Orders
                              </Link>
                              <Link
                                to="/dashboard?tab=reviews"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                              >
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                My Reviews & Ratings
                              </Link>
                            </>
                          )}

                          {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT' || user?.role === 'MANAGER') && (
                            <Link
                              to="/admin-portal/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#ff6d1d] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
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
                            Profile & Account Settings
                          </Link>

                          <Link
                            to="/dashboard?tab=referrals"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 transition-colors"
                          >
                            <Gift className="h-4 w-4 text-purple-500" />
                            Refer & Earn Rewards
                          </Link>
                        </div>

                        {/* Section 2: Tools, Trust & Resources */}
                        <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 px-1 space-y-0.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">Platform & Trust</p>
                          
                          <Link
                            to="/how-it-works"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Sparkles className="h-4 w-4 text-[#ff6d1d]" />
                            How Escrow Works
                          </Link>

                          <Link
                            to="/trust-center"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0363ff] dark:text-blue-400 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-[#0363ff]" />
                            Trust & Security Center
                          </Link>

                          <Link
                            to="/developers"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Code className="h-4 w-4 text-slate-500" />
                            Developer APIs & SDK
                          </Link>

                          <button
                            type="button"
                            onClick={() => { setShowTrackModal(true); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                          >
                            <MapPin className="h-4 w-4 text-slate-500" />
                            Track Order Status
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowTermsModal(true); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer"
                          >
                            <Scale className="h-4 w-4 text-slate-500" />
                            Terms & Escrow Rules
                          </button>

                          <Link
                            to="/help"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <HelpCircle className="h-4 w-4 text-slate-500" />
                            Help Center & FAQ
                          </Link>
                        </div>

                        {/* Section 3: Logout */}
                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-1">
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
                  {/* Solutions Dropdown with Hover & Click */}
                  <div 
                    className="relative" 
                    ref={solutionsRef}
                    onMouseEnter={handleSolutionsEnter}
                    onMouseLeave={handleSolutionsLeave}
                  >
                    <button
                      onClick={() => { setSolutionsOpen(o => !o); setTrustOpen(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        solutionsOpen || location.pathname === '/for-sellers' || location.pathname === '/for-buyers' || location.pathname === '/shops' || location.pathname === '/developers'
                          ? 'text-[#0363ff] bg-blue-50 dark:bg-slate-800 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <span>Solutions</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${solutionsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {solutionsOpen && (
                      <div className="absolute left-0 mt-2 w-[480px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                        <div className="grid grid-cols-2 gap-2">
                          {/* For Buyers */}
                          <Link
                            to="/for-buyers"
                            onClick={() => setSolutionsOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-blue-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-blue-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#0363ff] flex items-center justify-center shrink-0">
                                <Shield className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0363ff] transition-colors">For Buyers</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              100% money-back escrow guarantee on social shopping
                            </p>
                          </Link>

                          {/* For Sellers */}
                          <Link
                            to="/for-sellers"
                            onClick={() => setSolutionsOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-orange-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-orange-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] flex items-center justify-center shrink-0">
                                <Store className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#ff6d1d] transition-colors">For Sellers</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              Zero delivery defaults & instant Mobile Money payouts
                            </p>
                          </Link>

                          {/* Verified Marketplace Directory */}
                          <Link
                            to="/shops"
                            onClick={() => setSolutionsOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-emerald-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <ShoppingBag className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Shop Directory</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              Explore verified Ghanaian stores & active escrow deals
                            </p>
                          </Link>

                          {/* Developer APIs & SDK */}
                          <Link
                            to="/developers"
                            onClick={() => setSolutionsOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-purple-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-purple-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <Terminal className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Developer API</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              REST API, webhooks & drop-in escrow checkout SDK
                            </p>
                          </Link>
                        </div>

                        {/* Bottom Banner */}
                        <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Need escrow fee estimation?</span>
                          <Link
                            to="/for-buyers"
                            onClick={() => setSolutionsOpen(false)}
                            className="text-[#0363ff] dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            View Fee Calculator <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trust & Resources Dropdown with Hover & Click */}
                  <div 
                    className="relative" 
                    ref={trustRef}
                    onMouseEnter={handleTrustEnter}
                    onMouseLeave={handleTrustLeave}
                  >
                    <button
                      onClick={() => { setTrustOpen(o => !o); setSolutionsOpen(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        trustOpen || location.pathname === '/how-it-works' || location.pathname === '/trust-center' || location.pathname === '/guides' || location.pathname === '/help' || location.pathname === '/contact'
                          ? 'text-[#0363ff] bg-blue-50 dark:bg-slate-800 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-[#0363ff]" />
                      <span>Trust & Resources</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${trustOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {trustOpen && (
                      <div className="absolute left-0 mt-2 w-[480px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                        <div className="grid grid-cols-2 gap-2">
                          {/* How Escrow Works */}
                          <Link
                            to="/how-it-works"
                            onClick={() => setTrustOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-orange-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-orange-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] flex items-center justify-center shrink-0">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#ff6d1d] transition-colors">How It Works</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              The 5-step escrow protection lifecycle explained
                            </p>
                          </Link>

                          {/* Trust & Security Center */}
                          <Link
                            to="/trust-center"
                            onClick={() => setTrustOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-emerald-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Trust Center</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              Bank vault security & Ghana Card KYC standards
                            </p>
                          </Link>

                          {/* Scam Prevention Hub */}
                          <Link
                            to="/guides"
                            onClick={() => setTrustOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-blue-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-blue-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#0363ff] flex items-center justify-center shrink-0">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0363ff] transition-colors">Safety Guides</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              Identify fake SMS alerts & social media scams
                            </p>
                          </Link>

                          {/* Help & FAQ */}
                          <Link
                            to="/help"
                            onClick={() => setTrustOpen(false)}
                            className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-purple-50/60 dark:hover:bg-slate-800/80 border border-transparent hover:border-purple-100 dark:hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <HelpCircle className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Help & FAQ</p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug pl-9">
                              Disputes, payouts, courier tracking & policies
                            </p>
                          </Link>
                        </div>

                        {/* Bottom Support Desk Bar */}
                        <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Live Support Online</span>
                          </div>
                          <Link
                            to="/contact"
                            onClick={() => setTrustOpen(false)}
                            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0363ff] dark:hover:text-white inline-flex items-center gap-1 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Contact Desk
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {navLink('/referrals', 'Refer & Earn', <Gift className="h-4 w-4 text-[#ff6d1d]" />)}
                  
                  <button
                    type="button"
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
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-5 space-y-4 shadow-2xl text-slate-900 dark:text-white animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Theme Switcher Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-2">
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
                  {user?.role === 'BUYER' ? (
                    <>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Buyer Hub</p>
                      {navLink('/dashboard?tab=purchases', 'My Purchases & Orders', <ShoppingBag className="h-4 w-4 text-[#0363ff]" />)}
                      {navLink('/dashboard?tab=reviews', 'My Reviews & Ratings', <Star className="h-4 w-4 text-amber-500 fill-amber-500" />)}
                      {navLink('/shops', 'Verified Shops Directory', <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />)}
                      {navLink('/dashboard?tab=referrals', 'Referrals & Rewards', <Gift className="h-4 w-4 text-purple-500" />)}
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Merchant Operations</p>
                      {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                      {navLink('/create-link', 'Create Payment Link', <Link2 className="h-4 w-4 text-[#ff6d1d]" />)}
                      {navLink('/links', 'My Payment Links', <Link2 className="h-4 w-4" />)}
                      {navLink('/dashboard?tab=referrals', 'Referrals & Rewards', <Gift className="h-4 w-4 text-purple-500" />)}
                      {navLink('/shops', 'Shops Directory', <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                    </>
                  )}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Trust & Support</p>
                  {navLink('/how-it-works', 'How Escrow Works', <Sparkles className="h-4 w-4 text-[#ff6d1d]" />)}
                  {navLink('/trust-center', 'Trust & Security Center', <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />)}
                  {navLink('/guides', 'Safety & Scam Prevention', <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />)}
                  {navLink('/developers', 'Developer APIs & SDK', <Code className="h-4 w-4 text-slate-600 dark:text-slate-400" />)}
                  <button
                    onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-slate-500" />
                    Track Order Status
                  </button>
                  {navLink('/help', 'Platform Help & FAQ', <HelpCircle className="h-4 w-4 text-slate-500" />)}
                  {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT' || user?.role === 'MANAGER') &&
                    navLink('/admin-portal/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-[#ff6d1d]" />)
                  }
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Account & Wallet</p>
                  {navLink('/profile', 'Profile & Payout Settings', <Settings className="h-4 w-4 text-slate-500" />)}
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
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

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.username}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Solutions</p>
                  {navLink('/for-buyers', 'For Buyers & Shoppers', <Shield className="h-4 w-4 text-[#0363ff]" />)}
                  {navLink('/for-sellers', 'For Sellers & Shops', <Store className="h-4 w-4 text-[#ff6d1d]" />)}
                  {navLink('/shops', 'Verified Shops Directory', <ShoppingBag className="h-4 w-4 text-emerald-500" />)}
                  {navLink('/developers', 'Developer APIs & SDK', <Terminal className="h-4 w-4 text-purple-500" />)}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-1">Trust & Support</p>
                  {navLink('/how-it-works', 'How Escrow Works', <Sparkles className="h-4 w-4 text-[#ff6d1d]" />)}
                  {navLink('/trust-center', 'Trust & Security Center', <ShieldCheck className="h-4 w-4 text-emerald-500" />)}
                  {navLink('/guides', 'Safety & Scam Prevention', <BookOpen className="h-4 w-4 text-blue-500" />)}
                  {navLink('/referrals', 'Refer & Earn Rewards', <Gift className="h-4 w-4 text-[#ff6d1d]" />)}
                  <button
                    onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-slate-500" />
                    Track Order Status
                  </button>
                  {navLink('/help', 'Platform Help & FAQ', <HelpCircle className="h-4 w-4 text-slate-500" />)}
                  {navLink('/contact', 'Contact Support', <Phone className="h-4 w-4 text-slate-500" />)}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  {navLink('/login', 'Log In to Account', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#0363ff] hover:bg-blue-600 transition-colors w-full justify-center shadow-lg"
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
