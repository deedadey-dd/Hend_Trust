import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiClient } from '../api/client';
import { 
  Shield, LayoutDashboard, Link2, LogIn, UserPlus, LogOut, Menu, X, Wallet, MapPin, 
  UserCircle, Store, Sun, Moon, Laptop, HelpCircle, Phone, Code 
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
  const [balance, setBalance] = useState<number | null>(null);

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

  // Hide navbar on checkout pages (clean buyer experience)
  if (location.pathname.startsWith('/l/')) return null;

  const [showTrackModal, setShowTrackModal] = useState(false);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLink = (to: string, label: string, icon: React.ReactNode) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${location.pathname === to
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
              <img src={logoBlack} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain block dark:hidden group-hover:scale-102 transition-transform" />
              <img src={logoWhite} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain hidden dark:block group-hover:scale-102 transition-transform" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') &&
                    navLink('/admin/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-amber-500" />)
                  }
                  {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                  {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4" />)}
                  {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                  {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                  
                  <button
                    onClick={() => setShowTrackModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </button>

                  {navLink('/help', 'Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                  {navLink('/developers', 'APIs', <Code className="h-4 w-4 text-emerald-400" />)}
                  {navLink('/profile', 'Profile', <UserCircle className="h-4 w-4" />)}
                  
                  <div className="w-px h-5 bg-slate-800 mx-1.5" />
                  
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                    >
                      <Wallet className="h-4 w-4" />
                      GHS {Number(balance).toFixed(2)}
                    </Link>
                  )}

                  {/* Theme Switcher Button (Icon Only - Direct Cycle) */}
                  <button
                    type="button"
                    onClick={cycleTheme}
                    className="p-2 mx-1 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition shadow-sm cursor-pointer"
                    title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
                  >
                    {theme === 'light' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : theme === 'dark' ? <Moon className="h-4.5 w-4.5 text-blue-400" /> : <Laptop className="h-4.5 w-4.5 text-slate-400" />}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {navLink('/shops', 'Shops', <Store className="h-4 w-4" />)}
                  <button
                    onClick={() => setShowTrackModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </button>
                  {navLink('/help', 'Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                  {navLink('/contact', 'Contact Us', <Phone className="h-4 w-4 text-emerald-400" />)}

                  {/* Theme Switcher Button (Icon Only - Direct Cycle) */}
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg ml-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Get Started Free
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2 shadow-2xl text-white">
            {/* Mobile Theme Switcher Bar */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-400">Theme Mode:</span>
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
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold transition ${
                        theme === t.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <IconComp className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {isAuthenticated ? (
              <>
                {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') &&
                  navLink('/admin/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-amber-500" />)
                }
                {navLink('/shops', 'Shops Marketplace', <Store className="h-4 w-4 text-blue-400" />)}
                {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4" />)}
                {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Track Order
                </button>
                {navLink('/help', 'Platform Guide & Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                {navLink('/profile', 'Profile Settings', <UserCircle className="h-4 w-4" />)}
                {balance !== null && (
                  <Link
                    to="/ledger"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 mt-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Wallet className="h-4 w-4" />
                    Balance: GHS {Number(balance).toFixed(2)}
                  </Link>
                )}
                <div className="pt-2 border-t border-slate-800 mt-2">
                  <p className="text-xs text-slate-400 mb-2 px-3">{user?.email}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                {navLink('/shops', 'Shops Marketplace', <Store className="h-4 w-4 text-blue-400" />)}
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Track Order
                </button>
                {navLink('/help', 'Platform Guide & Help', <HelpCircle className="h-4 w-4 text-blue-400" />)}
                {navLink('/contact', 'Contact Support', <Phone className="h-4 w-4 text-emerald-400" />)}
                <div className="pt-2 border-t border-slate-800 mt-2">
                  {navLink('/login', 'Log In', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors w-full mt-1 justify-center shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    Get Started Free
                  </Link>
                </div>
              </>
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
