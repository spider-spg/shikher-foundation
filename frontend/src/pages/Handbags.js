import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHandPaper, FaShoppingCart, FaTag, FaPlus,
  FaCheckCircle, FaTimes, FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

// ── Add to Cart Confirm Modal ─────────────────────────────────────────────────
const AddToCartModal = ({ handbag, onConfirm, onCancel, loading }) => {
  if (!handbag) return null;

  const formatPrice = (p) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(p || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Add to Cart?</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        {/* Handbag summary */}
        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-purple-100 flex-shrink-0">
              {handbag.imageData ? (
                <img src={handbag.imageData} alt={handbag.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FaHandPaper className="text-purple-400 text-xl" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{handbag.title}</p>
              {handbag.color && <p className="text-sm text-gray-500">{handbag.color}</p>}
              <p className="text-lg font-bold text-primary-600">{formatPrice(handbag.price)}</p>
            </div>
          </div>

          {/* Stock warning */}
          {handbag.quantity <= 3 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
              <FaExclamationTriangle className="flex-shrink-0" />
              Only <strong>{handbag.quantity}</strong> left in stock!
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            🛒 This item will be <strong>reserved for 7 days</strong> in your cart.
            Stock is held for you until you place your order or remove it.
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
            ) : (
              <><FaCheckCircle /> Add to Cart</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Handbags = () => {
  const [handbags, setHandbags]               = useState([]);
  const [filteredHandbags, setFilteredHandbags] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [sortBy, setSortBy]                   = useState('name');

  // Confirm modal state
  const [confirmHandbag, setConfirmHandbag]   = useState(null); // handbag to confirm
  const [addingToCart, setAddingToCart]       = useState(false);

  const { isAuthenticated, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => { fetchHandbags(); }, []);

  useEffect(() => {
    let filtered = [...handbags];
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':  return (a.price || 0) - (b.price || 0);
        case 'price-high': return (b.price || 0) - (a.price || 0);
        case 'newest':     return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'available':  return (b.quantity || 0) - (a.quantity || 0);
        default:           return (a.title || '').localeCompare(b.title || '');
      }
    });
    setFilteredHandbags(filtered);
  }, [handbags, sortBy]);

  const fetchHandbags = async () => {
    try {
      setLoading(true);
      const response = await api.get('/handbags');
      setHandbags(response.data.handbags || []);
    } catch (error) {
      console.error('Error fetching handbags:', error);
      toast.error('Failed to load handbags');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: user clicks "Add to Cart" → show confirm modal
  const handleAddToCartClick = (handbag) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    if (isAdmin()) {
      toast.error('Admins cannot purchase products');
      return;
    }
    if (!handbag.quantity || handbag.quantity <= 0) {
      toast.error('This item is out of stock');
      return;
    }
    setConfirmHandbag(handbag); // open modal
  };

  // Step 2: user confirms → call API (stock decrements here)
  const handleConfirmAddToCart = async () => {
    if (!confirmHandbag) return;
    setAddingToCart(true);
    try {
      const result = await addToCart(confirmHandbag.id, 1);
      if (result?.success === false) {
        toast.error(result.message || 'Failed to add to cart');
        return;
      }
      toast.success('Added to cart! Reserved for 7 days.');
      setConfirmHandbag(null);
      // Update local stock count optimistically
      setHandbags(prev => prev.map(h =>
        h.id === confirmHandbag.id ? { ...h, quantity: Math.max(0, (h.quantity || 1) - 1) } : h
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const isHandbagAvailable = (hb) => hb.quantity > 0;

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price || 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Handcrafted Handbags</h1>
              <p className="text-lg text-gray-600">Beautiful handmade bags. Each purchase supports our community.</p>
            </div>
            {isAuthenticated && !isAdmin() && (
              <div className="mt-4 sm:mt-0">
                <Link to="/orders" className="btn-outline inline-flex items-center gap-2">
                  <FaShoppingCart /> My Orders
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sort */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-left">
            <div className="w-full max-w-xs">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="name">Sort by Name</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="available">Most Available</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Showing {filteredHandbags.length} of {handbags.length} handbags</p>
          {isAdmin() && (
            <Link to="/admin/handbags/add" className="btn-primary inline-flex items-center gap-2">
              <FaPlus /> Add Handbag
            </Link>
          )}
        </div>

        {/* Grid */}
        {filteredHandbags.length === 0 ? (
          <div className="text-center py-12">
            <FaHandPaper className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Handbags Found</h3>
            <p className="text-gray-500">No handbags available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHandbags.map((handbag, index) => (
              <div key={handbag.id || `handbag-${index}`} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">

                {/* Image */}
                <div className="relative h-64 bg-gray-200 flex-shrink-0">
                  {handbag.imageData ? (
                    <img
                      src={handbag.imageData}
                      alt={handbag.title}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <FaHandPaper className="text-4xl text-purple-600" />
                    </div>
                  )}
                  {handbag.quantity <= 5 && handbag.quantity > 0 && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Only {handbag.quantity} left
                    </div>
                  )}
                  {handbag.quantity === 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <div className="mb-2">
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {handbag.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{handbag.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <FaTag className="mr-1" />
                      <span className="line-clamp-1">{handbag.color}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{handbag.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary-600">{formatPrice(handbag.price)}</span>
                      <span className="text-sm text-gray-600">Stock: {handbag.quantity}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    {!isAuthenticated ? (
                      <Link to="/login" className="w-full btn-outline text-center block">Login to Purchase</Link>
                    ) : isAdmin() ? (
                      <Link to={`/admin/handbags/${handbag.id}/edit`} className="w-full btn-outline text-center block">Edit Handbag</Link>
                    ) : !isHandbagAvailable(handbag) ? (
                      <button disabled className="w-full bg-red-100 text-red-800 py-2 px-4 rounded-lg font-semibold cursor-not-allowed">
                        Out of Stock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToCartClick(handbag)}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        <FaShoppingCart />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmHandbag && (
        <AddToCartModal
          handbag={confirmHandbag}
          onConfirm={handleConfirmAddToCart}
          onCancel={() => setConfirmHandbag(null)}
          loading={addingToCart}
        />
      )}
    </div>
  );
};

export default Handbags;