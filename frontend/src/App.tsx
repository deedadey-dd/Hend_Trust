import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomeView from './views/HomeView';
import CreatePaymentLinkView from './views/CreatePaymentLinkView';
import PublicCheckoutView from './views/PublicCheckoutView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
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
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
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
        <Route path="/shops" element={<ShopsDirectoryView />} />
        <Route path="/directory" element={<ShopsDirectoryView />} />
        <Route path="/help" element={<HelpView />} />
        <Route path="/contact" element={<ContactView />} />

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
