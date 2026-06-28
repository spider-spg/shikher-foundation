const express = require('express');
const router = express.Router();
const { getBooks, getBook } = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/books
// @desc    Get all books
// @access  Public
router.get('/', getBooks);

// @route   GET /api/books/:id
// @desc    Get single book
// @access  Public (but shows user-specific data if authenticated)
router.get('/:id', (req, res, next) => {
  // Optional authentication - attach user if token is present
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    return authMiddleware(req, res, next);
  }
  next();
}, getBook);

module.exports = router;
