import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaArrowLeft, FaShoppingCart, FaCheckCircle,
  FaTimes, FaExclamationTriangle, FaHandPaper
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const NGO_PHONE = '+91-9324335478';

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const AddToCartModal = ({ handbag, onConfirm, onCancel, loading }) => {
  if (!handbag) return null;
  const formatPrice = (p) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(p || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Add to Cart?</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Handbag summary */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-purple-100 flex-shrink-0">
              {handbag.imageData || handbag.image ? (
                <img src={handbag.imageData || handbag.image} alt={handbag.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FaHandPaper className="text-purple-400" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{handbag.title || handbag.name}</p>
              <p className="text-lg font-bold text-primary-600">{formatPrice(handbag.price)}</p>
            </div>
          </div>

          {/* Low stock warning */}
          {handbag.quantity <= 3 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
              <FaExclamationTriangle className="flex-shrink-0" />
              Only <strong>{handbag.quantity}</strong> left in stock!
            </div>
          )}

          {/* Reservation info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            🛒 This item will be <strong>reserved for 7 days</strong> in your cart.
            Place your order within 7 days or the item returns to stock.
          </div>

          {/* Pickup reminder */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            📍 Pickup from NGO centre · Payment collected on pickup · Call <PhoneLink phone={NGO_PHONE} showIcon={false} />
          </div>
        </div>

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
              <><FaCheckCircle /> Confirm</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
function HandbagDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();

  const [handbag, setHandbag]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [showConfirm, setShowConfirm]   = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => { fetchHandbagDetail(); }, [id]);

  const fetchHandbagDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/handbags/${id}`);
      setHandbag(response.data.handbag || response.data);
    } catch (error) {
      console.error('Error fetching handbag:', error);
      setError('Failed to load handbag details');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: click "Add to Cart" → validate then show modal
  const handleAddToCartClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    if (isAdmin && isAdmin()) {
      toast.error('Admins cannot purchase products');
      return;
    }
    if (!handbag?.quantity || handbag.quantity <= 0) {
      toast.error('This item is out of stock');
      return;
    }
    setShowConfirm(true);
  };

  // Step 2: user confirms → stock decrements via API
  const handleConfirmAddToCart = async () => {
    setAddingToCart(true);
    try {
      const result = await addToCart(handbag.id, 1);
      if (result?.success === false) {
        toast.error(result.message || 'Failed to add to cart');
        return;
      }
      toast.success('Added to cart! Reserved for 7 days.');
      setShowConfirm(false);
      // Reflect stock change locally
      setHandbag(prev => ({ ...prev, quantity: Math.max(0, (prev.quantity || 1) - 1) }));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(p || 0);

  if (loading) return <LoadingSpinner />;
  if (error)   return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!handbag) return <div className="text-center py-8">Handbag not found</div>;

  const isAvailable = handbag.quantity > 0 && handbag.isActive !== false;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-primary-600 hover:text-primary-700 mb-6 gap-2"
        >
          <FaArrowLeft /> Back
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex">
            {/* Image */}
            <div className="md:w-1/2">
              <div className="aspect-square bg-gray-100">
                {handbag.imageData || handbag.image ? (
                  <img
                    src={handbag.imageData || handbag.image}
                    alt={handbag.title || handbag.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <FaHandPaper className="text-6xl text-purple-300" />
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="md:w-1/2 p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {handbag.title || handbag.name}
              </h1>

              {handbag.designerName && (
                <p className="text-gray-500 mb-4">by {handbag.designerName}</p>
              )}

              <p className="text-3xl font-bold text-primary-600 mb-4">
                {formatPrice(handbag.price)}
              </p>

              {/* Stock status */}
              <div className="flex items-center gap-3 mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isAvailable ? `In Stock (${handbag.quantity} available)` : 'Out of Stock'}
                </span>
                {handbag.category && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    {handbag.category}
                  </span>
                )}
              </div>

              {/* Description */}
              {handbag.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{handbag.description}</p>
                </div>
              )}

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                {handbag.material && (
                  <div><span className="font-medium text-gray-700">Material:</span> <span className="text-gray-600">{handbag.material}</span></div>
                )}
                {handbag.color && (
                  <div><span className="font-medium text-gray-700">Color:</span> <span className="text-gray-600">{handbag.color}</span></div>
                )}
                {handbag.dimensions && (
                  <div className="col-span-2"><span className="font-medium text-gray-700">Dimensions:</span> <span className="text-gray-600">{handbag.dimensions}</span></div>
                )}
              </div>

              {/* Pickup note */}
              <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                📍 Items are picked up from the NGO centre. Payment at pickup.
                Call <PhoneLink phone={NGO_PHONE} showIcon={false} /> to schedule.
              </div>

              {/* CTA */}
              {isAdmin && isAdmin() ? (
                <Link
                  to={`/admin/handbags/${handbag.id}/edit`}
                  className="w-full btn-outline text-center block"
                >
                  Edit Handbag
                </Link>
              ) : isAvailable ? (
                <button
                  onClick={handleAddToCartClick}
                  className="w-full btn-primary flex items-center justify-center gap-3 text-lg py-3"
                >
                  <FaShoppingCart /> Add to Cart
                </button>
              ) : (
                <button disabled className="w-full bg-gray-200 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed">
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <AddToCartModal
          handbag={handbag}
          onConfirm={handleConfirmAddToCart}
          onCancel={() => setShowConfirm(false)}
          loading={addingToCart}
        />
      )}
    </div>
  );
}

export default HandbagDetail;