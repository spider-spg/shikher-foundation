import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FaCheckCircle, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCalendarAlt,
  FaPrint,
  FaDownload,
  FaArrowLeft,
  FaShoppingBag
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const OrderSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { clearCart } = useCart();

  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!orderId) {
      toast.error('Order ID not found');
      navigate('/');
      return;
    }

    fetchOrder();
  }, [isAuthenticated, orderId, navigate]);

  // Clear cart once when component mounts
  useEffect(() => {
    if (orderId) {
      clearCart();
    }
  }, []); // Empty dependency array to run only once

  const fetchOrder = async () => {
    try {
      // Handle mock orders (for testing without payment)
      if (orderId.startsWith('ORDER_')) {
        const mockOrder = {
          id: orderId,
          createdAt: new Date().toISOString(),
          totalAmount: JSON.parse(localStorage.getItem('mockOrderTotal')) || 1000,
          phoneNumber: localStorage.getItem('mockOrderPhone') || '9999999999',
          pickupDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: JSON.parse(localStorage.getItem('mockOrderItems')) || [
            {
              title: 'Sample Handbag',
              quantity: 1,
              price: 1000,
              image: null
            }
          ],
          status: 'CONFIRMED'
        };
        
        // Clear mock data
        localStorage.removeItem('mockOrderTotal');
        localStorage.removeItem('mockOrderItems');
        localStorage.removeItem('mockOrderPhone');
        
        setOrder(mockOrder);
        setLoading(false);
        return;
      }

      const response = await api.get(`/orders/${orderId}`);
      if (response.data.success) {
        console.log('Fetched order data:', response.data.order);
        console.log('CreatedAt type and value:', typeof response.data.order.createdAt, response.data.order.createdAt);
        setOrder(response.data.order);
        
        // Update order status to PAID_PENDING_PICKUP
        await api.put(`/orders/${orderId}/status`, {
          status: 'PAID_PENDING_PICKUP'
        });
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

  const handlePrint = () => {
    window.print();
  };

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
        console.warn('Invalid date:', dateValue);
        return new Date().toLocaleDateString('en-IN');
      }
      
      return date.toLocaleDateString('en-IN');
    } catch (error) {
      console.error('Date formatting error:', error, dateValue);
      return new Date().toLocaleDateString('en-IN');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const getPickupDeadline = () => {
    try {
      if (!order?.createdAt) return 'Not available';
      
      let orderDate;
      if (order.createdAt?.seconds) {
        // Firestore timestamp
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (order.createdAt?._seconds) {
        // Alternative Firestore format
        orderDate = new Date(order.createdAt._seconds * 1000);
      } else {
        // Regular date
        orderDate = new Date(order.createdAt);
      }
      
      if (isNaN(orderDate.getTime())) {
        console.warn('Invalid order date:', order.createdAt);
        orderDate = new Date(); // Fallback to current date
      }
      
      const deadline = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      return deadline.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Pickup deadline calculation error:', error);
      return 'Please contact NGO';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <FaCheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your purchase. Your order has been confirmed and payment received.
          </p>
        </div>

        {/* Order Receipt */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-primary-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-2">Purchase Receipt</h2>
                <p className="text-primary-100">
                  Order ID: <span className="font-mono font-bold">{order.id}</span>
                </p>
                <p className="text-primary-100">
                  Order Date: {formatDate(order.createdAt)}
                </p>
              </div>
              <button
                onClick={handlePrint}
                className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <FaPrint />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>

          {/* Important Pickup Instructions */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
            <div className="flex items-start">
              <FaPhone className="text-yellow-400 text-xl mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  📞 IMPORTANT: Call Before Visit
                </h3>
                <p className="text-yellow-700 mb-3">
                  Please CALL the NGO before visiting to collect your order and confirm pickup timing.
                </p>
                <div className="bg-yellow-100 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Contact Information:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-yellow-800">Customer Details:</h5>
                      <p className="text-yellow-700">📞 Phone: {order.phoneNumber || order.shippingAddress?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-yellow-800">NGO Contact & Location:</h5>
                      <p className="text-yellow-700">📞 Phone: +91-9324335478</p>
                      <p className="text-yellow-700">🏢 Shikher Foundation Pickup Point*</p>
                      <p className="text-yellow-700">📍 Jhulelal Society, House no 15</p>
                      <p className="text-yellow-700">Sector 2B, Airoli, Navi Mumbai 400708</p>
                      <p className="text-red-700 text-sm font-semibold mt-1">*Call us before you come to pickup!</p>
                      <a 
                        href="https://maps.app.goo.gl/qkcwEVqw5bcsnN3s7" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-600 text-sm underline block mt-1"
                      >
                        📍 View Location on Google Maps
                      </a>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded-lg">
                    <p className="text-red-800 font-semibold">⏰ PICKUP DEADLINE: {getPickupDeadline()}</p>
                    <p className="text-red-700 text-sm">Orders not collected within 7 days will be processed for refund.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Timeline */}
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaCalendarAlt className="text-gray-600 mr-2" />
              Pickup Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">✅</div>
                <h4 className="font-semibold text-green-800">Payment Confirmed</h4>
                <p className="text-sm text-green-600">Just completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">📞</div>
                <h4 className="font-semibold text-blue-800">Call & Arrange</h4>
                <p className="text-sm text-blue-600">Call NGO to arrange pickup</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl mb-2">📦</div>
                <h4 className="font-semibold text-yellow-800">Collect Items</h4>
                <p className="text-sm text-yellow-600">
                  Deadline: {getPickupDeadline()}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-gray-600">Price: {formatPrice(item.price)} each</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Pickup Instructions */}
          <div className="bg-gray-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What to bring for pickup:
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <FaCheckCircle className="text-green-600 mr-2" />
                This receipt (printed or on phone)
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-600 mr-2" />
                Order ID: <span className="font-mono font-bold ml-1">{order.id}</span>
              </li>
              <li className="flex items-center">
                <FaCheckCircle className="text-green-600 mr-2" />
                Valid ID for verification
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Pro tip:</strong> The admin may send you an OTP for additional verification during pickup.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/orders')}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <FaShoppingBag />
            <span>View All Orders</span>
          </button>
          <button
            onClick={() => navigate('/handbags')}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <FaArrowLeft />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;