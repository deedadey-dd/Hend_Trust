import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logoWhite from '../../assets/hendaxis_trust_logo_white.svg';
import logoBlack from '../../assets/hendaxis_trust_logo_black.svg';
import { 
  LayoutDashboard, 
  WalletCards, 
  ListOrdered, 
  ShieldAlert, 
  LogOut
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/dashboard/transactions', icon: ListOrdered },
    { name: 'Wallet', path: '/dashboard/wallet', icon: WalletCards },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'SUPERUSER') {
    navItems.push({ name: 'Disputes', path: '/dashboard/disputes', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <img src={logoBlack} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain dark:hidden shrink-0" />
          <img src={logoWhite} alt="HendAxis Trust Logo" className="h-11 sm:h-14 w-auto object-contain hidden dark:block shrink-0" />
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center px-4 py-3 mb-2 text-sm font-medium text-slate-700">
            <div className="flex-1 min-w-0 truncate">
              <p className="truncate">{user?.email || 'user@example.com'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'Seller'}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <span className="text-xl font-bold text-blue-600">HendAxis Trust</span>
          {/* Add Mobile Menu Toggle Here later if needed */}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
