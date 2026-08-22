import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { Shield, LayoutDashboard, Link2, LogIn, UserPlus, LogOut, Menu, X, Wallet, MapPin, UserCircle, Store } from 'lucide-react';
import TrackingModal from './TrackingModal';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${location.pathname === to
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">
                Hend<span className="text-blue-600">Axis Trust</span>
              </span>
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </button>

                  {navLink('/profile', 'Profile', <UserCircle className="h-4 w-4" />)}
                  
                  <div className="w-px h-5 bg-gray-200 mx-2" />
                  
                  {balance !== null && (
                    <Link
                      to="/ledger"
                      className="flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <Wallet className="h-4 w-4" />
                      GHS {Number(balance).toFixed(2)}
                    </Link>
                  )}

                  <span className="text-sm text-gray-500 mr-2">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  {navLink('/login', 'Log In', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm ml-1"
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
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg">
            {isAuthenticated ? (
              <>
                {(user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT') &&
                  navLink('/admin/dashboard', 'Manager Portal', <Shield className="h-4 w-4 text-amber-500" />)
                }
                {navLink('/create-link', 'Create Link', <Link2 className="h-4 w-4" />)}
                {navLink('/links', 'My Links', <Link2 className="h-4 w-4" />)}
                {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Track Order
                </button>
                {navLink('/profile', 'Profile', <UserCircle className="h-4 w-4" />)}
                {balance !== null && (
                  <Link
                    to="/ledger"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 mt-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Wallet className="h-4 w-4" />
                    Balance: GHS {Number(balance).toFixed(2)}
                  </Link>
                )}
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <p className="text-xs text-gray-400 mb-2 px-3">{user?.email}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setShowTrackModal(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Track Order
                </button>
                <div className="pt-2 border-t border-gray-100 mt-2">
                  {navLink('/login', 'Log In', <LogIn className="h-4 w-4" />)}
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full mt-1"
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
