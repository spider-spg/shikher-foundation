const {
  createOrder,
  getOrders,
  getOrderById,
  getOrderByTrackingId,
  updateOrderStatus,
  processPayment,
  cancelOrder
} = require('../services/orderService');
const { getUserCart, clearCart } = require('../services/userService');
const { getHandbagById, updateHandbag } = require('../services/handbagService');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper to resolve handbag id from different payload shapes
const resolveHandbagId = (item) => {
  if (!item) return null;
  return item.handbagId || item.handbag || item.itemId || item.id || null;
};
// @desc    Validate stock before payment
// @route   POST /api/orders/validate-stock
// @access  Private (Customer only)
const validateStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    // Check stock for each item
    for (const item of items) {
      const hid = resolveHandbagId(item);
      console.log('Validating stock for item:', { handbagId: hid, quantity: item.quantity });

      // If handbagId is missing, fail early with a helpful message
      if (!hid) {
        return res.status(400).json({
          success: false,
          message: 'One or more items in your cart are no longer available. Please refresh your cart and try again.'
        });
      }
      
      const handbag = await getHandbagById(hid);
      
      if (!handbag || !handbag.isActive) {
        return res.status(400).json({
          success: false,
          message: `Handbag "${handbag?.title || 'Unknown'}" is no longer available. It may have been removed by the seller.`
        });
      }

      if (handbag.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${handbag.title}". Available: ${handbag.quantity}, Requested: ${item.quantity}`
        });
      }
    }

    res.json({
      success: true,
      message: 'Stock validation successful'
    });

  } catch (error) {
    console.error('Stock validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Stock validation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Prepare payment (reserve stock + create Stripe checkout)
// @route   POST /api/orders/prepare-payment
// @access  Private (Customer only)
const preparePayment = async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    // Validate stock again (prevent race conditions)
    for (const item of items) {
      const handbag = await getHandbagById(item.handbag);
      
      if (!handbag || !handbag.isActive) {
        return res.status(400).json({
          success: false,
          message: `Handbag "${handbag?.title || 'Unknown'}" is no longer available`
        });
      }

      if (handbag.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${handbag.title}". Available: ${handbag.quantity}, Requested: ${item.quantity}`
        });
      }
    }

    // For now, temporarily reserve stock when "proceed to pay" is clicked
    // TODO: In production, implement temporary reservation with expiry
    for (const item of items) {
      const hid = resolveHandbagId(item);
      if (!hid) continue;
      const handbag = await getHandbagById(hid);
      if (handbag) {
        await updateHandbag(hid, {
          quantity: handbag.quantity - item.quantity
        });
      }
    }

    // Create pending order
    const orderData = {
      userId: req.user.uid,
      userEmail: req.user.email,
      items: items.map(item => ({
        handbagId: resolveHandbagId(item),
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      status: 'PENDING_PAYMENT'
    };

    const order = await createOrder(orderData);

    // Create Stripe checkout session
    // TODO: Implement actual Stripe integration
    const stripeCheckoutUrl = `${process.env.FRONTEND_URL}/order-success?orderId=${order.id}`;

    res.json({
      success: true,
      order,
      stripeCheckoutUrl,
      message: 'Payment prepared successfully'
    });

  } catch (error) {
    console.error('Prepare payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create mock order (bypass payment for testing)
// @route   POST /api/orders/mock
// @access  Private (Customer only)
const createMockOrderController = async (req, res) => {
  try {
    const { items, phoneNumber } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items are required'
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate and calculate totals
    for (const item of items) {
        const hid = resolveHandbagId(item);
        const handbag = await getHandbagById(hid);
      
      if (!handbag || !handbag.isActive) {
        return res.status(400).json({
          success: false,
          message: `Handbag "${handbag?.title || 'Unknown'}" is no longer available`
        });
      }

      if (handbag.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${handbag.title}". Available: ${handbag.quantity}, Requested: ${item.quantity}`
        });
      }

      const subtotal = handbag.price * item.quantity;
      orderItems.push({
        handbagId: handbag.id,
        title: handbag.title || 'Unknown Item',
        image: handbag.image || handbag.imageData || handbag.imageUrl || null, // Check all possible image field names
        quantity: item.quantity,
        price: handbag.price,
        subtotal
      });
      totalAmount += subtotal;
    }

    // Update handbag quantities
    for (const item of items) {
      const handbag = await getHandbagById(item.handbag);
      await updateHandbag(item.handbag, {
        quantity: handbag.quantity - item.quantity
      });
    }

    // Create simplified order
    const pickupDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const orderData = {
      userId: req.user.uid,
      userEmail: req.user.email,
      phoneNumber,
      items: orderItems,
      totalAmount,
      shippingAddress: {
        fullName: "Mock Test User",
        address: "Test Address",
        city: "Test City",
        state: "Test State",
        zipCode: "123456",
        phone: phoneNumber
      },
      paymentMethod: 'mock',
      paymentStatus: 'COMPLETED',
      status: 'PAID_PENDING_PICKUP',
      orderStatus: 'PAID_PENDING_PICKUP',
      pickupDeadline,
      notes: 'Mock order for testing - payment bypassed'
    };

    const order = await createOrder(orderData);

    res.status(201).json({
      success: true,
      order,
      message: 'Mock order created successfully'
    });

  } catch (error) {
    console.error('Mock order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mock order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create order from cart
// @route   POST /api/orders/create
// @access  Private (Customer only)
const createOrderController = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'razorpay' } = req.body;

    // Validate shipping address
    const requiredFields = ['fullName', 'address', 'city', 'state', 'zipCode', 'phone'];
    for (const field of requiredFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required in shipping address`
        });
      }
    }

    // Get user's cart
    const cartItems = await getUserCart(req.user.uid);
    const handbagItems = cartItems.filter(item => item.type === 'handbag');

    if (!handbagItems || handbagItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate cart items availability and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const cartItem of handbagItems) {
      const hid = resolveHandbagId(cartItem);
      if (!hid) {
        return res.status(400).json({
          success: false,
          message: 'One or more items in your cart are invalid. Please refresh your cart and try again.'
        });
      }
      const handbag = await getHandbagById(hid);
      
      if (!handbag || !handbag.isActive) {
        return res.status(400).json({
          success: false,
          message: `Handbag "${handbag?.title || 'Unknown'}" is no longer available`
        });
      }

      if (handbag.quantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for "${handbag.title}". Available: ${handbag.quantity}, Requested: ${cartItem.quantity}`
        });
      }

      const subtotal = handbag.price * cartItem.quantity;
      orderItems.push({
        handbagId: handbag.id,
        title: handbag.title,
        image: handbag.image || handbag.imageData || handbag.imageUrl || null, // Check all possible image field names
        quantity: cartItem.quantity,
        price: handbag.price,
        subtotal
      });
      totalAmount += subtotal;
    }

    // Calculate shipping and tax
    const shippingCost = totalAmount > 1000 ? 0 : 50; // Free shipping above ₹1000
    const tax = totalAmount * 0.18; // 18% GST
    const finalAmount = totalAmount + shippingCost + tax;

    // Create order data
    const orderData = {
      userId: req.user.uid,
      userEmail: req.user.email,
      items: orderItems,
      totalAmount: finalAmount,
      shippingAddress,
      paymentMethod,
      shippingCost,
      tax
    };

    // Create order using service
    const order = await createOrder(orderData);

    // If payment method is Razorpay, create Razorpay order
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay') {
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(finalAmount * 100), // Amount in paise
          currency: 'INR',
          receipt: order.id,
          notes: {
            orderId: order.id,
            userId: req.user.uid
          }
        });

        // Update order with Razorpay payment ID
        await updateOrderStatus(order.id, {
          'paymentInfo.paymentId': razorpayOrder.id
        });

      } catch (razorpayError) {
        console.error('Razorpay error:', razorpayError);
        return res.status(500).json({
          success: false,
          message: 'Error creating payment order'
        });
      }
    }

    // Clear the user's cart after successful order creation
    await clearCart(req.user.uid);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
      razorpayOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify payment and complete order
