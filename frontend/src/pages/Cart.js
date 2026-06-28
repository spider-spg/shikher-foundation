import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaShoppingCart, FaTrash, FaPlus, FaMinus, FaArrowLeft,
  FaShoppingBag, FaPhoneAlt, FaClock, FaExclamationTriangle, FaCheckCircle
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const NGO_PHONE = '+91-9324335478';

// ── Per-item expiry countdown ─────────────────────────────────────────────────
const ExpiryBadge = ({ reservedUntil }) => {
  const [label, setLabel] = useState('');
  const [warn,  setWarn]  = useState(false);

  useEffect(() => {
    if (!reservedUntil) return;
    const update = () => {
      const diff = new Date(reservedUntil).getTime() - Date.now();
      if (diff <= 0) { setLabel('Expired'); setWarn(true); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000)  / 60000);
      setWarn(d < 1);
      setLabel(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [reservedUntil]);

  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs mt-1 ${warn ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
      {warn ? <FaExclamationTriangle /> : <FaClock />} Reserved: {label}
    </span>
  );
};

// ── Main Cart ─────────────────────────────────────────────────────────────────
const Cart = () => {
  const [updatingQty, setUpdatingQty]     = useState({});
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [placingOrder, setPlacingOrder]   = useState(false);

  const { cartItems, totalAmount, totalItems, updateQuantity, removeFromCart, clearCart, loadCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    loadCart();
  }, [isAuthenticated, navigate, loadCart]);

  const handleQuantityChange = async (handbagId, newQty) => {
    if (newQty < 1) { handleRemove(handbagId); return; }
    setUpdatingQty(prev => ({ ...prev, [handbagId]: true }));
    try {
      const result = await updateQuantity(handbagId, newQty);
      if (result?.success === false) toast.error(result.message || 'Failed to update');
    } catch { toast.error('Failed to update quantity'); }
    finally { setUpdatingQty(prev => ({ ...prev, [handbagId]: false })); }
  };

  const handleRemove = async (handbagId) => {
    try { await removeFromCart(handbagId); }
    catch { toast.error('Failed to remove item'); }
  };

  const handlePlaceOrder = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setPlacingOrder(true);
    try {
      const res = await api.post('/orders/create-handbag', { phoneNumber });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to place order');
      toast.success('Order placed! Call the NGO to schedule pickup.');
      clearCart();
      navigate(`/order-success?orderId=${res.data.order.id}&orderType=handbag`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to place order');
    } finally { setPlacingOrder(false); }
  };

  const fmt = (p) => `₹${(p || 0).toLocaleString('en-IN')}`;

  if (!cartItems) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between mb-8">
          <Link to="/handbags" className="inline-flex items-center text-primary-600 hover:text-primary-700 gap-2">
            <FaArrowLeft /> Continue Shopping
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <FaShoppingCart className="mx-auto text-6xl text-gray-300 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-4">Your cart is empty</h3>
            <Link to="/handbags" className="btn-primary inline-flex items-center gap-2">
              <FaShoppingBag /> Browse Handbags
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Cart Items */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Cart Items ({totalItems})</h2>
                <span className="text-xs text-gray-400 flex items-center gap-1"><FaClock /> 7-day reservation</span>
              </div>

              <div className="divide-y divide-gray-100">
                {cartItems.map(item => {
                  const hb  = item.handbag || {};
                  const hbId = hb.id || hb._id;
                  return (
                    <div key={item.id} className="p-6">
                      <div className="flex items-center gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {hb.image ? (
                            <img src={hb.image} alt={hb.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                              <FaShoppingBag className="text-purple-400" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{hb.title || 'Item'}</p>
                          <p className="text-sm text-gray-500">{[hb.category, hb.color].filter(Boolean).join(' · ')}</p>
                          <p className="font-bold text-primary-600">{fmt(hb.price)}</p>
                          <ExpiryBadge reservedUntil={item.reservedUntil} />
                        </div>

                        {/* Qty */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleQuantityChange(hbId, item.quantity - 1)} disabled={item.quantity <= 1 || updatingQty[hbId]} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">
                            <FaMinus className="text-xs" />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">
                            {updatingQty[hbId]
                              ? <span className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                              : item.quantity}
                          </span>
                          <button onClick={() => handleQuantityChange(hbId, item.quantity + 1)} disabled={updatingQty[hbId]} className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">
                            <FaPlus className="text-xs" />
                          </button>
                        </div>

                        {/* Remove */}
                        <button onClick={() => handleRemove(hbId)} className="p-2 text-red-400 hover:text-red-600">
                          <FaTrash />
                        </button>
                      </div>

                      <div className="mt-2 pl-24 text-sm text-gray-500">
                        Subtotal: <strong>{fmt((hb.price || 0) * item.quantity)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm sticky top-8 p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-4">Order Summary</h2>

                <div className="flex justify-between text-gray-600"><span>Items ({totalItems})</span><span className="font-semibold">{fmt(totalAmount)}</span></div>
                <div className="flex justify-between text-gray-600"><span>No Shipping Cost</span><span className="font-semibold text-green-600">(Self Pickup)</span></div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary-600">{fmt(totalAmount)}</span>
                </div>

                {/* Pickup note */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <FaPhoneAlt className="inline mr-1" />
                  Pickup from NGO centre. <br></br>Call <PhoneLink phone={NGO_PHONE} showIcon={false} /> to schedule.
                  <span className="block text-xs mt-1 text-orange-700 font-bold">Payment collected at centre.</span>
                </div>

                {/* CTA */}
                {!showPhoneInput ? (
                  <button onClick={() => setShowPhoneInput(true)} className="w-full btn-primary flex items-center justify-center gap-2">
                    <FaShoppingCart /> Place Order
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Your phone number</label>
                    <div className="relative">
                      <FaPhoneAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowPhoneInput(false); setPhoneNumber(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={placingOrder || phoneNumber.length < 10}
                        className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {placingOrder
                          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing...</>
                          : <><FaCheckCircle /> Confirm Order</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

          
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;