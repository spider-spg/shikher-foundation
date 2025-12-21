import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaSearch, 
  FaFilter,
  FaEye,
  FaEdit,
  FaSort,
  FaCalendarAlt,
  FaDollarSign,
  FaUser,
  FaBox,
  FaChartLine,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [orderOtps, setOrderOtps] = useState({}); // Store OTP per order
  
  const { isAdmin, user } = useAuth();

  // Auto-verify OTP when exactly 6 digits are entered
  useEffect(() => {
    if (otpInput.length === 6 && selectedOrder && showOtpInput && !updating[`verify_${selectedOrder.id || selectedOrder._id}`]) {
      const cleanOtp = otpInput.trim();
      console.log('Auto-verifying OTP:', cleanOtp);
      
      if (!/^\d+$/.test(cleanOtp)) {
        console.log('Auto-verify skipped: OTP contains non-digits');
        return;
      }
      
      // Small delay to ensure user finished typing
      const timer = setTimeout(() => {
        verifyPickupOTP(selectedOrder.id || selectedOrder._id, cleanOtp);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [otpInput, selectedOrder, showOtpInput, updating]);

  const orderStatuses = [
    'PAID_PENDING_PICKUP',
    'PICKED_UP',
    'EXPIRED',
    'CANCELLED'
  ];

  const dateFilterOptions = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 3 Months', value: '3months' },
    { label: 'This Year', value: 'year' }
  ];

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOrders();
    }
  }, [user?.role]); // Use user.role instead of isAdmin() function

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, statusFilter, dateFilter, sortBy]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/orders');
      console.log('Fetched orders:', response.data.orders);
      const orders = response.data.orders || [];
      console.log('Orders with IDs:', orders.map(order => ({ id: order.id, _id: order._id, orderNumber: order.orderNumber })));
      setOrders(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item => {
          const itemName = item.name || item.title || item.handbag?.name || item.handbag?.title || '';
          return itemName.toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by date
    if (dateFilter) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.createdAt) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(order => 
            new Date(order.createdAt) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(order => 
            new Date(order.createdAt) >= filterDate
          );
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          filtered = filtered.filter(order => 
            new Date(order.createdAt) >= filterDate
          );
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          filtered = filtered.filter(order => 
            new Date(order.createdAt) >= filterDate
          );
          break;
        default:
          break;
      }
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'orderNumber':
          return (a.orderNumber || '').localeCompare(b.orderNumber || '');
        case 'customer':
          return (a.user?.name || '').localeCompare(b.user?.name || '');
        case 'total':
          return (b.total || 0) - (a.total || 0);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'createdAt':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const checkAndExpireOrders = async () => {
    const now = new Date();
    const expiredOrders = orders.filter(order => {
      if ((order.orderStatus || order.status) !== 'PAID_PENDING_PICKUP') {
        return false;
      }
      const orderDate = new Date(order.createdAt);
      const daysSinceOrder = (now - orderDate) / (1000 * 60 * 60 * 24);
      return daysSinceOrder > 7;
    });

    if (expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        try {
          await api.put(`/admin/orders/${order.id || order._id}/status`, { status: 'EXPIRED' });
          console.log(`Auto-expired order ${order.orderNumber || order.id}`);
        } catch (error) {
          console.error(`Failed to expire order ${order.id}:`, error);
        }
      }
      // Refresh orders after expiring
      fetchOrders();
      if (expiredOrders.length > 0) {
        toast.success(`Auto-expired ${expiredOrders.length} overdue order(s)`);
      }
    }
  };

  // Auto-check for expired orders every 5 minutes
  useEffect(() => {
    if (orders.length > 0) {
      checkAndExpireOrders();
    }
    const interval = setInterval(checkAndExpireOrders, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [orders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    console.log('updateOrderStatus called with:', { orderId, newStatus });
    
    if (!orderId) {
      console.error('Order ID is undefined');
      toast.error('Order ID is missing');
      return;
    }
    
    setUpdating(prev => ({ ...prev, [orderId]: true }));

    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated successfully');
      
      // Clear OTP if manually confirming pickup
      if (newStatus === 'PICKED_UP') {
        setOrderOtps(prev => {
          const newOtps = { ...prev };
          delete newOtps[orderId];
          return newOtps;
        });
      }
      
      // Update order in state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          (order.id || order._id) === orderId
            ? { ...order, status: newStatus, orderStatus: newStatus }
            : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Pickup verification functions
  const sendPickupOTP = async (orderId) => {
    setUpdating(prev => ({ ...prev, [`otp_${orderId}`]: true }));

    try {
      const response = await api.post(`/admin/orders/${orderId}/send-pickup-otp`);
      if (response.data.success) {
        toast.success('OTP sent to customer successfully!');
        if (response.data.otp) {
          // Store OTP for this specific order and keep it until pickup is confirmed
          setOrderOtps(prev => ({ ...prev, [orderId]: response.data.otp }));
          toast.success(`OTP Generated: ${response.data.otp} (Share this with customer)`, { duration: 10000 });
        }
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setUpdating(prev => ({ ...prev, [`otp_${orderId}`]: false }));
    }
  };

  const verifyPickupOTP = async (orderId, otp) => {
    console.log('verifyPickupOTP called with:', { orderId, otp, otpLength: otp?.length });
    setUpdating(prev => ({ ...prev, [`verify_${orderId}`]: true }));

    try {
      const response = await api.post(`/admin/orders/${orderId}/verify-pickup`, { otp });
      if (response.data.success) {
        toast.success('Pickup verified successfully! Order marked as picked up.');
        // Clear OTP for this order after successful pickup
        setOrderOtps(prev => {
          const newOtps = { ...prev };
          delete newOtps[orderId];
          return newOtps;
        });
        // Update order status to PICKED_UP
        setOrders(prevOrders =>
          prevOrders.map(order =>
            (order.id || order._id) === orderId
              ? { ...order, status: 'PICKED_UP', orderStatus: 'PICKED_UP' }
              : order
          )
        );
        setSelectedOrder(prev => prev && (prev.id || prev._id) === orderId ? 
          { ...prev, status: 'PICKED_UP', orderStatus: 'PICKED_UP' } : prev);
        // Clear the input and hide OTP input
        setOtpInput('');
        setShowOtpInput(false);
      }
    } catch (error) {
      console.error('Error verifying pickup:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request data:', { orderId, otp });
      
      const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
      toast.error(`Verification failed: ${errorMessage}`);
    } finally {
      setUpdating(prev => ({ ...prev, [`verify_${orderId}`]: false }));
    }
  };

  const getAvailableStatuses = (currentStatus) => {
    // Once picked up, cannot go back to previous statuses
    if (currentStatus === 'PICKED_UP') {
      return ['PICKED_UP']; // Only allow current status
    }
    // For other statuses, allow normal transitions
    return orderStatuses;
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPickupDeadline = (orderDate) => {
    const deadline = new Date(new Date(orderDate).getTime() + 7 * 24 * 60 * 60 * 1000);
    return deadline;
  };

  const isOrderOverdue = (orderDate) => {
    const deadline = getPickupDeadline(orderDate);
    return new Date() > deadline;
  };

  const getDaysUntilDeadline = (orderDate) => {
    const deadline = getPickupDeadline(orderDate);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getOverdueOrders = () => {
    return orders.filter(order => 
      (order.status === 'CONFIRMED' || order.status === 'PAID_PENDING_PICKUP') && 
      isOrderOverdue(order.createdAt)
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID_PENDING_PICKUP':
        return 'bg-orange-100 text-orange-800';
      case 'PICKED_UP':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID_PENDING_PICKUP':
        return <FaBox className="text-orange-600" />;
      case 'PICKED_UP':
        return <FaCheckCircle className="text-green-600" />;
      case 'CANCELLED':
        return <FaTimesCircle className="text-red-600" />;
      case 'EXPIRED':
        return <FaClock className="text-gray-600" />;
      default:
        return <FaClock className="text-gray-600" />;
    }
  };

  // Calculate stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
  const pendingOrders = orders.filter(order => order.orderStatus === 'PAID_PENDING_PICKUP' || order.status === 'PAID_PENDING_PICKUP').length;
  const completedOrders = orders.filter(order => order.orderStatus === 'PICKED_UP' || order.status === 'PICKED_UP').length;

  const OrderDetailsModal = () => {
    if (!showOrderModal || !selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Order Details - {selectedOrder.orderNumber || `#${(selectedOrder.id || selectedOrder._id || 'UNKNOWN').slice(-8)}`}
              </h3>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setShowOtpInput(false);
                  setOtpInput('');
                }}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
                title="Close"
              >
                <FaTimesCircle className="text-2xl" />
              </button>
            </div>

            {/* Order Status & Actions */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(selectedOrder.orderStatus || selectedOrder.status)}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.orderStatus || selectedOrder.status)}`}>
                    {(selectedOrder.orderStatus || selectedOrder.status).charAt(0).toUpperCase() + (selectedOrder.orderStatus || selectedOrder.status).slice(1).replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={selectedOrder.orderStatus || selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id || selectedOrder._id, e.target.value)}
                    disabled={updating[selectedOrder.id || selectedOrder._id]}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {getAvailableStatuses(selectedOrder.orderStatus || selectedOrder.status).map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pickup Verification Section */}
            {selectedOrder.status === 'PAID_PENDING_PICKUP' && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                  <FaTruck className="mr-2" />
                  Pickup Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Order Information for Customer */}
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Order Information for Customer:</h5>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Order ID:</span> <span className="font-mono">{selectedOrder.orderNumber || `NGO-${(selectedOrder.id || selectedOrder._id || 'UNKNOWN').slice(-8).toUpperCase()}`}</span></p>
                      <p><span className="font-medium">Total Amount:</span> {formatPrice(selectedOrder.totalAmount || selectedOrder.total || 0)}</p>
                      <p><span className="font-medium">Customer:</span> {selectedOrder.userData?.name || selectedOrder.user?.name || selectedOrder.shippingAddress?.fullName || 'Unknown'}</p>
                    </div>
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      💡 Customer should present this Order ID and a valid ID for pickup
                    </div>
                  </div>

                  {/* OTP Verification */}
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">OTP Verification (Optional):</h5>
                    
                    {orderOtps[selectedOrder.id || selectedOrder._id] && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Generated OTP:</strong> 
                          <span className="font-mono text-lg ml-2 text-yellow-900">{orderOtps[selectedOrder.id || selectedOrder._id]}</span>
                        </div>
                        <div className="text-xs text-yellow-600 mt-1">
                          Share this OTP with the customer for pickup verification
                        </div>
                        <div className="text-xs text-yellow-500 mt-1">
                          Generated: {new Date().toLocaleString()} (Valid for 15 minutes)
                        </div>
                      </div>
                    )}
                    
                    {!showOtpInput ? (
                      <button
                        onClick={() => {
                          sendPickupOTP(selectedOrder.id || selectedOrder._id);
                          setShowOtpInput(true);
                        }}
                        disabled={updating[`otp_${selectedOrder.id || selectedOrder._id}`]}
                        className="w-full btn-secondary text-sm flex items-center justify-center space-x-2"
                      >
                        {updating[`otp_${selectedOrder.id || selectedOrder._id}`] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                            <span>Sending OTP...</span>
                          </>
                        ) : (
                          <>
                            <FaCheckCircle />
                            <span>Send OTP to Customer</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs text-green-600 font-medium">
                          ✅ OTP sent to customer
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Enter 6-digit OTP from customer"
                            value={otpInput}
                            onChange={(e) => {
                              // Allow only numbers and limit to 6 digits
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setOtpInput(value);
                              console.log('OTP input changed to:', value);
                            }}
                            onPaste={(e) => {
                              // Handle paste events properly
                              e.preventDefault();
                              const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                              setOtpInput(pastedText);
                            }}
                            onKeyDown={(e) => {
                              // Handle Enter key to verify OTP
                              if (e.keyCode === 13) {
                                const cleanOtp = otpInput.trim();
                                console.log('Enter pressed with OTP:', cleanOtp);
                                
                                if (cleanOtp.length >= 4 && /^\d+$/.test(cleanOtp)) {
                                  verifyPickupOTP(selectedOrder.id || selectedOrder._id, cleanOtp);
                                } else {
                                  toast.error('Please enter a valid numeric OTP');
                                }
                                return;
                              }
                              // Allow backspace, delete, arrow keys, tab, Enter
                              if ([8, 9, 13, 27, 46, 37, 38, 39, 40].includes(e.keyCode) || 
                                  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                  (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode))) {
                                return;
                              }
                              // Allow numbers 0-9
                              if ((e.keyCode >= 48 && e.keyCode <= 57) || 
                                  (e.keyCode >= 96 && e.keyCode <= 105)) {
                                return;
                              }
                              // Prevent other keys
                              e.preventDefault();
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-center tracking-wider"
                            maxLength="6"
                            autoComplete="off"
                            spellCheck="false"
                          />
                          <button
                            onClick={() => {
                              const cleanOtp = otpInput.trim();
                              console.log('Verify button clicked with OTP:', cleanOtp, 'Length:', cleanOtp.length);
                              
                              if (!cleanOtp) {
                                toast.error('Please enter an OTP');
                                return;
                              }
                              
                              if (cleanOtp.length < 4) {
                                toast.error('OTP must be at least 4 digits');
                                return;
                              }
                              
                              if (!/^\d+$/.test(cleanOtp)) {
                                toast.error('OTP must contain only numbers');
                                return;
                              }
                              
                              verifyPickupOTP(selectedOrder.id || selectedOrder._id, cleanOtp);
                            }}
                            disabled={!otpInput || updating[`verify_${selectedOrder.id || selectedOrder._id}`]}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            {updating[`verify_${selectedOrder.id || selectedOrder._id}`] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              'Verify'
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowOtpInput(false);
                            setOtpInput('');
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel OTP verification
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Pickup Confirmation */}
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Manual Pickup Confirmation</p>
                      <p className="text-xs text-green-600">Use this if customer doesn't have phone or OTP fails</p>
                    </div>
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id || selectedOrder._id, 'PICKED_UP')}
                      disabled={updating[selectedOrder.id || selectedOrder._id]}
                      className="btn-success text-sm flex items-center space-x-2"
                    >
                      <FaCheckCircle />
                      <span>Confirm Pickup</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pickup Deadline Warning */}
            {selectedOrder.status === 'PAID_PENDING_PICKUP' && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <FaClock className="text-yellow-500 mr-2 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Pickup Deadline</p>
                    <p className="text-xs text-yellow-600">
                      Customer has 7 days from order date to pickup. After that, order will be marked as EXPIRED.
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Order Date: {formatDate(selectedOrder.createdAt)} | 
                      Deadline: {formatDate(new Date(new Date(selectedOrder.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrder.userData?.name || selectedOrder.user?.name || selectedOrder.shippingAddress?.fullName || 'Unknown'}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.userData?.email || selectedOrder.user?.email || selectedOrder.userEmail || 'No email'}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.phoneNumber || selectedOrder.shippingAddress?.phone || 'N/A'}</p>
                  {(selectedOrder.phoneNumber || selectedOrder.shippingAddress?.phone) && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 text-xs">📞 Contact customer for pickup coordination</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Shipping Address</h4>
                <div className="text-sm text-gray-600">
                  {selectedOrder.shippingAddress ? (
                    <>
                      <p>{selectedOrder.shippingAddress.fullName}</p>
                      <p>{selectedOrder.shippingAddress.address}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                      <p>{selectedOrder.shippingAddress.zipCode}</p>
                      <p>{selectedOrder.shippingAddress.phone}</p>
                    </>
                  ) : (
                    <p>No shipping address provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-3">
                              {(item.image || item.handbagData?.image || item.handbagData?.imageData) ? (
                                <img
                                  src={item.image || item.handbagData?.image || item.handbagData?.imageData}
                                  alt={item.name || item.title || 'Item'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center" style={{display: (item.image || item.handbagData?.image || item.handbagData?.imageData) ? 'none' : 'flex'}}>
                                <FaShoppingCart className="text-purple-600" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.name || item.title || item.handbag?.name || item.handbag?.title || 'Unknown Item'}</p>
                              <p className="text-xs text-gray-500">{item.category || 'Handbag'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatPrice(item.price)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.totalAmount || selectedOrder.total || 0)}</span>
                </div>
                {selectedOrder.shipping && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatPrice(selectedOrder.shipping)}</span>
                  </div>
                )}
                {selectedOrder.tax && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatPrice(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(selectedOrder.totalAmount || selectedOrder.total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Order Timeline</h4>
              <div className="text-sm text-gray-600">
                <p><span className="font-medium">Order Date:</span> {formatDate(selectedOrder.createdAt)}</p>
                {selectedOrder.updatedAt !== selectedOrder.createdAt && (
                  <p><span className="font-medium">Last Updated:</span> {formatDate(selectedOrder.updatedAt)}</p>
                )}
                <p><span className="font-medium">Payment Status:</span> {selectedOrder.paymentStatus || 'Pending'}</p>
                {selectedOrder.paymentId && (
                  <p><span className="font-medium">Payment ID:</span> {selectedOrder.paymentId}</p>
                )}
              </div>
            </div>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Orders</h1>
            <p className="text-gray-600">View and manage customer orders</p>
          </div>
        </div>

        {/* Overdue Orders Alert */}
        {getOverdueOrders().length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>⚠️ {getOverdueOrders().length} order(s) are overdue for pickup!</strong>
                </p>
                <p className="text-xs text-red-600 mt-1">
                  These orders have exceeded the 7-day pickup deadline. Please contact customers or process refunds.
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => setStatusFilter('CONFIRMED')}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                  >
                    View Overdue Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaShoppingCart className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaDollarSign className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaCheckCircle className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order number, customer, or product..."
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
                  <option value="">All Statuses</option>
                  {orderStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Dates</option>
                  {dateFilterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <div className="relative">
                <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="createdAt">Sort by Date</option>
                  <option value="orderNumber">Sort by Order Number</option>
                  <option value="customer">Sort by Customer</option>
                  <option value="total">Sort by Total</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FaShoppingCart className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Orders Found</h3>
            <p className="text-gray-500">
              {orders.length === 0 
                ? 'No orders have been placed yet'
                : 'Try adjusting your search filters'
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id || order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </div>
                          {order.paymentId && (
                            <div className="text-xs text-gray-400">
                              Payment: {order.paymentId.substring(0, 12)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.userData?.name || order.user?.name || order.shippingAddress?.fullName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.userData?.email || order.user?.email || order.userEmail || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.items?.slice(0, 2).map((item, index) => {
                            return item.name || item.title || item.handbag?.name || item.handbag?.title || 'Unknown Item';
                          }).join(', ')}
                          {order.items?.length > 2 && '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatPrice(order.totalAmount || order.total || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.orderStatus || order.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus || order.status)}`}>
                            {(order.orderStatus || order.status).charAt(0).toUpperCase() + (order.orderStatus || order.status).slice(1).replace(/_/g, ' ')}
                          </span>
                        </div>
                        {/* Pickup Deadline Warning */}
                        {((order.orderStatus || order.status) === 'CONFIRMED' || (order.orderStatus || order.status) === 'PAID_PENDING_PICKUP') && (
                          <div className="mt-1">
                            {isOrderOverdue(order.createdAt) ? (
                              <div className="text-xs text-red-600 font-medium">
                                ⚠️ OVERDUE
                              </div>
                            ) : getDaysUntilDeadline(order.createdAt) <= 2 ? (
                              <div className="text-xs text-orange-600 font-medium">
                                ⏰ {getDaysUntilDeadline(order.createdAt)} days left
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                📅 {getDaysUntilDeadline(order.createdAt)} days left
                              </div>
                            )}
                          </div>
                        )}
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id || order._id, e.target.value)}
                          disabled={updating[order._id]}
                          className="mt-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {getAvailableStatuses(order.status).map(status => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOrderClick(order)}
                          className="text-blue-600 hover:text-blue-700"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        <OrderDetailsModal />
      </div>
    </div>
  );
};

export default AdminOrders;