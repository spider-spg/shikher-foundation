import React, { useState, useEffect } from 'react';
import PhoneLink from '../../components/PhoneLink';
import {
  FaShoppingBag, FaSearch, FaFilter, FaUser,
  FaCalendarAlt, FaRupeeSign, FaBox,
  FaCheck, FaTimes, FaClock, FaExclamationTriangle,
  FaTimesCircle, FaPhoneAlt, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';


const STATUS_CONFIG = {
  PAID_PENDING_PICKUP: { color: 'bg-orange-100 text-orange-800', text: 'Awaiting Pickup', icon: FaClock },
  PENDING_PICKUP:      { color: 'bg-orange-100 text-orange-800', text: 'Awaiting Pickup', icon: FaClock },
  PICKED_UP:           { color: 'bg-green-100 text-green-800',   text: 'Picked Up',       icon: FaCheck },
  EXPIRED:             { color: 'bg-red-100 text-red-800',       text: 'Expired',         icon: FaExclamationTriangle },
  CANCELLED:           { color: 'bg-gray-100 text-gray-800',     text: 'Cancelled',       icon: FaTimesCircle },
};

const AdminOrders = () => {
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState({});
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded]         = useState({});

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') fetchOrders();
  }, [user?.role]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (updating[orderId]) return;
    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.text || newStatus}`);
      setOrders(prev => prev.map(o =>
        (o.id || o._id) === orderId
          ? { ...o, orderStatus: newStatus, status: newStatus }
          : o
      ));
    } catch (error) {
      console.error('Update order status error:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { color: 'bg-gray-100 text-gray-800', text: status || 'Unknown', icon: FaClock };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon /> {cfg.text}
      </span>
    );
  };

  const getActionButtons = (order) => {
    const orderId = order.id || order._id;
    const status  = order.orderStatus || order.status;
    const busy    = updating[orderId];

    const btn = (label, newStatus, colorClass) => (
      <button
        key={newStatus}
        onClick={() => handleUpdateStatus(orderId, newStatus)}
        disabled={busy}
        className={`inline-flex items-center px-3 py-1.5 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
      >
        {busy ? <FaClock className="mr-1 animate-spin" /> : null}
        {label}
      </button>
    );

    switch (status) {
      case 'PAID_PENDING_PICKUP':
      case 'PENDING_PICKUP':
        return (
          <div className="flex flex-wrap gap-2">
            {btn('Mark Picked Up', 'PICKED_UP', 'bg-green-600 hover:bg-green-700')}
            {btn('Mark Expired',   'EXPIRED',   'bg-yellow-600 hover:bg-yellow-700')}
            {btn('Cancel Order',   'CANCELLED', 'bg-red-600 hover:bg-red-700')}
          </div>
        );
      default:
        return null;
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (dateValue) => {
    try {
      let date;
      if (dateValue?.seconds)        date = new Date(dateValue.seconds * 1000);
      else if (dateValue?._seconds)  date = new Date(dateValue._seconds * 1000);
      else                           date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return 'N/A'; }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price || 0);

  const filtered = orders.filter(order => {
    const status = order.orderStatus || order.status;
    const matchesStatus = !statusFilter || status === statusFilter;
    const searchLower   = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (order.orderNumber || '').toLowerCase().includes(searchLower) ||
      (order.userData?.name || '').toLowerCase().includes(searchLower) ||
      (order.userData?.email || '').toLowerCase().includes(searchLower) ||
      order.items?.some(item => (item.title || '').toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  // Stats
  const stats = {
    total:   orders.length,
    pending: orders.filter(o => (o.orderStatus || o.status) === 'PENDING_PICKUP').length,
    picked:  orders.filter(o => (o.orderStatus || o.status) === 'PICKED_UP').length,
    expired: orders.filter(o => (o.orderStatus || o.status) === 'EXPIRED').length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Manage Handbag Orders</h1>
          <p className="text-gray-600">Review orders and coordinate pickups with customers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',           value: stats.total,   color: 'blue',   icon: FaShoppingBag },
            { label: 'Awaiting Pickup', value: stats.pending, color: 'orange', icon: FaPhoneAlt },
            { label: 'Picked Up',       value: stats.picked,  color: 'green',  icon: FaCheck },
            { label: 'Expired',         value: stats.expired, color: 'red',    icon: FaExclamationTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
              <div className={`p-2 bg-${color}-100 rounded-full`}><Icon className={`text-${color}-600`} /></div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, or item..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_PICKUP">Awaiting Pickup</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaShoppingBag className="mx-auto text-5xl text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No orders found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const orderId = order.id || order._id;
              const status  = order.orderStatus || order.status;
              const isOpen  = expanded[orderId];

              return (
                <div key={orderId} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {order.orderNumber || `Order #${orderId.slice(-8).toUpperCase()}`}
                          </h3>
                          {getStatusBadge(status)}
                        </div>

                        {/* Customer info */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                          {order.userData && (
                            <span className="flex items-center gap-1">
                              <FaUser /> {order.userData.name || order.userData.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FaCalendarAlt /> {formatDate(order.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FaBox /> {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-gray-700">
                            <FaRupeeSign /> {formatPrice(order.totalAmount)}
                          </span>
                        </div>

                        {/* Customer phone */}
                        {(order.phoneNumber || order.pickupPhone) && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                            Customer: <PhoneLink phone={order.phoneNumber || order.pickupPhone} />
                          </p>
                        )}

                        {/* Action buttons */}
                        {getActionButtons(order)}
                      </div>

                      <button
                        onClick={() => toggleExpand(orderId)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                      >
                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {order.items?.map((item, i) => {
                          const img  = item.image || item.imageData;
                          const name = item.title || 'Unknown Item';
                          return (
                            <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                {img ? (
                                  <img src={img} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                                    <FaShoppingBag className="text-purple-400 text-xs" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{name}</p>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity} · {formatPrice(item.price * item.quantity)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Customer contact reminder for admin */}
                      {status === 'PENDING_PICKUP' && (
                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                          <FaPhoneAlt className="inline mr-2" />
                          Call customer at{' '}
                          {(order.phoneNumber || order.pickupPhone) ? (
                            <PhoneLink phone={order.phoneNumber || order.pickupPhone} showIcon={false} className="text-orange-900 font-bold" />
                          ) : (
                            <strong>number not provided</strong>
                          )}{' '}
                          to schedule pickup and collect payment.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;