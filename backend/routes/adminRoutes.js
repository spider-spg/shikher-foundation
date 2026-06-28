const express = require('express');
const cors = require('cors');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.options('*', cors()); // optional but ensures preflight is handled

const {
  getDashboard,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  addBook,
    addBookStock,
  getAllHandbags,
  getHandbagById,
  updateHandbag,
  addHandbag,
  deleteHandbag,
  getHandbagSalesData,
  updateBookQuantity,
  updateHandbagQuantity,
  getAllOrders,
  updateOrderStatus,
  checkExpiredOrders,
  getAllDonations,
  updateDonationStatus,
  getAllBookRequests,
  updateBookRequestStatus,
  getRecentActivities,
  getTopBooks,
  getTopHandbags
} = require('../controllers/adminController_dashboard');

// OTP pickup verification removed — admin marks orders as picked up directly via status update

// Apply auth and admin middleware to all routes
router.use(authMiddleware, adminMiddleware);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard analytics
// @access  Private (Admin only)
router.get('/dashboard', getDashboard);

// @route   GET /api/admin/books
// @desc    Get all books for admin
// @access  Private (Admin only)
router.get('/books', getAllBooks);

// @route   GET /api/admin/books/:id
// @desc    Get single book by ID
// @access  Private (Admin only)
router.get('/books/:id', getBookById);

// @route   PUT /api/admin/books/:id
// @desc    Update book by ID
// @access  Private (Admin only)
router.put('/books/:id', 
  uploadMiddleware.single('image'), 
  updateBook
);

// @route   DELETE /api/admin/books/:id
// @desc    Delete book by ID
// @access  Private (Admin only)
router.delete('/books/:id', deleteBook);

// @access  Private (Admin only)

// @route   POST /api/admin/books
// @desc    Add new book
// @access  Private (Admin only)
router.post('/books', 
  uploadMiddleware.single('bookImage'), 
  addBook
);

// @route   PUT /api/admin/books/:id/quantity
// @desc    Update book quantity
// @access  Private (Admin only)
router.put('/books/:id/quantity', updateBookQuantity);

// @route   PUT /api/admin/books/:id/add-stock
// @desc    Add stock to existing book
// @access  Private (Admin only)
router.put('/books/:id/add-stock', addBookStock);

// @route   GET /api/admin/handbags
// @desc    Get all handbags for admin
// @access  Private (Admin only)
router.get('/handbags', getAllHandbags);

// @route   POST /api/admin/handbags
// @desc    Add new handbag
// @access  Private (Admin only)
router.post('/handbags', 
  uploadMiddleware.single('handbagImage'), 
  addHandbag
);

// @route   GET /api/admin/handbags/:id
// @desc    Get single handbag by ID
// @access  Private (Admin only)
router.get('/handbags/:id', getHandbagById);

// @route   PUT /api/admin/handbags/:id
// @desc    Update handbag by ID
// @access  Private (Admin only)
router.put('/handbags/:id', uploadMiddleware.single('image'), updateHandbag);

// @route   DELETE /api/admin/handbags/:id
// @desc    Delete handbag by ID
// @access  Private (Admin only)
router.delete('/handbags/:id', deleteHandbag);

// @route   GET /api/admin/handbags/:id/sales-data
// @desc    Get handbag sales data
// @access  Private (Admin only)
router.get('/handbags/:id/sales-data', getHandbagSalesData);

// @route   PUT /api/admin/handbags/:id/quantity
// @desc    Update handbag quantity
// @access  Private (Admin only)
router.put('/handbags/:id/quantity', updateHandbagQuantity);

// @route   GET /api/admin/orders
// @desc    Get all orders for admin
// @access  Private (Admin only)
router.get('/orders', getAllOrders);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin only)
router.put('/orders/:id/status', updateOrderStatus);

// @route   POST /api/admin/orders/check-expired
// @desc    Check and expire orders past pickup deadline
// @access  Private (Admin only)
router.post('/orders/check-expired', checkExpiredOrders);

// Pickup is now confirmed by admin via PUT /api/admin/orders/:id/status with status=PICKED_UP

// @route   GET /api/admin/donations
// @desc    Get all donations for admin
// @access  Private (Admin only)
router.get('/donations', getAllDonations);

// @route   PUT /api/admin/donations/:id/status
// @desc    Update donation status
// @access  Private (Admin only)
router.put('/donations/:id/status', updateDonationStatus);

// @route   GET /api/admin/book-requests
// @desc    Get all book requests for admin
// @access  Private (Admin only)
router.get('/book-requests', getAllBookRequests);

// @route   PUT /api/admin/book-requests/:id/status
// @desc    Update book request status
// @access  Private (Admin only)
router.put('/book-requests/:id/status', updateBookRequestStatus);

// @route   GET /api/admin/recent-activities
// @desc    Get recent activities
// @access  Private (Admin only)
router.get('/recent-activities', getRecentActivities);

// @route   GET /api/admin/top-books
// @desc    Get top books
// @access  Private (Admin only)
router.get('/top-books', getTopBooks);

// @route   GET /api/admin/top-handbags
// @desc    Get top handbags
// @access  Private (Admin only)
router.get('/top-handbags', getTopHandbags);

// @route   POST /api/admin/fix-order-images
// @desc    Fix missing images in existing orders (utility endpoint)
// @access  Private (Admin only)
router.post('/fix-order-images', async (req, res) => {
  try {
    const { fixOrderImages } = require('../utils/fixOrderImages');
    const result = await fixOrderImages();
    
    res.json({
      success: true,
      message: `Order images fix completed. Updated ${result.updatedCount} out of ${result.totalOrders} orders.`,
      result
    });
  } catch (error) {
    console.error('Fix order images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix order images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/admin/debug-data-structure
// @desc    Debug data structure for troubleshooting (development only)
// @access  Private (Admin only)
router.get('/debug-data-structure', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Debug endpoint only available in development mode'
      });
    }
    
    const { debugDataStructure } = require('../utils/debugDataStructure');
    await debugDataStructure();
    
    res.json({
      success: true,
      message: 'Debug information logged to console'
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run debug',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;