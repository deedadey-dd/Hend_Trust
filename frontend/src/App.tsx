import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiClient } from './api/client';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { initSentry } from './utils/sentry';
import { useAuthStore } from './store/authStore';

// Initialize frontend Sentry observability stub
initSentry();

// Core lightweight entry view
import HomeView from './views/HomeView';

// Code-split heavy routes with React.lazy
const CreatePaymentLinkView = lazy(() => import('./views/CreatePaymentLinkView'));
const PublicCheckoutView = lazy(() => import('./views/PublicCheckoutView'));
const LoginView = lazy(() => import('./views/LoginView'));
const RegisterView = lazy(() => import('./views/RegisterView'));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView'));
const ResetPasswordView = lazy(() => import('./views/ResetPasswordView'));
const ActivateAccountView = lazy(() => import('./views/ActivateAccountView'));
const DashboardView = lazy(() => import('./views/DashboardView'));
const LedgerView = lazy(() => import('./views/LedgerView').then(m => ({ default: m.LedgerView })));
const TrackingView = lazy(() => import('./views/TrackingView').then(m => ({ default: m.TrackingView })));
const LinksView = lazy(() => import('./views/LinksView').then(m => ({ default: m.LinksView })));
const ProfileView = lazy(() => import('./views/ProfileView'));
const SellerStoreView = lazy(() => import('./views/SellerStoreView'));
const ShopsDirectoryView = lazy(() => import('./views/ShopsDirectoryView'));
const ReviewsView = lazy(() => import('./views/ReviewsView'));
const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const HelpView = lazy(() => import('./views/HelpView').then(m => ({ default: m.HelpView })));
const ContactView = lazy(() => import('./views/ContactView').then(m => ({ default: m.ContactView })));
const DeveloperView = lazy(() => import('./views/DeveloperView'));
const DeveloperKeysView = lazy(() => import('./views/DeveloperKeysView'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-sm font-medium text-slate-400">Loading requested view...</p>
    </div>
  );
}

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
            username: data.username,
            is_superuser: Boolean(data.is_superuser),
            is_staff: Boolean(data.is_staff)
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
  const { isAuthenticated, user } = useAuthStore();
  const isAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'SUPPORT_AGENT' || user?.role === 'MANAGER';
  
  return (
    <ErrorBoundary>
      <Router>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={
              isAuthenticated 
                ? (isAdminOrAgent ? <Navigate to="/admin-portal/dashboard" replace /> : <Navigate to="/dashboard" replace />) 
                : <HomeView />
            } />
            <Route path="/login" element={<LoginView />} />
            <Route path="/register" element={<RegisterView />} />
            <Route path="/forgot-password" element={<ForgotPasswordView />} />
            <Route path="/reset-password" element={<ResetPasswordView />} />
            <Route path="/activate-account" element={<ActivateAccountView />} />
            <Route path="/shops" element={<ShopsDirectoryView />} />
            <Route path="/directory" element={<ShopsDirectoryView />} />
            <Route path="/reviews" element={<ReviewsView />} />
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
            <Route path="/admin-portal/dashboard" element={
              <ProtectedRoute><AdminDashboardView /></ProtectedRoute>
            } />
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
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
