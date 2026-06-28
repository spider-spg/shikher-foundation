const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require('../services/orderService');

const { getUserCart, clearCart } = require('../services/userService');
const { getHandbagById }         = require('../services/handbagService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveHandbagId = (item) => {
  if (!item) return null;
  // After getUserCart, item.handbag is the populated handbag object
  if (typeof item.handbag === 'object' && item.handbag !== null) {
    return item.handbag.id || item.handbag._id || null;
  }
  if (typeof item.handbag === 'string') return item.handbag;
  if (item.handbagId)  return item.handbagId;
  if (item._id)        return item._id;
  if (item.id)         return item.id;
  return null;
};

// ─── Create handbag order (no payment gateway) ───────────────────────────────
// @route   POST /api/orders/create-handbag
// @access  Private (Customer)
//
// IMPORTANT: Stock was already decremented when each item was added to the cart
// (handled by userService.addToCart transaction). We must NOT decrement again here.
// clearCart() simply deletes the cart docs — it does NOT restore inventory.
const createHandbagOrder = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || String(phoneNumber).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit phone number is required'
      });
    }

    // Fetch cart (getUserCart auto-expires stale items, restores their stock,
    // and returns only valid, active cart items)
    const cartItems    = await getUserCart(req.user.uid);
    const handbagItems = cartItems.filter(item => {
      // item.handbag is the populated object after getUserCart
      return item.handbag && (item.type === 'handbag' || item.handbag.id);
    });

    if (!handbagItems || handbagItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // Build order items from cart (stock already reserved — just validate data)
    const orderItems = [];
    let totalAmount  = 0;

    for (const cartItem of handbagItems) {
      const hb = typeof cartItem.handbag === 'object' ? cartItem.handbag : null;
      if (!hb) {
        return res.status(400).json({
          success: false,
          message: 'One or more cart items are invalid. Please refresh your cart.'
        });
      }

      if (!hb.isActive && hb.isActive !== undefined) {
        return res.status(400).json({
          success: false,
          message: `"${hb.title || 'A handbag'}" is no longer available`
        });
      }

      const subtotal = (hb.price || 0) * cartItem.quantity;
      orderItems.push({
        handbagId: hb.id,
        title:     hb.title || hb.name,
        image:     hb.imageData || hb.image || hb.imageUrl || null,
        quantity:  cartItem.quantity,
        price:     hb.price || 0,
        subtotal
      });
      totalAmount += subtotal;
    }

    // Persist order with status PENDING_PICKUP
    const pickupDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const orderData = {
      userId:         req.user.uid,
      userEmail:      req.user.email,
      items:          orderItems,
      totalAmount,
      phoneNumber:    String(phoneNumber).trim(),
      orderStatus:    'PAID_PENDING_PICKUP',
      status:         'PAID_PENDING_PICKUP',
      orderType:      'handbag',
      pickupDeadline, // 7 days to pick up
      createdAt:      new Date()
    };

    const order = await createOrder(orderData);

    // Clear cart docs (does NOT restore inventory — stock stays decremented)
    await clearCart(req.user.uid);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully. Coordinate with the NGO to schedule your pickup.',
      order
    });

  } catch (error) {
    console.error('createHandbagOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get current user's orders ────────────────────────────────────────────────
// @route   GET /api/orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
  try {
    const {
      page      = 1,
      limit     = 10,
      status,
      sortBy    = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await getOrders({
      userId:    req.user.uid,
      userEmail: req.user.email,
      page:      parseInt(page),
      limit:     parseInt(limit),
      status,
      sortBy,
      sortOrder
    });

    return res.json({
      success:     true,
      count:       result.orders.length,
      total:       result.total,
      totalPages:  result.totalPages,
      currentPage: result.currentPage,
      orders:      result.orders
    });

  } catch (error) {
    console.error('getMyOrders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get single order ─────────────────────────────────────────────────────────
// @route   GET /api/orders/:id
// @access  Private (Customer / Admin)
const getOrder = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    return res.json({ success: true, order });
  } catch (error) {
    console.error('getOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Cancel order (by user, before pickup) ───────────────────────────────────
// @route   PUT /api/orders/:id/cancel
// @access  Private (Customer)
const cancelOrderController = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await getOrderById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.userId !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const nonCancellable = ['PICKED_UP', 'CANCELLED', 'EXPIRED'];
    if (nonCancellable.includes(order.orderStatus || order.status)) {
      return res.status(400).json({ success: false, message: 'This order cannot be cancelled' });
    }

    const cancelledOrder = await cancelOrder(req.params.id, null, reason || 'Cancelled by customer');
    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      order:   { id: cancelledOrder?.id || req.params.id, status: 'CANCELLED' }
    });

  } catch (error) {
    console.error('cancelOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Update order status (Admin) ─────────────────────────────────────────────
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
const updateOrderStatusController = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const validStatuses = ['PAID_PENDING_PICKUP', 'PENDING_PICKUP', 'PICKED_UP', 'CANCELLED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid: ${validStatuses.join(', ')}`
      });
    }

    const currentOrder = await getOrderById(id);
    if (!currentOrder) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    await updateOrderStatus(id, status);
    return res.json({ success: true, message: 'Order status updated', order: { id, orderStatus: status } });

  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get all orders (Admin) ───────────────────────────────────────────────────
// @route   GET /api/orders/admin/all  or  GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const {
      page      = 1,
      limit     = 50,
      status,
      sortBy    = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await getOrders({ page: parseInt(page), limit: parseInt(limit), status, sortBy, sortOrder });

    return res.json({
      success:     true,
      count:       result.orders.length,
      total:       result.total,
      totalPages:  result.totalPages,
      currentPage: result.currentPage,
      orders:      result.orders
    });

  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createHandbagOrder,
  getMyOrders,
  getOrder,
  cancelOrder:         cancelOrderController,
  updateOrderStatus:   updateOrderStatusController,
  getAllOrders
};