import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Books from './pages/Books';
import Handbags from './pages/Handbags';
import HandbagDetail from './pages/HandbagDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyShelf from './pages/MyShelf';
import Donate from './pages/Donate';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderTracking from './pages/OrderTracking';
import OrderSuccess from './pages/OrderSuccess';
import MyDonations from './pages/MyDonations';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBooks from './pages/admin/AdminBooks';
import AddBook from './pages/admin/AddBook';
import EditBook from './pages/admin/EditBook';
import BookDetails from './pages/admin/BookDetails';
import AdminHandbags from './pages/admin/AdminHandbags';
import AddHandbag from './pages/admin/AddHandbag';
import AdminBookRequests from './pages/admin/AdminBookRequests';
import AdminDonations from './pages/admin/AdminDonations';
import EditHandbag from './pages/admin/EditHandbag';
import HandbagDetails from './pages/admin/HandbagDetails';
import AdminOrders from './pages/admin/AdminOrders';

// Hooks
import { useAuth } from './context/AuthContext';

// App Layout Component
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRouteWrapper = ({ children, adminOnly = false }) => {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
};

// Public Route Wrapper
const PublicRouteWrapper = ({ children }) => {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};

// Auth Route Wrapper (redirect if already logged in)
const AuthRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin() ? '/admin/dashboard' : '/'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <div className="App">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { background: '#363636', color: '#fff' },
                  success: { duration: 3000 },
                  error: { duration: 5000 },
                }}
              />

              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicRouteWrapper><Home /></PublicRouteWrapper>} />
                <Route path="/about" element={<PublicRouteWrapper><About /></PublicRouteWrapper>} />
                <Route path="/books" element={<PublicRouteWrapper><Books /></PublicRouteWrapper>} />
                <Route path="/handbags" element={<PublicRouteWrapper><Handbags /></PublicRouteWrapper>} />
                <Route path="/handbags/:id" element={<PublicRouteWrapper><HandbagDetail /></PublicRouteWrapper>} />
                <Route path="/track/:trackingId" element={<PublicRouteWrapper><OrderTracking /></PublicRouteWrapper>} />

                {/* Auth Routes */}
                <Route path="/login" element={<AuthRouteWrapper><Login /></AuthRouteWrapper>} />
                <Route path="/signup" element={<AuthRouteWrapper><Signup /></AuthRouteWrapper>} />
                <Route path="/forgot-password" element={<AuthRouteWrapper><ForgotPassword /></AuthRouteWrapper>} />

                {/* Protected Customer Routes */}
                <Route path="/cart" element={<ProtectedRouteWrapper><Cart /></ProtectedRouteWrapper>} />
                <Route path="/checkout" element={<ProtectedRouteWrapper><Checkout /></ProtectedRouteWrapper>} />

                {/* MyShelf: book borrowing requests */}
                <Route path="/shelf" element={<ProtectedRouteWrapper><MyShelf /></ProtectedRouteWrapper>} />

                {/* /my-handbags redirects to /orders (handbag orders live there) */}
                <Route path="/my-handbags" element={<Navigate to="/orders" replace />} />

                <Route path="/donate" element={<ProtectedRouteWrapper><Donate /></ProtectedRouteWrapper>} />
                <Route path="/profile" element={<ProtectedRouteWrapper><Profile /></ProtectedRouteWrapper>} />
                <Route path="/orders" element={<ProtectedRouteWrapper><Orders /></ProtectedRouteWrapper>} />
                <Route path="/orders/:id" element={<ProtectedRouteWrapper><OrderDetail /></ProtectedRouteWrapper>} />
                <Route path="/order-success" element={<ProtectedRouteWrapper><OrderSuccess /></ProtectedRouteWrapper>} />
                <Route path="/my-donations" element={<ProtectedRouteWrapper><MyDonations /></ProtectedRouteWrapper>} />

                {/* Protected Admin Routes */}
                <Route path="/admin/dashboard" element={<ProtectedRouteWrapper adminOnly={true}><AdminDashboard /></ProtectedRouteWrapper>} />
                <Route path="/admin/books" element={<ProtectedRouteWrapper adminOnly={true}><AdminBooks /></ProtectedRouteWrapper>} />
                <Route path="/admin/books/add" element={<ProtectedRouteWrapper adminOnly={true}><AddBook /></ProtectedRouteWrapper>} />
                <Route path="/admin/books/:id/edit" element={<ProtectedRouteWrapper adminOnly={true}><EditBook /></ProtectedRouteWrapper>} />
                <Route path="/admin/books/:id" element={<ProtectedRouteWrapper adminOnly={true}><BookDetails /></ProtectedRouteWrapper>} />
                <Route path="/admin/handbags" element={<ProtectedRouteWrapper adminOnly={true}><AdminHandbags /></ProtectedRouteWrapper>} />
                <Route path="/admin/handbags/add" element={<ProtectedRouteWrapper adminOnly={true}><AddHandbag /></ProtectedRouteWrapper>} />
                <Route path="/admin/handbags/:id/edit" element={<ProtectedRouteWrapper adminOnly={true}><EditHandbag /></ProtectedRouteWrapper>} />
                <Route path="/admin/handbags/:id" element={<ProtectedRouteWrapper adminOnly={true}><HandbagDetails /></ProtectedRouteWrapper>} />

                {/* Handbag orders = AdminOrders. /admin/handbag-requests redirects there. */}
                <Route path="/admin/orders" element={<ProtectedRouteWrapper adminOnly={true}><AdminOrders /></ProtectedRouteWrapper>} />
                <Route path="/admin/handbag-requests" element={<Navigate to="/admin/orders" replace />} />

                <Route path="/admin/book-requests" element={<ProtectedRouteWrapper adminOnly={true}><AdminBookRequests /></ProtectedRouteWrapper>} />
                <Route path="/admin/donations" element={<ProtectedRouteWrapper adminOnly={true}><AdminDonations /></ProtectedRouteWrapper>} />

                {/* 404 */}
                <Route
                  path="*"
                  element={
                    <PublicRouteWrapper>
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                          <p className="text-xl text-gray-600 mb-8">Page not found</p>
                          <a href="/" className="btn-primary">Go Home</a>
                        </div>
                      </div>
                    </PublicRouteWrapper>
                  }
                />
              </Routes>
            </div>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;