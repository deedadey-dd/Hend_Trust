import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreatePaymentLinkView from './views/CreatePaymentLinkView';
import PublicCheckoutView from './views/PublicCheckoutView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />

        {/* Dashboard Route */}
        <Route path="/dashboard/create-link" element={<CreatePaymentLinkView />} />
        
        {/* Public Checkout Route */}
        <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        
        {/* Default redirect for now */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