// @route   POST /api/orders/:id/verify-payment
// @access  Private (Customer only)
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data'
      });
    }

    // Find order
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    // Verify payment signature
    const crypto = require('crypto');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Process payment completion
    const updatedOrder = await processPayment(req.params.id, {
      paymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
      paymentStatus: 'completed'
    });

    res.json({
      success: true,
      message: 'Payment verified and order completed successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentInfo.paymentStatus,
        trackingId: updatedOrder.trackingId
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private (Customer only)
const getMyOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filters
    const filters = {
      userId: req.user.uid,
      userEmail: req.user.email, // Also pass email for backward compatibility
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      sortBy,
      sortOrder
    };

    const result = await getOrders(filters);

    res.json({
      success: true,
      count: result.orders.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      orders: result.orders
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private (Customer only)
const getOrder = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer only)
const cancelOrderController = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Cancel the order using the service
    const cancelledOrder = await cancelOrder(req.params.id, reason || 'Cancelled by customer');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: cancelledOrder.id,
        orderNumber: cancelledOrder.orderNumber,
        orderStatus: cancelledOrder.orderStatus,
        refund: cancelledOrder.refund
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Track order
// @route   GET /api/orders/track/:trackingId
// @access  Public
const trackOrder = async (req, res) => {
  try {
    const order = await getOrderByTrackingId(req.params.trackingId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with this tracking ID'
      });
    }

    res.json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        trackingId: order.trackingId,
        orderStatus: order.orderStatus,
        estimatedDelivery: order.estimatedDelivery,
        actualDelivery: order.actualDelivery,
        statusHistory: order.statusHistory,
        items: order.items,
        totalAmount: order.totalAmount,
        orderDate: order.createdAt
      }
    });

  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Customer/Admin)
const updateOrderStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = [
      'PENDING',
      'PROCESSING',
      'CONFIRMED',
      'PAID_PENDING_PICKUP',
      'PICKED_UP',
      'EXPIRED',
      'CANCELLED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    // Get current order to verify ownership
    const currentOrder = await getOrderById(id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order (or is admin)
    if (currentOrder.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    const updatedOrder = await updateOrderStatus(id, status);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send OTP for pickup verification
// @route   POST /api/admin/orders/:id/send-pickup-otp
// @access  Private (Admin only)
const sendPickupOTP = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('sendPickupOTP called for order:', id);
    console.log('User role:', req.user?.role);

    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Get order
    const order = await getOrderById(id);
    console.log('Order found:', order ? 'Yes' : 'No');
    if (order) {
      console.log('Order status:', order.orderStatus);
    }
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is in correct status
    if (order.orderStatus !== 'PAID_PENDING_PICKUP') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in PAID_PENDING_PICKUP status for OTP verification'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in order (expires in 15 minutes)
    const otpData = {
      otp: otp,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    await updateOrderStatus(id, order.orderStatus, '', { pickupOTP: otpData });

    // In a real app, you would send SMS/email here
    // For demo purposes, we'll just log it
    console.log(`OTP for order ${id}: ${otp}`);
    
    // For development, we can include OTP in response
    const responseData = {
      success: true,
      message: 'OTP sent successfully to customer'
    };

    // Add OTP to response in development mode
    if (process.env.NODE_ENV === 'development') {
      responseData.otp = otp; // Only for development
    }

    res.json(responseData);

  } catch (error) {
    console.error('Send pickup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify pickup OTP and mark order as picked up
// @route   POST /api/admin/orders/:id/verify-pickup
// @access  Private (Admin only)
const verifyPickupOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    console.log('verifyPickupOTP called for order:', id, 'with OTP:', otp);
    console.log('User role:', req.user?.role);

    // Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Get order
    const order = await getOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order has OTP
    if (!order.pickupOTP || !order.pickupOTP.otp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this order. Please send OTP first.'
      });
    }

    // Check if OTP expired
    if (new Date() > new Date(order.pickupOTP.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (order.pickupOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      });
    }

    // Mark order as picked up and clear OTP
    const updatedOrder = await updateOrderStatus(id, 'PICKED_UP', 'OTP verified - pickup confirmed', { 
      pickupOTP: null,
      pickedUpAt: new Date()
    });

    res.json({
      success: true,
      message: 'Pickup verified successfully! Order marked as picked up.',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Verify pickup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  validateStock,
  preparePayment,
  createOrder: createOrderController,
  createMockOrder: createMockOrderController,
  verifyPayment,
  getMyOrders,
  getOrder,
  cancelOrder: cancelOrderController,
  trackOrder,
  updateOrderStatus: updateOrderStatusController,
  sendPickupOTP,
  verifyPickupOTP
};