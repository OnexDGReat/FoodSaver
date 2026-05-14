/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Layout } from './components/Layout';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { RestaurantDetail } from './pages/RestaurantDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Explore } from './pages/Explore';
import { OrderTracking } from './pages/OrderTracking';
import { Orders } from './pages/Orders';
import { AIRecommendations } from './pages/AIRecommendations';
import { CartProvider } from './context/CartContext';
import { Card } from './components/ui/Card';

import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Profile } from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { OrderManagerProvider } from './context/OrderManagerContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Using local Component to avoid import errors for ChevronRight in App.tsx
function ChevronRight(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}

export default function App() {
  const [hasOnboarded, setHasOnboarded] = useState(() => localStorage.getItem('foodsaver_onboarded') === 'true');

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <OrderManagerProvider>
            <CartProvider>
              <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/onboarding" element={<Onboarding onComplete={() => setHasOnboarded(true)} />} />
              
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    {hasOnboarded ? <Home /> : <Navigate to="/onboarding" replace />}
                  </ProtectedRoute>
                } 
              />
              <Route path="/restaurant/:id" element={<ProtectedRoute><RestaurantDetail /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/tracking" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/ai-picks" element={<ProtectedRoute><AIRecommendations /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </CartProvider>
      </OrderManagerProvider>
    </ToastProvider>
  </AuthProvider>
</Router>
);
}





