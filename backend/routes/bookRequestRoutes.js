const express = require('express');
const router = express.Router();
const {
  createBookRequest,
  getMyBookRequests,
  getBookRequest,
  cancelBookRequest
} = require('../controllers/bookRequestController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/book-requests
// @desc    Create a new book request
// @access  Private (Customer only)
router.post('/', authMiddleware, createBookRequest);

// @route   GET /api/book-requests/my-requests
// @desc    Get user's book requests
// @access  Private (Customer only)
router.get('/my-requests', authMiddleware, getMyBookRequests);

// @route   GET /api/book-requests/:id
// @desc    Get single book request
// @access  Private (Customer/Admin)
router.get('/:id', authMiddleware, getBookRequest);

// @route   PUT /api/book-requests/:id/cancel
// @desc    Cancel book request
// @access  Private (Customer only)
router.put('/:id/cancel', authMiddleware, cancelBookRequest);

module.exports = router;