const express = require('express');
const router = express.Router();
const {
  getBooks,
  getBook,
  borrowBook,
  returnBook,
  getMyShelf,
  getGenres,
  getBorrowingHistory,
  donateBook
} = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// @route   GET /api/books
// @desc    Get all books
// @access  Public
router.get('/', getBooks);

// @route   GET /api/books/genres
// @desc    Get all book genres
// @access  Public
router.get('/genres', getGenres);

// @route   GET /api/books/my-shelf
// @desc    Get user's borrowed books
// @access  Private (Customer only)
router.get('/my-shelf', authMiddleware, getMyShelf);

// @route   GET /api/books/history
// @desc    Get user's borrowing history
// @access  Private (Customer only)
router.get('/history', authMiddleware, getBorrowingHistory);

// @route   POST /api/books/donate
// @desc    Donate a book
// @access  Private (Customer only)
router.post('/donate', 
  authMiddleware, 
  ...uploadMiddleware.single('image'), 
  donateBook
);

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

// @route   POST /api/books/:id/borrow
// @desc    Borrow a book
// @access  Private (Customer only)
router.post('/:id/borrow', authMiddleware, borrowBook);

// @route   POST /api/books/:id/return
// @desc    Return a book
// @access  Private (Customer only)
router.post('/:id/return', authMiddleware, returnBook);

module.exports = router;