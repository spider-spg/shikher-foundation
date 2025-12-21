import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaShoppingCart, 
  FaTrash, 
  FaPlus, 
  FaMinus, 
  FaArrowLeft,
  FaCreditCard,
  FaRupeeSign,
  FaShoppingBag,
  FaCheck
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api, { getImageUrl } from '../utils/api';

const Cart = () => {
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [updatingQuantity, setUpdatingQuantity] = useState({});
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({ fullName: '', address: '', city: '', state: '', zipCode: '' });
  
  const { 
    cartItems, 
    totalAmount, 
    totalItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    loadCart 
  } = useCart();
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [isAuthenticated, navigate, loadCart]);

  const handleQuantityUpdate = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingQuantity(prev => ({ ...prev, [itemId]: true }));
    
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error) {
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingQuantity(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveFromCart = async (itemId) => {
    try {
      await removeFromCart(itemId);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleConfirmOrder = () => {
    if (!cartItems || cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setShowShippingForm(true);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existing = document.querySelector("script[src='https://checkout.razorpay.com/v1/checkout.js']");
      if (existing) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreateOrderAndPay = async () => {
    // Validate shipping info
    const required = ['fullName', 'address', 'city', 'state', 'zipCode'];
    for (const f of required) {
      if (!shippingAddress[f]) {
        toast.error(`${f} is required`);
        return;
      }
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessingPayment(true);
    try {
      // Create order on backend which will also create Razorpay order
      const payload = {
        shippingAddress: {
          ...shippingAddress,
          phone: phoneNumber
        },
        paymentMethod: 'razorpay'
      };

      const res = await api.post('/orders/create', payload);
      if (!res.data || !res.data.success) {
        throw new Error(res.data?.message || 'Failed to create order');
      }

      const razorpayOrder = res.data.razorpayOrder;
      const createdOrder = res.data.order;

      // Load Razorpay script
      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error('Failed to load Razorpay SDK');
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || window.__RAZORPAY_KEY_ID__,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency || 'INR',
        name: 'Shikher Foundation',
        description: 'Purchase from Shikher Foundation',
        image: '',
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post(`/orders/${createdOrder.id}/verify-payment`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data && verifyRes.data.success) {
              toast.success('Payment successful');
              clearCart();
              navigate(`/order-success?orderId=${createdOrder.id}`);
            } else {
              toast.error('Payment verification failed');
            }
          } catch (e) {
            console.error('Payment verification error:', e);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name || user?.email || '',
          email: user?.email || '',
          contact: phoneNumber
        },
        notes: {
          orderId: createdOrder.id
        },
        theme: {
          color: '#3399cc'
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response);
        toast.error('Payment failed');
      });

      rzp1.open();

    } catch (error) {
      console.error('Create order and pay error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create order');
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/handbags"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Continue Shopping
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {!cartItems || cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <FaShoppingCart className="mx-auto text-6xl text-gray-300 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-4">
              Your cart is empty
            </h3>
            <p className="text-gray-500 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link to="/handbags" className="btn-primary inline-flex items-center space-x-2">
              <FaShoppingBag />
              <span>Start Shopping</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Cart Items ({totalItems})
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={item.id || item._id} className="p-6">
                      <div className="flex items-center space-x-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                          {item.handbag.image || item.handbag.imageData ? (
                            <img
                              src={item.handbag.image || item.handbag.imageData}
                              alt={item.handbag.title || item.handbag.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center" style={{ display: (item.handbag.image || item.handbag.imageData) ? 'none' : 'flex' }}>
                            <FaShoppingBag className="text-purple-600" />
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {item.handbag.title || item.handbag.name || 'Unnamed Product'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.handbag.category && item.handbag.color 
                              ? `${item.handbag.category} • ${item.handbag.color}`
                              : item.handbag.category || item.handbag.color || 'No details available'
                            }
                          </p>
                          <p className="text-lg font-bold text-primary-600 mt-2">
                            {formatPrice(item.handbag.price)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityUpdate(item.handbag._id || item.handbag.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingQuantity[item.handbag._id || item.handbag.id]}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaMinus className="text-sm" />
                          </button>
                          
                          <span className="w-12 text-center font-semibold">
                            {updatingQuantity[item.handbag._id || item.handbag.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mx-auto"></div>
                            ) : (
                              item.quantity
                            )}
                          </span>
                          
                          <button
                            onClick={() => handleQuantityUpdate(item.handbag._id || item.handbag.id, item.quantity + 1)}
                            disabled={item.quantity >= item.handbag.quantity || updatingQuantity[item.handbag._id || item.handbag.id]}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaPlus className="text-sm" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFromCart(item.handbag._id || item.handbag.id)}
                          className="p-2 text-red-600 hover:text-red-700 transition-colors"
                          title="Remove from cart"
                        >
                          <FaTrash />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="mt-4 flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Subtotal: {formatPrice(item.handbag.price * item.quantity)}
                        </span>
                        {item.quantity >= item.handbag.quantity && (
                          <span className="text-yellow-600 text-xs">
                            Max quantity: {item.handbag.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm sticky top-8">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Order Summary
                  </h2>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Items Summary */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items ({totalItems})</span>
                    <span className="font-semibold">{formatPrice(totalAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold">Included</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-primary-600">
                        {formatPrice(totalAmount)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Proceed to Buy / Shipping Form */}
                  {!showPhoneInput ? (
                    <button
                      onClick={handleConfirmOrder}
                      disabled={!cartItems || cartItems.length === 0}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <FaShoppingCart />
                        <span>Proceed to Buy</span>
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-3 mt-6">
                      <div className="text-sm text-gray-700">Enter contact number for pickup</div>

                      <div className="space-y-2">
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          maxLength={10}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowPhoneInput(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateOrderAndPay}
                          disabled={processingPayment}
                          className="flex-1 btn-primary"
                        >
                          {processingPayment ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Processing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <FaCreditCard />
                              <span>Pay</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Security Info */}
                  <div className="text-xs text-gray-500 text-center mt-4">
                    🔒 Secure checkout powered by Razorpay
                  </div>
                  
                  {/* Stock Info */}
                  <div className="text-xs text-blue-600 text-center mt-2">
                    📦 Stock is reserved when you proceed to payment
                  </div>
                </div>
              </div>
              
              {/* Benefits */}
              <div className="bg-green-50 rounded-lg p-6 mt-6">
                <h3 className="font-semibold text-green-800 mb-3">
                  Your Purchase Helps:
                </h3>
                <ul className="text-sm text-green-700 space-y-2">
                  <li>• Support local artisans and their families</li>
                  <li>• Fund community education programs</li>
                  <li>• Promote sustainable livelihoods</li>
                  <li>• Create positive social impact</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
};

export default Cart;