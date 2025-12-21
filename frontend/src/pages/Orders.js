import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingBag, 
  FaCalendarAlt, 
  FaRupeeSign, 
  FaBox,
  FaSearch,
  FaFilter,
  FaEye,
  FaTruck,
  FaCheck,
  FaClock,
  FaExclamationTriangle,
  FaTimesCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Clear any existing mock orders from localStorage on component mount
      const clearMockOrders = () => {
        const mockOrderKeys = Object.keys(localStorage).filter(key => key.startsWith('mockOrder_'));
        mockOrderKeys.forEach(key => localStorage.removeItem(key));
        // Also remove temporary order data
        localStorage.removeItem('mockOrderTotal');
        localStorage.removeItem('mockOrderItems');
        localStorage.removeItem('mockOrderPhone');
        if (mockOrderKeys.length > 0) {
          console.log('Cleared mock orders from localStorage');
        }
      };
      
      clearMockOrders();
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch real orders from API only
      const response = await api.get('/orders');
      const realOrders = response.data.orders || [];
      
      // Sort by creation date (newest first)
      realOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Ensure OTP data is preserved in orders
      const ordersWithOTP = realOrders.map(order => {
        // Debug OTP timestamp format
        if (order.pickupOTP) {
          console.log('OTP data for order:', order.id || order._id, {
            otp: order.pickupOTP.otp,
            expiresAt: order.pickupOTP.expiresAt,
            generatedAt: order.pickupOTP.generatedAt,
            expiresAtType: typeof order.pickupOTP.expiresAt,
            generatedAtType: typeof order.pickupOTP.generatedAt
          });
        }
        return {
          ...order,
          // Ensure pickupOTP is included if available
          pickupOTP: order.pickupOTP || null
        };
      });
      
      setOrders(ordersWithOTP);
    } catch (error) {
      console.error('Error fetching orders from API:', error);
      // Don't show error for network timeouts or server errors
      if (!error.message?.includes('timeout') && !error.message?.includes('Network Error') && error.response?.status !== 500) {
        toast.error('Failed to load orders from database');
      } else {
        console.warn('Backend server not available - no orders will be displayed');
      }
      setOrders([]); // Show empty orders if API fails
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: FaClock,
        color: 'bg-yellow-100 text-yellow-800',
        text: 'Pending'
      },
      confirmed: {
        icon: FaCheck,
        color: 'bg-blue-100 text-blue-800',
        text: 'Confirmed'
      },
      'PAID_PENDING_PICKUP': {
        icon: FaTruck,
        color: 'bg-orange-100 text-orange-800',
        text: 'Ready for Pickup'
      },
      'PICKED_UP': {
        icon: FaCheck,
        color: 'bg-green-100 text-green-800',
        text: 'Picked Up'
      },
      shipped: {
        icon: FaTruck,
        color: 'bg-purple-100 text-purple-800',
        text: 'Shipped'
      },
      delivered: {
        icon: FaCheck,
        color: 'bg-green-100 text-green-800',
        text: 'Delivered'
      },
      'EXPIRED': {
        icon: FaExclamationTriangle,
        color: 'bg-red-100 text-red-800',
        text: 'Expired'
      },
      cancelled: {
        icon: FaExclamationTriangle,
        color: 'bg-red-100 text-red-800',
        text: 'Cancelled'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="mr-1" />
        {config.text}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const status = paymentStatus?.toLowerCase();
    const statusConfig = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        text: 'Payment Pending'
      },
      completed: {
        color: 'bg-green-100 text-green-800',
        text: 'Payment Completed'
      },
      paid: {
        color: 'bg-green-100 text-green-800', 
        text: 'Payment Completed'
      },
      mock: {
        color: 'bg-green-100 text-green-800',
        text: 'Payment Completed'
      },
      failed: {
        color: 'bg-red-100 text-red-800',
        text: 'Payment Failed'
      },
      refunded: {
        color: 'bg-gray-100 text-gray-800',
        text: 'Refunded'
      }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const filteredAndSortedOrders = orders
    .filter(order => {
      const orderId = order._id || order.id || '';
      const matchesSearch = orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.items?.some(item => {
                             const itemName = item.handbag?.name || item.handbag?.title || item.title || '';
                             return itemName.toLowerCase().includes(searchTerm.toLowerCase());
                           });
      
      const matchesStatus = statusFilter === '' || order.orderStatus === statusFilter || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'createdAt':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'totalAmount':
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case 'status':
          return (a.orderStatus || a.status || '').localeCompare(b.orderStatus || b.status || '');
        default:
          return 0;
      }
    });

  const formatDate = (dateValue) => {
    try {
      let date;
      if (dateValue?.seconds) {
        // Firestore timestamp
        date = new Date(dateValue.seconds * 1000);
      } else if (dateValue?._seconds) {
        // Alternative Firestore format
        date = new Date(dateValue._seconds * 1000);
      } else {
        // Regular date string or object
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in formatDate:', dateValue);
        return 'Date not available';
      }
      
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error in Orders:', error, dateValue);
      return 'Date not available';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Order Details - {selectedOrder.orderNumber || `#${(selectedOrder._id || selectedOrder.id || 'UNKNOWN').slice(-8).toUpperCase()}`}
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  const currentOrderId = selectedOrder.id || selectedOrder._id;
                  await fetchOrders();
                  // Find and update selected order with fresh data
                  setTimeout(() => {
                    const updatedOrder = orders.find(order => (order.id || order._id) === currentOrderId);
                    if (updatedOrder) {
                      console.log('Refreshed order data:', updatedOrder.pickupOTP);
                      setSelectedOrder(updatedOrder);
                    }
                  }, 100);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                title="Refresh to check for OTP"
              >
                <FaClock className="mr-1" />
                Refresh OTP
              </button>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
                title="Close"
              >
                <FaTimesCircle className="text-2xl" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* OTP Section - Show OTP if available for pickup */}
            {selectedOrder.pickupOTP && selectedOrder.pickupOTP.otp && 
             (selectedOrder.orderStatus || selectedOrder.status) === 'PAID_PENDING_PICKUP' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {/* Check if OTP is expired */}
                {(() => {
                  try {
                    const now = new Date();
                    let expiryTime;
                    
                    if (selectedOrder.pickupOTP.expiresAt) {
                      if (selectedOrder.pickupOTP.expiresAt.seconds) {
                        // Firestore timestamp
                        expiryTime = new Date(selectedOrder.pickupOTP.expiresAt.seconds * 1000);
                      } else if (selectedOrder.pickupOTP.expiresAt._seconds) {
                        // Alternative Firestore format
                        expiryTime = new Date(selectedOrder.pickupOTP.expiresAt._seconds * 1000);
                      } else {
                        // Regular date
                        expiryTime = new Date(selectedOrder.pickupOTP.expiresAt);
                      }
                      
                      const isExpired = now > expiryTime;
                      
                      if (isExpired) {
                        return (
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex-shrink-0">
                              <FaExclamationTriangle className="text-red-600 text-lg" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-red-900">OTP Expired</h4>
                              <p className="text-sm text-red-700">This OTP has expired. Please ask the admin to send a new one.</p>
                            </div>
                          </div>
                        );
                      }
                    }
                    
                    return (
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <FaCheck className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900">Pickup OTP Received</h4>
                          <p className="text-sm text-blue-700">Show this OTP to the NGO volunteer during pickup</p>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    console.log('OTP expiry check error:', e);
                    // Default to showing active OTP if there's an error
                    return (
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <FaCheck className="text-blue-600 text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900">Pickup OTP Received</h4>
                          <p className="text-sm text-blue-700">Show this OTP to the NGO volunteer during pickup</p>
                        </div>
                      </div>
                    );
                  }
                })()}
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Pickup OTP</div>
                    <div className="text-3xl font-bold text-blue-600 font-mono tracking-widest">
                      {selectedOrder.pickupOTP.otp}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {selectedOrder.pickupOTP.expiresAt && (
                        <span>
                          Expires: {(() => {
                            try {
                              let expiryDate;
                              if (selectedOrder.pickupOTP.expiresAt.seconds) {
                                // Firestore timestamp
                                expiryDate = new Date(selectedOrder.pickupOTP.expiresAt.seconds * 1000);
                              } else if (selectedOrder.pickupOTP.expiresAt._seconds) {
                                // Alternative Firestore format
                                expiryDate = new Date(selectedOrder.pickupOTP.expiresAt._seconds * 1000);
                              } else {
                                // Regular date string or object
                                expiryDate = new Date(selectedOrder.pickupOTP.expiresAt);
                              }
                              return expiryDate.toLocaleString();
                            } catch (e) {
                              console.log('Expiry date parsing error:', e, selectedOrder.pickupOTP.expiresAt);
                              return '15 minutes from generation';
                            }
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Generated: {(() => {
                        try {
                          let genDate;
                          if (selectedOrder.pickupOTP.generatedAt) {
                            if (selectedOrder.pickupOTP.generatedAt.seconds) {
                              // Firestore timestamp
                              genDate = new Date(selectedOrder.pickupOTP.generatedAt.seconds * 1000);
                            } else if (selectedOrder.pickupOTP.generatedAt._seconds) {
                              // Alternative Firestore format
                              genDate = new Date(selectedOrder.pickupOTP.generatedAt._seconds * 1000);
                            } else {
                              // Regular date
                              genDate = new Date(selectedOrder.pickupOTP.generatedAt);
                            }
                          } else {
                            // Fallback to current time or expiry - 15 minutes
                            if (selectedOrder.pickupOTP.expiresAt) {
                              let expiryMs;
                              if (selectedOrder.pickupOTP.expiresAt.seconds) {
                                expiryMs = selectedOrder.pickupOTP.expiresAt.seconds * 1000;
                              } else {
                                expiryMs = new Date(selectedOrder.pickupOTP.expiresAt).getTime();
                              }
                              genDate = new Date(expiryMs - (15 * 60 * 1000));
                            } else {
                              genDate = new Date();
                            }
                          }
                          return genDate.toLocaleString();
                        } catch (e) {
                          console.log('Generation date parsing error:', e, selectedOrder.pickupOTP);
                          return 'Recently';
                        }
                      })()}
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>Important:</strong> Please have this OTP ready when the NGO volunteer arrives for pickup. 
                    Keep this order details page open or take a screenshot.
                  </div>
                </div>
              </div>
            )}
            
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium">{selectedOrder.orderNumber || `#${(selectedOrder._id || selectedOrder.id || 'UNKNOWN').slice(-8)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span>{getStatusBadge(selectedOrder.orderStatus || selectedOrder.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment:</span>
                    <span>{getPaymentStatusBadge(selectedOrder.paymentStatus)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Shipping Address</h4>
                <div className="text-sm text-gray-600">
                  {selectedOrder.shippingAddress ? (
                    <div className="space-y-1">
                      <div>{selectedOrder.shippingAddress.fullName}</div>
                      <div>{selectedOrder.shippingAddress.street}</div>
                      <div>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</div>
                      <div>{selectedOrder.shippingAddress.zipCode}</div>
                      <div>{selectedOrder.shippingAddress.phone}</div>
                    </div>
                  ) : (
                    <div>Default shipping address</div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => {
                  const handbag = item.handbagData || item.handbag || item || {};
                  const itemImage = item.image || handbag.image || handbag.imageData || handbag.imageUrl;
                  const itemName = handbag.name || handbag.title || item.title || 'Unknown Item';
                  const itemCategory = handbag.category || 'Handbag';
                  const itemColor = handbag.color || 'N/A';
                  const itemPrice = item.price || handbag.price || 0;
                  
                  return (
                  <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center" style={{display: itemImage ? 'none' : 'flex'}}>
                        <FaShoppingBag className="text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900">{itemName}</h5>
                      <p className="text-sm text-gray-600">{itemCategory} • {itemColor}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
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

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-semibold text-gray-900 mb-4">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">Included</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-primary-600">
                      {formatPrice(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            {selectedOrder.trackingNumber && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Tracking Information</h4>
                <p className="text-sm text-blue-800">
                  Tracking Number: <span className="font-medium">{selectedOrder.trackingNumber}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Orders</h1>
          <p className="text-lg text-gray-600">
            Track and manage your handbag orders
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaShoppingBag className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaCheck className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => (o.orderStatus || o.status) === 'PICKED_UP' || (o.orderStatus || o.status) === 'delivered').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaTruck className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => (o.orderStatus || o.status) === 'PAID_PENDING_PICKUP' || (o.orderStatus || o.status) === 'shipped').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaRupeeSign className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders by ID or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="PAID_PENDING_PICKUP">Ready for Pickup</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="createdAt">Sort by Date</option>
                <option value="totalAmount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredAndSortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {orders.length === 0 ? 'No Orders Yet' : 'No Orders Found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {orders.length === 0 
                ? "You haven't placed any orders yet. Start shopping for beautiful handbags!"
                : 'Try adjusting your search filters'
              }
            </p>
            {orders.length === 0 && (
              <Link to="/handbags" className="btn-primary">
                Shop Handbags
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 gap-1">
              {filteredAndSortedOrders.map((order, index) => (
                <div key={order._id || order.id || `order-${index}`} className="p-6 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.orderNumber || `Order #${(order.id || order._id || 'UNKNOWN').slice(-8)}`}
                        </h3>
                        {order.isMockOrder && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Demo Order
                          </span>
                        )}
                        {getStatusBadge(order.orderStatus || order.status)}
                        {getPaymentStatusBadge(order.paymentStatus || order.paymentMethod)}
                        {/* OTP Available Indicator */}
                        {order.pickupOTP && order.pickupOTP.otp && 
                         (order.orderStatus || order.status) === 'PAID_PENDING_PICKUP' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <FaCheck className="mr-1" />
                            OTP Ready
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <FaCalendarAlt className="mr-2" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaBox className="mr-2" />
                          <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaRupeeSign className="mr-2" />
                          <span className="font-semibold text-gray-900">
                            {formatPrice(order.totalAmount)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Order Items Preview */}
                      <div className="flex items-center space-x-2 mb-4">
                        {order.items.slice(0, 3).map((item, index) => {
                          const handbag = item.handbag || item || {};
                          const itemImage = handbag.image || handbag.imageUrl || item.image;
                          const itemName = handbag.name || handbag.title || item.title || 'Unknown Item';
                          
                          return (
                          <div key={index} className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={itemName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                                <FaShoppingBag className="text-purple-600 text-xs" />
                              </div>
                            )}
                          </div>
                          );
                        })}
                        {order.items.length > 3 && (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          {order.items.slice(0, 2).map((item, index) => {
                            const handbag = item.handbag || item || {};
                            return handbag.name || handbag.title || item.title || 'Unknown Item';
                          }).join(', ')}
                          {order.items.length > 2 && '...'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="btn-outline inline-flex items-center space-x-2"
                      >
                        <FaEye />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && <OrderDetailsModal />}
      </div>
    </div>
  );
};

export default Orders;