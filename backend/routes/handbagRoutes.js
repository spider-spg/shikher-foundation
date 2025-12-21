const express = require('express');
const router = express.Router();
const {
  getHandbags,
  getHandbag,
  addToCart,
  removeFromCart,
  getCart,
  updateCartQuantity,
  clearCart,
  addReview,
  getCategories,
  getFeaturedHandbags
} = require('../controllers/handbagController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/handbags
// @desc    Get all handbags
// @access  Public
router.get('/', getHandbags);

// @route   GET /api/handbags/categories
// @desc    Get handbag categories
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/handbags/featured
// @desc    Get featured handbags
// @access  Public
router.get('/featured', getFeaturedHandbags);

// @route   GET /api/handbags/cart
// @desc    Get user's cart
// @access  Private (Customer only)
router.get('/cart', authMiddleware, getCart);

// @route   DELETE /api/handbags/cart
// @desc    Clear user's cart
// @access  Private (Customer only)
router.delete('/cart', authMiddleware, clearCart);

// @route   GET /api/handbags/:id
// @desc    Get single handbag
// @access  Public (but shows user-specific data if authenticated)
router.get('/:id', (req, res, next) => {
  // Optional authentication - attach user if token is present
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    return authMiddleware(req, res, next);
  }
  next();
}, getHandbag);

// @route   POST /api/handbags/:id/cart
// @desc    Add handbag to cart
// @access  Private (Customer only)
router.post('/:id/cart', authMiddleware, addToCart);

// @route   PUT /api/handbags/:id/cart
// @desc    Update cart item quantity
// @access  Private (Customer only)
router.put('/:id/cart', authMiddleware, updateCartQuantity);

// @route   DELETE /api/handbags/:id/cart
// @desc    Remove handbag from cart
// @access  Private (Customer only)
router.delete('/:id/cart', authMiddleware, removeFromCart);

// @route   POST /api/handbags/:id/review
// @desc    Add review for handbag
// @access  Private (Customer only)
router.post('/:id/review', authMiddleware, addReview);

module.exports = router;