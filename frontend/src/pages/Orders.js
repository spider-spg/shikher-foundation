import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { Link } from 'react-router-dom';
import {
  FaShoppingBag,
  FaCalendarAlt,
  FaRupeeSign,
  FaBox,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheck,
  FaClock,
  FaExclamationTriangle,
  FaTimesCircle,
  FaPhoneAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const NGO_PHONE = '+91-9324335478';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING_PICKUP: {
    icon: FaClock,
    color: 'bg-orange-100 text-orange-800',
    text: 'Awaiting Pickup'
  },
  PICKED_UP: {
    icon: FaCheck,
    color: 'bg-green-100 text-green-800',
    text: 'Picked Up'
  },
  EXPIRED: {
    icon: FaExclamationTriangle,
    color: 'bg-red-100 text-red-800',
    text: 'Expired'
  },
  CANCELLED: {
    icon: FaTimesCircle,
    color: 'bg-red-100 text-red-800',
    text: 'Cancelled'
  }
};

const getStatusBadge = (status) => {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG['PENDING_PICKUP'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon /> {cfg.text}
    </span>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateValue) => {
  try {
    let date;
    if (dateValue?.seconds)       date = new Date(dateValue.seconds * 1000);
    else if (dateValue?._seconds) date = new Date(dateValue._seconds * 1000);
    else                          date = new Date(dateValue);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0
  }).format(price || 0);

// ─── Order Details Modal ──────────────────────────────────────────────────────
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  const status = order.status || order.orderStatus;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Order – {order.orderNumber || `#${(order.id || '').slice(-8).toUpperCase()}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <FaTimesCircle className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Status banners */}
          {status === 'PENDING_PICKUP' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
              <FaPhoneAlt className="text-orange-500 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 mb-1">Ready for Pickup!</h4>
                <p className="text-sm text-orange-800">
                  Your order is confirmed. Please coordinate with the NGO at{' '}
                  <PhoneLink phone={NGO_PHONE} showIcon={false} className="text-orange-900 font-bold" /> to schedule your pickup.
                  Payment will be collected at the time of pickup.
                </p>
              </div>
            </div>
          )}

          {status === 'PICKED_UP' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-2 items-center text-sm text-green-800">
              <FaCheck className="flex-shrink-0" />
              Your order has been picked up. Thank you for your purchase!
            </div>
          )}

          {status === 'EXPIRED' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start text-sm text-red-700">
              <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
              This order expired as it was not picked up in time. Contact the NGO at{' '}
              <PhoneLink phone={NGO_PHONE} showIcon={false} className="text-red-700 font-bold" /> if you have questions.
            </div>
          )}

          {status === 'CANCELLED' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex gap-2 items-center text-sm text-gray-600">
              <FaTimesCircle className="flex-shrink-0" />
              This order was cancelled.
            </div>
          )}

          {/* Order info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Order Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono font-medium text-xs">{order.orderNumber || `#${(order.id || '').slice(-8).toUpperCase()}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Placed on</span>
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(status)}
                </div>
                {(order.phoneNumber || order.pickupPhone) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Your Phone</span>
                    <span className="font-medium"><PhoneLink phone={order.phoneNumber || order.pickupPhone} showIcon={false} /></span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">NGO Contact</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-2 font-bold text-gray-900">
                  <PhoneLink phone={NGO_PHONE} className="text-primary-600 font-bold text-base" />
                </p>
                <p className="text-xs text-gray-500">Call to schedule pickup &amp; pay at centre</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Items Ordered</h4>
            <div className="space-y-3">
              {(order.items || []).map((item, index) => {
                const handbag   = item.handbagData || item.handbag || {};
                const itemImage = item.image || handbag.image || handbag.imageData;
                const itemName  = item.title || handbag.name || handbag.title || 'Unknown Item';
                const itemPrice = item.price || handbag.price || 0;

                return (
                  <div key={index} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {itemImage ? (
                        <img src={itemImage} alt={itemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <FaShoppingBag className="text-purple-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{itemName}</p>
                      {handbag.category && (
                        <p className="text-xs text-gray-500">{handbag.category}</p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(itemPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900">
              Total (pay at pickup)
            </span>
            <span className="text-xl font-bold text-primary-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const Orders = () => {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy]           = useState('createdAt');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders
    .filter(order => {
      const s = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (order.orderNumber || '').toLowerCase().includes(s) ||
        order.items?.some(item =>
          (item.title || item.handbag?.title || '').toLowerCase().includes(s)
        );
      const orderStatus = order.status || order.orderStatus;
      const matchStatus = !statusFilter || orderStatus === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'totalAmount') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'status')
        return (a.status || '').localeCompare(b.status || '');
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Handbag Orders</h1>
          <p className="text-gray-500">Track and manage your orders</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders',    value: orders.length,                                                                         color: 'blue',   Icon: FaShoppingBag },
            { label: 'Awaiting Pickup', value: orders.filter(o => (o.status || o.orderStatus) === 'PENDING_PICKUP').length,           color: 'orange', Icon: FaClock },
            { label: 'Picked Up',       value: orders.filter(o => (o.status || o.orderStatus) === 'PICKED_UP').length,               color: 'green',  Icon: FaCheck },
            { label: 'Total Value',     value: formatPrice(orders.reduce((s, o) => s + (o.totalAmount || 0), 0)),                    color: 'purple', Icon: FaRupeeSign },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2 bg-${color}-100 rounded-full`}>
                <Icon className={`text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or order number..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none text-sm"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_PICKUP">Awaiting Pickup</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="totalAmount">Sort by Amount</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Orders list */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {orders.length === 0 ? 'No Orders Yet' : 'No Matching Orders'}
            </h3>
            <p className="text-gray-500 mb-6">
              {orders.length === 0
                ? 'Browse our handbag collection and place your first order!'
                : 'Try adjusting your filters'}
            </p>
            {orders.length === 0 && (
              <Link to="/handbags" className="btn-primary">Shop Handbags</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100">
            {filteredOrders.map((order, index) => {
              const status = order.status || order.orderStatus;
              return (
                <div key={order.id || index} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Top */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {order.orderNumber || `Order #${(order.id || '').slice(-8).toUpperCase()}`}
                        </h3>
                        {getStatusBadge(status)}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt /> {formatDate(order.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaBox /> {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <FaRupeeSign /> {formatPrice(order.totalAmount)}
                        </span>
                      </div>

                      {/* Item thumbnails */}
                      <div className="flex items-center gap-2">
                        {order.items?.slice(0, 3).map((item, i) => {
                          const img = item.image || item.handbag?.image;
                          return (
                            <div key={i} className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              {img ? (
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                                  <FaShoppingBag className="text-purple-500 text-xs" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {order.items?.length > 3 && (
                          <span className="text-xs text-gray-400">+{order.items.length - 3} more</span>
                        )}
                      </div>

                      {/* Pickup nudge */}
                      {status === 'PENDING_PICKUP' && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                          <FaPhoneAlt className="flex-shrink-0" />
                          Call NGO at <PhoneLink phone={NGO_PHONE} showIcon={false} /> to schedule pickup & pay
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="btn-outline inline-flex items-center gap-2 flex-shrink-0 text-sm"
                    >
                      <FaEye /> Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}

      </div>
    </div>
  );
};

export default Orders;