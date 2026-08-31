import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiClient } from '../api/client';
import { 
  Shield, LayoutDashboard, Link2, LogIn, UserPlus, LogOut, Menu, X, Wallet, MapPin, 
  UserCircle, Store, Sun, Moon, Laptop, HelpCircle, Phone, Code, ChevronDown, Settings
} from 'lucide-react';
import TrackingModal from './TrackingModal';
import logoWhite from '../assets/hendaxis_trust_logo_white.svg';
import logoBlack from '../assets/hendaxis_trust_logo_black.svg';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${location.pathname === to
          ? 'bg-blue-600 text-white nav-blue-btn shadow-sm'
          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'}`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-md text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0" onClick={() => { setMenuOpen(false); setUserMenuOpen(false); }}>
              <img src={logoBlack} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain block dark:hidden group-hover:scale-102 transition-transform shrink-0" />
              <img src={logoWhite} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain hidden dark:block group-hover:scale-102 transition-transform shrink-0" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  {/* Streamlined Primary Seller Navigation */}
                  {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                  {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4 text-blue-400" />)}
                  {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                  {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                  
                  <div className="w-px h-5 bg-slate-800/80 mx-2" />

                  {/* Wallet Balance Badge */}
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center gap-1.5 px-3 py-1.5 mr-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition-colors border border-blue-500/20 shadow-sm"
                      title="View Wallet Ledger"
                    >
                      <Wallet className="h-4 w-4" />
                      GHS {Number(balance).toFixed(2)}
                    </Link>
                  )}

                  {/* User Profile & Tools Dropdown Pill */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setUserMenuOpen(o => !o)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all ${
                        userMenuOpen
                          ? 'bg-slate-200 dark:bg-slate-800 border-blue-500 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-600 !text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                        {(user?.name || user?.username || 'S')[0].toUpperCase()}
                      </div>
                      <span className="max-w-[110px] truncate">{user?.name || user?.username || 'Account'}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu Card */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-slate-800 dark:text-slate-200 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Account Header */}
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || user?.username}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                          <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {user?.role || 'SELLER'}
                          </div>
                        </div>

                        {/* Dropdown Menu Links */}
                        <div className="py-1 px-1 space-y-0.5">
                          {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') && (
                            <Link
                              to="/admin/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                              Manager Portal
                            </Link>
                          )}

                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            Profile & Payout Settings
                          </Link>

                          <Link
                            to="/developers"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            <Code className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            Developer APIs & SDK
                          </Link>

                          <button
                            onClick={() => { setShowTrackModal(true); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
                          >
                            <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            Track Order
                          </button>

                          <Link
                            to="/help"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            <HelpCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            Platform Help & Guides
                          </Link>
                        </div>

                        {/* Theme & Logout Section */}
                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-1 space-y-1">
                          <button
                            type="button"
                            onClick={cycleTheme}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {theme === 'light' ? <Sun className="h-4 w-4 text-amber-500" /> : theme === 'dark' ? <Moon className="h-4 w-4 text-blue-400" /> : <Laptop className="h-4 w-4 text-slate-500" />}
                              Theme Mode
                            </span>
                            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {theme}
                            </span>
                          </button>

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
                /* Unauthenticated Guest Navigation */
                <>
                  {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                  {navLink('/developers', 'APIs', <Code className="h-4 w-4 text-emerald-400" />)}
                  
                  <button
                    onClick={() => setShowTrackModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </button>
                  
                  {navLink('/help', 'Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                  {navLink('/contact', 'Contact Us', <Phone className="h-4 w-4 text-emerald-400" />)}

                  {/* Theme Switcher Button */}
                  <button
                    type="button"
                    onClick={cycleTheme}
                    className="p-2 mx-1 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition shadow-sm cursor-pointer"
                    title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
                  >
                    {theme === 'light' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : theme === 'dark' ? <Moon className="h-4.5 w-4.5 text-blue-400" /> : <Laptop className="h-4.5 w-4.5 text-slate-400" />}
                  </button>

                  <div className="w-px h-5 bg-slate-800 mx-1" />
                  {navLink('/login', 'Log In', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white nav-blue-btn bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg ml-1"
                  >
                    <UserPlus className="h-4 w-4 text-white" />
                    Get Started Free
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Toggle Button */}
            <button
              className="md:hidden p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle Navigation Menu"
            >
              {menuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-5 space-y-3 shadow-2xl text-white animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Theme Switcher Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-300">Theme Preference:</span>
              <div className="flex gap-1">
                {[
                  { id: 'light', label: 'Light', icon: Sun, color: 'text-amber-400' },
                  { id: 'dark', label: 'Dark', icon: Moon, color: 'text-blue-400' },
                  { id: 'system', label: 'System', icon: Laptop, color: 'text-slate-400' }
                ].map(t => {
                  const IconComp = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-1 font-semibold transition ${
                        theme === t.id
                          ? 'bg-blue-600 border-blue-500 !text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
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
                  {navLink('/create-link', 'Create Payment Link', <Link2 className="h-4 w-4 text-blue-400" />)}
                  {navLink('/links', 'My Payment Links', <Link2 className="h-4 w-4" />)}
                  {navLink('/shops', 'Shops Directory', <Store className="h-4 w-4 text-blue-400" />)}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">Developer & Tools</p>
                  {navLink('/developers', 'Developer APIs & SDK', <Code className="h-4 w-4 text-emerald-400" />)}
                  <button
                    onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Track Order Status
                  </button>
                  {navLink('/help', 'Platform Help & Guides', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                  {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') &&
                    navLink('/admin/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-amber-500" />)
                  }
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">Account & Wallet</p>
                  {navLink('/profile', 'Profile & Payout Settings', <UserCircle className="h-4 w-4" />)}
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20"
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

                <div className="pt-3 border-t border-slate-800">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-bold text-white truncate">{user?.name || user?.username}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                {navLink('/shops', 'Shops Marketplace', <Store className="h-4 w-4 text-blue-400" />)}
                {navLink('/developers', 'Developer APIs & SDK', <Code className="h-4 w-4 text-emerald-400" />)}
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Track Order Status
                </button>
                {navLink('/help', 'Platform Guide & Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                {navLink('/contact', 'Contact Support', <Phone className="h-4 w-4 text-emerald-400" />)}

                <div className="pt-3 border-t border-slate-800 mt-3 space-y-2">
                  {navLink('/login', 'Log In to Account', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors w-full justify-center shadow-lg"
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
    </>
  );
}
