const {
  createBookRequest,
  getBookRequests,
  getBookRequestById,
  updateBookRequestStatus
} = require('../services/bookRequestService');
const { getBookById, updateBookQuantity } = require('../services/bookService');
const { getUserDocument } = require('../services/userService');

// @desc    Create a new book request
// @route   POST /api/book-requests
// @access  Private (Customer only)
const createBookRequestController = async (req, res) => {
  try {
    const { bookId, message } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required'
      });
    }

    // Verify book exists and is active
    const book = await getBookById(bookId);
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found or not available'
      });
    }

    // Check if book has available quantity
    if ((book.quantity || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This book is currently out of stock'
      });
    }

    // Check if user already has a pending/active request for this book
    const existingRequests = await getBookRequests({
      userId: req.user.uid,
      bookId: bookId,
      status: ['PENDING', 'ACCEPTED', 'PICKED_UP']
    });

    if (existingRequests.requests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active request for this book'
      });
    }

    // ── Reduce inventory immediately when request is placed ──────────────────
    await updateBookQuantity(bookId, book.quantity - 1);

    // Fetch user's phone number from Firestore profile
    const userDoc = await getUserDocument(req.user.uid);
    const userPhone = userDoc?.phoneNumber || userDoc?.phone || '';

    // Create book request
    const requestData = {
      userId:      req.user.uid,
      bookId,
      message:     message || '',
      userEmail:   req.user.email,
      userName:    req.user.displayName || userDoc?.name || '',
      userPhone,
      status:      'PENDING'
    };

    const request = await createBookRequest(requestData);

    res.status(201).json({
      success: true,
      message: 'Book request submitted! Check your MyShelf for updates.',
      request: {
        id:        request.id,
        bookId:    request.bookId,
        status:    request.status,
        createdAt: request.createdAt
      }
    });

  } catch (error) {
    console.error('Create book request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating book request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's book requests
// @route   GET /api/book-requests/my-requests
// @access  Private (Customer only)
const getMyBookRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filters = {
      userId: req.user.uid,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (status) {
      filters.status = status;
    }

    const result = await getBookRequests(filters);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get my book requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single book request
// @route   GET /api/book-requests/:id
// @access  Private (Customer/Admin)
const getBookRequest = async (req, res) => {
  try {
    const request = await getBookRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Book request not found'
      });
    }

    // Check authorization - user can only see their own requests, admin can see all
    if (req.user.role !== 'admin' && request.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this request'
      });
    }

    res.json({
      success: true,
      request
    });

  } catch (error) {
    console.error('Get book request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel book request (customer only)
// @route   PUT /api/book-requests/:id/cancel
// @access  Private (Customer only)
const cancelBookRequest = async (req, res) => {
  try {
    const request = await getBookRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Book request not found'
      });
    }

    // Check authorization
    if (request.userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    // Check if request can be cancelled
    if (!['PENDING', 'ACCEPTED'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be cancelled in current status'
      });
    }

    await updateBookRequestStatus(req.params.id, 'REJECTED', 'Cancelled by user', null);

    res.json({
      success: true,
      message: 'Book request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel book request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling book request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createBookRequest: createBookRequestController,
  getMyBookRequests,
  getBookRequest,
  cancelBookRequest
};