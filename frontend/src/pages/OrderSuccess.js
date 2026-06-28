import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaPhone,
  FaCalendarAlt,
  FaPrint,
  FaShoppingBag,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const NGO_PHONE   = '+91-9324335478';
const NGO_ADDRESS = 'Jhulelal Society, House No. 15, Sector 2B, Airoli, Navi Mumbai – 400708';
const NGO_MAP     = 'https://maps.app.goo.gl/qkcwEVqw5bcsnN3s7';

const OrderSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [order, setOrder]     = useState(null);
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();
  const { isAuthenticated }   = useAuth();

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!orderId)         { toast.error('Order ID not found'); navigate('/'); return; }
    fetchOrder();
  }, [isAuthenticated, orderId]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        toast.error('Order not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    try {
      let date;
      if (dateValue?.seconds)  date = new Date(dateValue.seconds * 1000);
      else if (dateValue?._seconds) date = new Date(dateValue._seconds * 1000);
      else date = new Date(dateValue);
      return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
    } catch { return '—'; }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(price || 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order Not Found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Success header ─────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <FaCheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Your order has been placed. Please coordinate with the NGO to schedule your pickup.
          </p>
        </div>

        {/* ── Receipt card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">

          {/* Header bar */}
          <div className="bg-primary-600 text-white p-6 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold mb-1">Order Receipt</h2>
              <p className="text-primary-100 text-sm font-mono">{order.orderNumber || `#${order.id?.slice(-8).toUpperCase()}`}</p>
              <p className="text-primary-100 text-sm">{formatDate(order.createdAt)}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
              <FaPrint /> Print
            </button>
          </div>

          {/* NGO Pickup instructions */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6">
            <div className="flex gap-3">
              <FaPhone className="text-amber-500 text-xl flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-1">
                  📞 Call the NGO to Schedule Pickup
                </h3>
                <p className="text-amber-700 text-sm mb-4">
                  Your order is reserved. Contact the NGO to arrange a convenient time to visit, pick up your items, and pay the amount.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">NGO Contact</p>
                    <PhoneLink phone={NGO_PHONE} className="font-bold text-gray-900 text-lg" />
                    <p className="text-sm text-gray-600 mt-1">Shikher Foundations</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pickup Address</p>
                    <p className="text-sm text-gray-700">{NGO_ADDRESS}</p>
                    <a
                      href={NGO_MAP}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mt-2"
                    >
                      <FaMapMarkerAlt /> View on Google Maps
                    </a>
                  </div>
                </div>
                {order.phoneNumber && (
                  <p className="text-sm text-amber-700 mt-3">
                    📱 We'll contact you on: <PhoneLink phone={order.phoneNumber} showIcon={false} className="font-medium" />
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaCalendarAlt className="text-gray-500" /> Pickup Steps
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl mb-1">✅</div>
                <p className="font-semibold text-green-800 text-sm">Order Placed</p>
                <p className="text-green-600 text-xs">Just now</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl mb-1">📞</div>
                <p className="font-semibold text-blue-800 text-sm">Call & Schedule</p>
                <p className="text-blue-600 text-xs">Contact NGO</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl mb-1">🛍️</div>
                <p className="font-semibold text-purple-800 text-sm">Pick Up & Pay</p>
                <p className="text-purple-600 text-xs">At the NGO</p>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Items Ordered</h3>
            <div className="space-y-3">
              {(order.items || []).map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total to Pay at Pickup</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* What to bring */}
          <div className="bg-gray-50 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">What to bring:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                This receipt (printed or screenshot)
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                Order ID: <span className="font-mono font-bold">{order.orderNumber || `#${order.id?.slice(-8).toUpperCase()}`}</span>
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                Valid ID for verification
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500 flex-shrink-0" />
                Cash / payment of <strong>{formatPrice(order.totalAmount)}</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/orders')}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <FaShoppingBag /> View My Orders
          </button>
          <button
            onClick={() => navigate('/handbags')}
            className="btn-primary flex items-center justify-center gap-2"
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccess;