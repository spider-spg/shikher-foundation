const express = require('express');
const router  = express.Router();

const {
  createHandbagOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
  getAllOrders
} = require('../controllers/orderController');

const authMiddleware = require('../middleware/authMiddleware');

// ─── Customer routes ──────────────────────────────────────────────────────────

// POST /api/orders/create-handbag  →  Place a handbag order (no payment)
router.post('/create-handbag', authMiddleware, createHandbagOrder);

// GET  /api/orders                 →  Get current user's orders
router.get('/', authMiddleware, getMyOrders);

// GET  /api/orders/:id             →  Get a single order (user or admin)
router.get('/:id', authMiddleware, getOrder);

// PUT  /api/orders/:id/cancel      →  Cancel an order (user, before pickup)
router.put('/:id/cancel', authMiddleware, cancelOrder);

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET  /api/orders/admin/all       →  All orders (admin only)
router.get('/admin/all', authMiddleware, getAllOrders);

// PUT  /api/orders/:id/status      →  Update order status (admin only)
router.put('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;