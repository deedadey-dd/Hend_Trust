import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from './api/client';
import Navbar from './components/Navbar';
import HomeView from './views/HomeView';
import CreatePaymentLinkView from './views/CreatePaymentLinkView';
import PublicCheckoutView from './views/PublicCheckoutView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import ForgotPasswordView from './views/ForgotPasswordView';
import ResetPasswordView from './views/ResetPasswordView';
import ActivateAccountView from './views/ActivateAccountView';
import DashboardView from './views/DashboardView';
import { LedgerView } from './views/LedgerView';
import { TrackingView } from './views/TrackingView';
import { LinksView } from './views/LinksView';
import ProfileView from './views/ProfileView';
import SellerStoreView from './views/SellerStoreView';
import ShopsDirectoryView from './views/ShopsDirectoryView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { HelpView } from './views/HelpView';
import { ContactView } from './views/ContactView';
import DeveloperView from './views/DeveloperView';
import DeveloperKeysView from './views/DeveloperKeysView';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isHydrated, login } = useAuthStore();
  const [checking, setChecking] = useState(!isAuthenticated);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      setChecking(true);
      apiClient.get('/profile/')
        .then((res: any) => {
          const data = res.data;
          login('', {
            id: data.id,
            role: data.role || 'SELLER',
            email: data.email || '',
            name: data.username || data.first_name,
            username: data.username
          });
        })
        .catch(() => {
          /* Session cookie invalid or expired */
        })
        .finally(() => {
          setChecking(false);
        });
    } else if (isAuthenticated) {
      setChecking(false);
    }
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated || checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-400">Verifying session...</p>
      </div>
    );
  }

  return (isAuthenticated && user) ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomeView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/forgot-password" element={<ForgotPasswordView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="/activate-account" element={<ActivateAccountView />} />
        <Route path="/shops" element={<ShopsDirectoryView />} />
        <Route path="/directory" element={<ShopsDirectoryView />} />
        <Route path="/help" element={<HelpView />} />
        <Route path="/contact" element={<ContactView />} />
        <Route path="/developers" element={<DeveloperView />} />
        <Route path="/docs/api" element={<DeveloperView />} />

        {/* Public Checkout (no navbar shown) */}
        <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        <Route path="/track" element={<TrackingView />} />
        <Route path="/store/:username" element={<SellerStoreView />} />
        <Route path="/seller/:username" element={<SellerStoreView />} />

        {/* Protected Seller & Manager Dashboards */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute><AdminDashboardView /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardView /></ProtectedRoute>
        } />
        <Route path="/dashboard/developer" element={
          <ProtectedRoute><DeveloperKeysView /></ProtectedRoute>
        } />
        <Route path="/create-link" element={
          <ProtectedRoute><CreatePaymentLinkView /></ProtectedRoute>
        } />
        <Route path="/ledger" element={<ProtectedRoute><LedgerView /></ProtectedRoute>} />
        <Route path="/links" element={<ProtectedRoute><LinksView /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />

        {/* Default: home for authenticated, login for guests */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
