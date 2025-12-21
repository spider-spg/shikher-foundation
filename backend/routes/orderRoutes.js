const express = require('express');
const router = express.Router();
const {
  validateStock,
  preparePayment,
  createOrder,
  createMockOrder,
  verifyPayment,
  getMyOrders,
  getOrder,
  cancelOrder,
  trackOrder,
  updateOrderStatus
} = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/orders/validate-stock
// @desc    Validate stock availability
// @access  Private (Customer only)
router.post('/validate-stock', authMiddleware, validateStock);

// @route   POST /api/orders/prepare-payment
// @desc    Reserve stock and prepare payment
// @access  Private (Customer only)
router.post('/prepare-payment', authMiddleware, preparePayment);

// @route   POST /api/orders/create
// @desc    Create order from cart
// @access  Private (Customer only)
router.post('/create', authMiddleware, createOrder);

// @route   POST /api/orders/mock
// @desc    Create mock order (bypass payment for testing)
// @access  Private (Customer only)
router.post('/mock', authMiddleware, createMockOrder);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private (Customer only)
router.get('/', authMiddleware, getMyOrders);

// @route   GET /api/orders/track/:trackingId
// @desc    Track order by tracking ID
// @access  Public
router.get('/track/:trackingId', trackOrder);

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private (Customer/Admin)
router.get('/:id', authMiddleware, getOrder);

// @route   POST /api/orders/:id/verify-payment
// @desc    Verify payment and complete order
// @access  Private (Customer only)
router.post('/:id/verify-payment', authMiddleware, verifyPayment);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private (Customer only)
router.put('/:id/cancel', authMiddleware, cancelOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Customer/Admin)
router.put('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;