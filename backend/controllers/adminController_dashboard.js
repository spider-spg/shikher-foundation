const bookService = require('../services/bookService');
const handbagService = require('../services/handbagService');
const orderService = require('../services/orderService');
const donationService = require('../services/donationService');
const bookRequestService = require('../services/bookRequestService');
const { db, FieldValue } = require('../config/firebaseAdmin');

// @desc    Get admin dashboard analytics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getDashboard = async (req, res) => {
  try {
    // Initialize dashboard data
    const dashboard = {
      books: {
        total: 0,
        available: 0,
        pendingApproval: 0,  // stock held for PENDING book requests, not yet approved
        borrowed: 0,         // stock genuinely in customer's hands (PICKED_UP only)
        outOfStock: 0
      },
      handbags: {
        total: 0,
        available: 0,
        inCarts: 0,          // stock reserved in user carts, not yet ordered
        sold: 0,             // units from genuinely completed (picked up) orders
        revenue: 0,          // total revenue from picked-up orders
        outOfStock: 0
      },
      orders: {
        total: 0,
        pending: 0,
        shipped: 0,
        delivered: 0,
        totalRevenue: 0
      },
      donations: {
        total: 0,
        pending: 0,
        approved: 0,
        received: 0,
        rejected: 0,
        byType: {}
      },
      users: {
        total: 0,
        active: 0
      },
      alerts: {
        lowStockBooks: [],
        outOfStockBooks: [],
        lowStockHandbags: [],
        outOfStockHandbags: []
      },
      recentActivity: {
        orders: [],
        donations: []
      }
    };

    // Get books statistics
    try {
      const booksSnapshot = await db.collection('books').where('isActive', '==', true).get();
      dashboard.books.total = booksSnapshot.size;

      booksSnapshot.docs.forEach(doc => {
        const bookData = doc.data();
        const quantity = parseInt(bookData.quantity, 10) || 0;

        // "Available" is simply the current quantity field — this is accurate
        // regardless of WHY stock was reduced (pending request, borrowed, etc).
        dashboard.books.available += quantity;

        if (quantity === 0) {
          dashboard.books.outOfStock++;
          dashboard.alerts.outOfStockBooks.push({
            id: doc.id,
            title: bookData.title,
            author: bookData.author
          });
        } else if (quantity <= 2) {
          dashboard.alerts.lowStockBooks.push({
            id: doc.id,
            title: bookData.title,
            author: bookData.author,
            quantity
          });
        }
      });
    } catch (error) {
      console.warn('Error fetching books data:', error);
    }

    // Get real book request statuses — this is the source of truth for WHY
    // a book's stock is reduced, instead of inferring purely from quantity gaps.
    // Also builds dashboard.bookRequests, which the frontend reads directly.
    dashboard.bookRequests = { total: 0, pending: 0, awaitingPickup: 0, active: 0, overdue: 0 };
    try {
      const bookRequestsSnapshot = await db.collection('bookRequests').get();
      dashboard.bookRequests.total = bookRequestsSnapshot.size;
      const now = new Date();

      bookRequestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;

        if (status === 'PENDING') {
          dashboard.books.pendingApproval++;
          dashboard.bookRequests.pending++;
        } else if (status === 'ACCEPTED') {
          // Approved but not yet physically picked up — not "borrowed" yet.
          dashboard.bookRequests.awaitingPickup++;
        } else if (status === 'PICKED_UP') {
          // Only a genuine pickup counts as "borrowed" — this is when the
          // book is actually in the customer's hands.
          dashboard.books.borrowed++;
          dashboard.bookRequests.active++;

          // Check overdue: PICKED_UP with a dueDate in the past
          if (data.dueDate) {
            const dueDate = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
            if (dueDate < now) {
              dashboard.bookRequests.overdue++;
            }
          }
        }
        // REJECTED and RETURNED requests don't hold stock — not counted here
      });
    } catch (error) {
      console.warn('Error fetching book requests data:', error);
    }

    // Get handbags statistics
    try {
      const handbagsSnapshot = await db.collection('handbags').where('isActive', '==', true).get();
      dashboard.handbags.total = handbagsSnapshot.size;

      for (const doc of handbagsSnapshot.docs) {
        const handbagData = doc.data();
        const quantity = parseInt(handbagData.quantity, 10) || 0;

        // "Available" is the current quantity field — accurate regardless of
        // WHY stock was reduced (sitting in a cart vs. genuinely sold).
        dashboard.handbags.available += quantity;

        // Real units sold come from this handbag's actual salesHistory
        // (completed orders), not from inferring it off the quantity gap —
        // stock reserved in someone's cart should NOT count as "sold".
        try {
          const salesHistorySnap = await db
            .collection('handbags').doc(doc.id).collection('salesHistory').get();

          if (salesHistorySnap.size > 0) {
            // Use salesHistory as source of truth
            salesHistorySnap.docs.forEach(saleDoc => {
              const sale = saleDoc.data();
              dashboard.handbags.sold    += sale.quantity || 1;
              dashboard.handbags.revenue += (sale.salePrice || 0) * (sale.quantity || 1);
            });
          } else {
            // Backfill: find PICKED_UP orders containing this handbag
            // (handles orders picked up before salesHistory writing was added)
            const pickedUpOrdersSnap = await db
              .collection('orders')
              .where('status', '==', 'PICKED_UP')
              .get();

            pickedUpOrdersSnap.docs.forEach(orderDoc => {
              (orderDoc.data().items || []).forEach(item => {
                if (item.handbagId === doc.id) {
                  dashboard.handbags.sold    += item.quantity || 1;
                  dashboard.handbags.revenue += (item.price || 0) * (item.quantity || 1);
                }
              });
            });
          }
        } catch (salesErr) {
          console.warn(`Error fetching sales history for handbag ${doc.id}:`, salesErr);
        }

        if (quantity === 0) {
          dashboard.handbags.outOfStock++;
          dashboard.alerts.outOfStockHandbags.push({
            id: doc.id,
            title: handbagData.title,
            size: handbagData.size,
            price: handbagData.price
          });
        } else if (quantity <= 2) {
          dashboard.alerts.lowStockHandbags.push({
            id: doc.id,
            title: handbagData.title,
            size: handbagData.size,
            quantity,
            price: handbagData.price
          });
        }
      }
    } catch (error) {
      console.warn('Error fetching handbags data:', error);
    }

    // Count handbag units currently sitting in any user's cart (reserved,
    // not yet ordered). Cart items live in a subcollection per user, so a
    // collection group query is needed to count across all users at once.
    try {
      const cartItemsSnapshot = await db.collectionGroup('cart').get();
      cartItemsSnapshot.docs.forEach(doc => {
        const cartItem = doc.data();
        dashboard.handbags.inCarts += parseInt(cartItem.quantity, 10) || 1;
      });
    } catch (error) {
      console.warn('Error fetching cart data:', error);
    }

    // Get orders statistics
    try {
      const ordersSnapshot = await db.collection('orders').get();
      dashboard.orders.total = ordersSnapshot.size;
      
      ordersSnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        const status = orderData.orderStatus || orderData.status;
        const amount = orderData.totalAmount || 0;
        
        dashboard.orders.totalRevenue += amount;
        
        switch (status) {
          case 'PENDING_PICKUP':
          case 'PAID_PENDING_PICKUP': // legacy support for old orders in Firestore
            dashboard.orders.pending++;
            break;
          case 'PICKED_UP':
            dashboard.orders.delivered++;
            break;
        }
      });
    } catch (error) {
      console.warn('Error fetching orders data:', error);
    }

    // Get donations statistics (all types: books, clothes, toys, stationary)
    try {
      const donationsSnapshot = await db.collection('donations').get();

      // Split byType into accepted (pending/approved/received) and rejected
      dashboard.donations.byTypeAccepted = {};
      dashboard.donations.byTypeRejected = {};

      donationsSnapshot.docs.forEach(doc => {
        const donationData = doc.data();
        const status   = (donationData.status || donationData.donationStatus || '').toLowerCase();
        const itemType = (donationData.itemType || donationData.type || 'other').toLowerCase();

        switch (status) {
          case 'pending':  dashboard.donations.pending++;  break;
          case 'approved': dashboard.donations.approved++; break;
          case 'received': dashboard.donations.received = (dashboard.donations.received || 0) + 1; break;
          case 'rejected': dashboard.donations.rejected = (dashboard.donations.rejected || 0) + 1; break;
        }

        // Total excludes rejected donations
        if (status !== 'rejected') {
          dashboard.donations.total++;
          dashboard.donations.byTypeAccepted[itemType] = (dashboard.donations.byTypeAccepted[itemType] || 0) + 1;
        } else {
          dashboard.donations.byTypeRejected[itemType] = (dashboard.donations.byTypeRejected[itemType] || 0) + 1;
        }

        // Keep byType for backward compat
        if (!dashboard.donations.byType) dashboard.donations.byType = {};
        dashboard.donations.byType[itemType] = (dashboard.donations.byType[itemType] || 0) + 1;
      });
    } catch (error) {
      console.warn('Error fetching donations data:', error);
    }

    // Get users count
    try {
      const usersSnapshot = await db.collection('users').get();
      dashboard.users.total = usersSnapshot.size;
      dashboard.users.active = usersSnapshot.size; // For now, consider all users as active
    } catch (error) {
      console.warn('Error fetching users data:', error);
    }

    // Calculate performance metrics
    dashboard.performance = {
      bookUtilization: dashboard.books.total > 0 
        ? Math.round((dashboard.books.borrowed / dashboard.books.total) * 100) 
        : 0,
      salesRate: dashboard.handbags.total > 0 
        ? Math.round((dashboard.handbags.sold / dashboard.handbags.total) * 100) 
        : 0,
      orderFulfillmentRate: dashboard.orders.total > 0 
        ? Math.round((dashboard.orders.delivered / dashboard.orders.total) * 100) 
        : 0
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all books for admin
// @route   GET /api/admin/books
// @access  Private (Admin only)
const getAllBooks = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search,
      genre: req.query.genre,
      condition: req.query.condition,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await bookService.getBooks(filters);

    // ── Per-book request status breakdown ───────────────────────────────────
    // "quantity" drops the moment a request is PLACED (reserves the copy),
    // so it does NOT by itself tell us whether a book is pending, awaiting
    // pickup, or genuinely out with a borrower. Pull real counts per status
    // from bookRequests, the same source of truth the dashboard uses, so
    // this page and the dashboard never disagree on what "borrowed" means.
    const requestsSnapshot = await db.collection('bookRequests').get();
    const statusByBook = {}; // bookId -> { pendingApproval, awaitingPickup, currentlyBorrowed }

    requestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const bookId = data.bookId;
      if (!bookId) return;

      if (!statusByBook[bookId]) {
        statusByBook[bookId] = { pendingApproval: 0, awaitingPickup: 0, currentlyBorrowed: 0 };
      }

      if (data.status === 'PENDING') {
        statusByBook[bookId].pendingApproval++;
      } else if (data.status === 'ACCEPTED') {
        statusByBook[bookId].awaitingPickup++;
      } else if (data.status === 'PICKED_UP') {
        statusByBook[bookId].currentlyBorrowed++;
      }
      // REJECTED / RETURNED don't hold a copy — not counted
    });

    const booksWithStatus = result.books.map(book => ({
      ...book,
      pendingApproval: statusByBook[book.id]?.pendingApproval || 0,
      awaitingPickup: statusByBook[book.id]?.awaitingPickup || 0,
      currentlyBorrowed: statusByBook[book.id]?.currentlyBorrowed || 0
    }));

    res.json({
      success: true,
      count: booksWithStatus.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      books: booksWithStatus
    });

  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get book borrow history
// @desc    Get single book by ID
// @route   GET /api/admin/books/:id
// @access  Private (Admin only)
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID provided'
      });
    }

    const bookRef = require('../config/firebaseAdmin').firestore.collection('books').doc(id);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const book = { id: bookDoc.id, ...bookDoc.data() };

    // Real per-status counts (same source of truth as dashboard/AdminBooks list)
    const requestsSnapshot = await db.collection('bookRequests').where('bookId', '==', id).get();
    let pendingApproval = 0, awaitingPickup = 0, currentlyBorrowed = 0;
    requestsSnapshot.docs.forEach(doc => {
      const status = doc.data().status;
      if (status === 'PENDING') pendingApproval++;
      else if (status === 'ACCEPTED') awaitingPickup++;
      else if (status === 'PICKED_UP') currentlyBorrowed++;
    });
    book.pendingApproval = pendingApproval;
    book.awaitingPickup = awaitingPickup;
    book.currentlyBorrowed = currentlyBorrowed;

    res.json({
      success: true,
      book
    });

  } catch (error) {
    console.error('Get book by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update book by ID
// @route   PUT /api/admin/books/:id
// @access  Private (Admin only)
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID provided'
      });
    }

    const bookRef = require('../config/firebaseAdmin').firestore.collection('books').doc(id);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Handle image update if a new image was uploaded
    if (req.imageData) {
      updateData.imageData = req.imageData;
    }

    // ── Keep available quantity in sync with totalQuantity ──────────────────
    // The Edit Book form only exposes "totalQuantity" (admin doesn't see/edit
    // "available copies" directly, since that's controlled by the
    // request/accept/return flow). If admin changes totalQuantity, shift the
    // available `quantity` by the same delta, so reserved/borrowed copies
    // stay correctly accounted for and `quantity` never ends up exceeding
    // `totalQuantity` (which was causing availability % to exceed 100%).
    const book = bookDoc.data();
    if (updateData.totalQuantity !== undefined) {
      const newTotalQuantity = parseInt(updateData.totalQuantity);
      const oldTotalQuantity = parseInt(book.totalQuantity) || 0;
      const oldQuantity = parseInt(book.quantity) || 0;

      if (!isNaN(newTotalQuantity) && newTotalQuantity >= 0) {
        const delta = newTotalQuantity - oldTotalQuantity;
        // Never let available quantity go negative or exceed the new total
        updateData.quantity = Math.max(0, Math.min(newTotalQuantity, oldQuantity + delta));
        updateData.totalQuantity = newTotalQuantity;
      } else {
        delete updateData.totalQuantity;
      }
    }

    // Add updatedAt timestamp
    updateData.updatedAt = require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp();

    await bookRef.update(updateData);

    res.json({
      success: true,
      message: 'Book updated successfully'
    });

  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete book by ID (soft delete)
// @route   DELETE /api/admin/books/:id
// @access  Private (Admin only)
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID provided'
      });
    }

    const bookRef = require('../config/firebaseAdmin').firestore.collection('books').doc(id);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Soft delete by setting isActive to false
    await bookRef.update({
      isActive: false,
      deletedAt: require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });

  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all handbags for admin
// @route   GET /api/admin/handbags
// @access  Private (Admin only)
const getAllHandbags = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search,
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      available: req.query.available,
      featured: req.query.featured,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await handbagService.getHandbags(filters);

    res.json({
      success: true,
      count: result.handbags.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      handbags: result.handbags
    });

  } catch (error) {
    console.error('Get all handbags error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching handbags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add new book
// @route   POST /api/admin/books
// @access  Private (Admin only)
const addBook = async (req, res) => {
  try {
    console.log('AddBook request received:', {
      body: req.body,
      files: req.file ? 'File present' : 'No file',
      user: req.user?.uid
    });

    const {
      title,
      author,
      description,
      quantity,
      totalQuantity,
      genre,
      category,
      condition,
      language,
      publicationYear,
      publisher,
      pages,
      shelfLocation,
      googleBooksImageUrl
    } = req.body;

    // Use totalQuantity if provided, otherwise use quantity
    const bookQuantity = totalQuantity || quantity;

    // Validate required fields with safe checking
    // NOTE: description is intentionally optional (frontend marks it as such)
    if (!title?.trim() || !author?.trim() || !bookQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, and quantity are required',
        received: { title, author, description, quantity: bookQuantity }
      });
    }

    // Handle image data safely - prioritize uploaded file over Google Books URL
    let imageData = null;
    if (req.imageData) {
      imageData = req.imageData;
    } else if (googleBooksImageUrl?.trim()) {
      imageData = googleBooksImageUrl.trim();
    }

    // Safely parse numeric fields with defaults
    const safeParseInt = (value, defaultValue = 0) => {
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const bookData = {
      title: title.trim(),
      author: author.trim(),
      description: description?.trim() || '',
      imageData,
      quantity: safeParseInt(bookQuantity, 1),
      totalQuantity: safeParseInt(bookQuantity, 1),
      genre: category?.trim() || genre?.trim() || 'Other',
      condition: condition?.trim() || 'Good',
      language: language?.trim() || 'English',
      publicationYear: publicationYear ? safeParseInt(publicationYear) : null,
      publisher: publisher?.trim() || null,
      pages: pages ? safeParseInt(pages) : null,
      shelfLocation: shelfLocation?.trim() || 'General'
    };

    console.log('Creating book with data:', bookData);

    const book = await bookService.createBook(bookData, req.user.uid);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book
    });

  } catch (error) {
    console.error('Add book error - Full details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Handle Firestore-specific errors
    if (error.code === 3) { // INVALID_ARGUMENT
      return res.status(400).json({
        success: false,
        message: 'Invalid book data provided',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Handle authentication/permission errors
    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({
        success: false,
        message: 'Permission denied - invalid Firebase credentials'
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Error adding book to database',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

// @desc    Add stock to existing book
// @route   PUT /api/admin/books/:id/add-stock
// @access  Private (Admin only)
const addBookStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const bookRef = require('../config/firebaseAdmin').firestore.collection('books').doc(id);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const bookData = bookDoc.data();
    if (!bookData.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add stock to inactive book'
      });
    }

    // Add to both quantity and totalQuantity
    const addQuantity = parseInt(quantity);
    await bookRef.update({
      quantity: (bookData.quantity || 0) + addQuantity,
      totalQuantity: (bookData.totalQuantity || 0) + addQuantity,
      updatedAt: require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: `Added ${addQuantity} copies to book stock`,
      book: {
        id: bookDoc.id,
        title: bookData.title,
        quantity: (bookData.quantity || 0) + addQuantity,
        totalQuantity: (bookData.totalQuantity || 0) + addQuantity
      }
    });

  } catch (error) {
    console.error('Add book stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding book stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update handbag by ID
// @route   PUT /api/admin/handbags/:id
// @access  Private (Admin only)
const updateHandbag = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid handbag ID provided'
      });
    }

    const handbagRef = require('../config/firebaseAdmin').firestore.collection('handbags').doc(id);
    const handbagDoc = await handbagRef.get();

    if (!handbagDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    // Handle size and price validation if being updated
    if (updateData.size || updateData.price) {
      const sizePriceMap = {
        'Small': 20,
        'Medium': 30,
        'Large': 100,
        'Extra Large': 150
      };

      const currentData = handbagDoc.data();
      const newSize = updateData.size || currentData.size;
      const newPrice = parseFloat(updateData.price || currentData.price);

      if (sizePriceMap[newSize] && newPrice !== sizePriceMap[newSize]) {
        return res.status(400).json({
          success: false,
          message: `Price for ${newSize} handbags must be ₹${sizePriceMap[newSize]}`
        });
      }
    }

    // Handle quantity update properly
    if (updateData.quantity !== undefined) {
      const currentData = handbagDoc.data();
      const currentQuantity = parseInt(currentData.quantity) || 0;
      const currentTotalQuantity = parseInt(currentData.totalQuantity) || currentQuantity;
      const newQuantity = parseInt(updateData.quantity) || 0;
      
      // If we're increasing quantity, adjust totalQuantity accordingly
      if (newQuantity > currentQuantity) {
        const quantityIncrease = newQuantity - currentQuantity;
        updateData.totalQuantity = currentTotalQuantity + quantityIncrease;
      }
      // If we're setting a new quantity that's less than current, keep totalQuantity as is
      // This preserves the sold count logic
    }

    // Handle image update if a new image was uploaded
    if (req.imageData) {
      updateData.imageData = req.imageData;
    }

    // Add updatedAt timestamp
    updateData.updatedAt = require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp();

    await handbagRef.update(updateData);

    res.json({
      success: true,
      message: 'Handbag updated successfully'
    });

  } catch (error) {
    console.error('Update handbag error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating handbag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add new handbag
// @route   POST /api/admin/handbags
// @access  Private (Admin only)
const addHandbag = async (req, res) => {
  try {
    const {
      title,
      price,
      quantity,
      size
    } = req.body;

    // Validate required fields
    if (!title || !price || !quantity || !size) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, quantity, and size are required'
      });
    }

    // Validate image upload
    if (!req.imageData) {
      return res.status(400).json({
        success: false,
        message: 'Handbag image is required'
      });
    }

    // Validate price
    if (parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Validate size and ensure price matches
    const sizePriceMap = {
      'Small': 20,
      'Medium': 30,
      'Large': 100,
      'Extra Large': 150
    };

    if (!sizePriceMap[size]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid size selected'
      });
    }

    if (parseFloat(price) !== sizePriceMap[size]) {
      return res.status(400).json({
        success: false,
        message: 'Price must match the selected size'
      });
    }

    const handbagData = {
      title: title.trim(),
      price: parseFloat(price),
      size: size.trim(),
      imageData: req.imageData,
      quantity: parseInt(quantity),
      totalQuantity: parseInt(quantity)
    };

    const handbag = await handbagService.createHandbag(handbagData, req.user.uid);

    res.status(201).json({
      success: true,
      message: 'Handbag added successfully',
      handbag
    });

  } catch (error) {
    console.error('Add handbag error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding handbag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update book quantity
// @route   PUT /api/admin/books/:id/quantity
// @access  Private (Admin only)
const updateBookQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    const bookRef = require('../config/firebaseAdmin').firestore.collection('books').doc(req.params.id);
    const bookDoc = await bookRef.get();

    if (!bookDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const bookData = bookDoc.data();
    const oldQuantity = bookData.quantity || 0;
    const newQuantity = parseInt(quantity);
    
    const updateData = {
      quantity: newQuantity,
      updatedAt: require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp()
    };

    // Update total quantity if increasing
    if (newQuantity > (bookData.totalQuantity || 0)) {
      updateData.totalQuantity = newQuantity;
    }

    await bookRef.update(updateData);

    res.json({
      success: true,
      message: 'Book quantity updated successfully',
      book: {
        id: bookDoc.id,
        title: bookData.title,
        oldQuantity,
        newQuantity,
        isAvailable: newQuantity > 0
      }
    });

  } catch (error) {
    console.error('Update book quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book quantity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update handbag quantity
// @route   PUT /api/admin/handbags/:id/quantity
// @access  Private (Admin only)
const updateHandbagQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    const handbagRef = require('../config/firebaseAdmin').firestore.collection('handbags').doc(req.params.id);
    const handbagDoc = await handbagRef.get();

    if (!handbagDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    const handbagData = handbagDoc.data();
    const oldQuantity = handbagData.quantity || 0;
    const newQuantity = parseInt(quantity);
    
    const updateData = {
      quantity: newQuantity,
      updatedAt: require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp()
    };

    // Update total quantity if increasing
    if (newQuantity > (handbagData.totalQuantity || 0)) {
      updateData.totalQuantity = newQuantity;
    }

    await handbagRef.update(updateData);

    res.json({
      success: true,
      message: 'Handbag quantity updated successfully',
      handbag: {
        id: handbagDoc.id,
        title: handbagData.title,
        oldQuantity,
        newQuantity,
        isAvailable: newQuantity > 0
      }
    });

  } catch (error) {
    console.error('Update handbag quantity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating handbag quantity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access  Private (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await orderService.getOrders(filters);

    res.json({
      success: true,
      count: result.orders.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      orders: result.orders
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    console.log('Update order status request:', {
      orderId: req.params.id,
      requestBody: req.body,
      status,
      note
    });

    // BUSINESS RULE: Valid statuses for handbag orders
    const validStatuses = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'EXPIRED',
      'CANCELLED'
    ];
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    if (!validStatuses.includes(status)) {
      console.error('Invalid status provided:', status, 'Valid statuses:', validStatuses);
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    const orderDoc = await db.collection('orders').doc(req.params.id).get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderData = orderDoc.data();
    const currentStatus = orderData.status || orderData.orderStatus;

    // BUSINESS RULE: Restore stock when order is EXPIRED or CANCELLED
    // Only restore if it hasn't been picked up (stock was already consumed at order creation)
    const shouldRestoreStock =
      (status === 'EXPIRED' || status === 'CANCELLED') &&
      currentStatus !== 'PICKED_UP' &&
      currentStatus !== 'EXPIRED' &&
      currentStatus !== 'CANCELLED';

    if (shouldRestoreStock) {
      const batch = db.batch();

      for (const item of orderData.items || []) {
        if (!item.handbagId) continue;
        const handbagRef = db.collection('handbags').doc(item.handbagId);
        const handbagDoc = await handbagRef.get();

        if (handbagDoc.exists) {
          const restoredQuantity = (handbagDoc.data().quantity || 0) + (item.quantity || 1);
          batch.update(handbagRef, {
            quantity: restoredQuantity,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      }

      await batch.commit();
      console.log(`Stock restored for order ${req.params.id} (${status})`);
    }

    // Update order status (update both fields for compatibility)
    await db.collection('orders').doc(req.params.id).update({
      status: status,
      orderStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: req.user.uid,
      ...(status === 'PICKED_UP' && { pickedUpAt: FieldValue.serverTimestamp() }),
      ...(status === 'EXPIRED' && { expiredAt: FieldValue.serverTimestamp() })
    });

    // Add status history entry
    await db.collection('orders').doc(req.params.id).collection('statusHistory').add({
      status,
      timestamp: FieldValue.serverTimestamp(),
      note: note || getStatusMessage(status),
      updatedBy: req.user.uid,
      updatedByRole: 'admin'
    });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        id: req.params.id,
        status,
        updatedAt: new Date()
      }
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

// Helper function to get default status messages
const getStatusMessage = (status) => {
  const messages = {
    'PENDING_PICKUP': 'Order confirmed. Please call NGO to schedule pickup.',
    'PICKED_UP':      'Order successfully picked up by customer.',
    'EXPIRED':        'Order expired. Stock has been restored.',
    'CANCELLED':      'Order cancelled. Stock has been restored.'
  };
  return messages[status] || `Status updated to ${status}`;
};

// @desc    Check and expire orders past pickup deadline
// @route   POST /api/admin/orders/check-expired
// @access  Private (Admin only)
const checkExpiredOrders = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all orders that are PENDING_PICKUP and past deadline
    const ordersSnapshot = await db.collection('orders')
      .where('status', '==', 'PENDING_PICKUP')
      .get();
    
    let expiredCount = 0;
    const batch = db.batch();
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const pickupDeadline = orderData.pickupDeadline?.toDate();
      
      if (pickupDeadline && now > pickupDeadline) {
        // Mark as expired (write both fields for compatibility)
        batch.update(orderDoc.ref, {
          status: 'EXPIRED',
          orderStatus: 'EXPIRED',
          expiredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastModifiedBy: 'system'
        });
        
        // Restore stock
        for (const item of orderData.items || []) {
          if (!item.handbagId) continue;
          const handbagRef = db.collection('handbags').doc(item.handbagId);
          const handbagDoc = await handbagRef.get();
          
          if (handbagDoc.exists) {
            const restoredQuantity = (handbagDoc.data().quantity || 0) + (item.quantity || 1);
            batch.update(handbagRef, {
              quantity: restoredQuantity,
              updatedAt: FieldValue.serverTimestamp()
            });
          }
        }
        
        // Add status history
        const statusHistoryRef = db.collection('orders').doc(orderDoc.id).collection('statusHistory').doc();
        batch.set(statusHistoryRef, {
          status: 'EXPIRED',
          timestamp: FieldValue.serverTimestamp(),
          note: 'Order expired automatically - pickup window closed. Stock restored.',
          updatedBy: 'system',
          updatedByRole: 'system'
        });
        
        expiredCount++;
      }
    }
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `${expiredCount} orders expired and stock restored`,
      expiredCount
    });
    
  } catch (error) {
    console.error('Check expired orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking expired orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all donations for admin
// @route   GET /api/admin/donations
// @access  Private (Admin only)
const getAllDonations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      urgent,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    if (status) {
      query.donationStatus = status;
    }
    if (urgent === 'true') {
      query.isUrgent = true;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const donations = await Donation.find(query)
      .populate('donor', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Donation.countDocuments(query);

    res.json({
      success: true,
      count: donations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      donations: donations.map(donation => ({
        ...donation.toObject(),
        priorityScore: donation.getPriorityScore()
      }))
    });

  } catch (error) {
    console.error('Get all donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update donation status
// @route   PUT /api/admin/donations/:id/status
// @access  Private (Admin only)
const updateDonationStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'confirmed', 'pickup_scheduled', 'collected', 'processed', 'added_to_library', 'declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid donation status'
      });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    await donation.updateStatus(status, note || `Status updated by admin to ${status}`, req.user.id);

    res.json({
      success: true,
      message: 'Donation status updated successfully',
      donation: {
        id: donation._id,
        donationNumber: donation.donationNumber,
        donationStatus: donation.donationStatus,
        updatedAt: donation.updatedAt
      }
    });

  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating donation status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/admin/recent-activities
// @access  Private (Admin only)
const getRecentActivities = async (req, res) => {
  try {
    const activities = [];

    // Get recent orders from Firestore - simplified query
    try {
      const ordersSnapshot = await require('../config/firebaseAdmin').firestore
        .collection('orders')
        .limit(10)
        .get();
      
      const orders = [];
      ordersSnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        orders.push({
          type: 'order',
          description: `New order ${orderData.orderNumber || doc.id} by ${orderData.userEmail || 'User'}`,
          createdAt: orderData.createdAt?.toDate ? orderData.createdAt.toDate() : new Date(),
          amount: orderData.totalAmount || 0
        });
      });

      // Sort orders by createdAt and add to activities
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      activities.push(...orders.slice(0, 5));
    } catch (orderError) {
      console.warn('Error fetching orders for activities:', orderError);
    }

    // Get recent donations from Firestore - simplified query
    try {
      const donationsSnapshot = await require('../config/firebaseAdmin').firestore
        .collection('donations')
        .limit(10)
        .get();
      
      const donations = [];
      donationsSnapshot.docs.forEach(doc => {
        const donationData = doc.data();
        // Filter book donations
        if (donationData.type === 'book') {
          donations.push({
            type: 'book_donation',
            description: `Book donation: "${donationData.title || 'Unknown'}" by ${donationData.donorEmail || 'Anonymous'}`,
            createdAt: donationData.createdAt?.toDate ? donationData.createdAt.toDate() : new Date()
          });
        }
      });

      // Sort donations by createdAt and add to activities
      donations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      activities.push(...donations.slice(0, 5));
    } catch (donationError) {
      console.warn('Error fetching donations for activities:', donationError);
    }

    // Sort all activities by date and limit to 10
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      activities: activities.slice(0, 10)
    });

  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get top books
// @route   GET /api/admin/top-books
// @access  Private (Admin only)
const getTopBooks = async (req, res) => {
  try {
    // Get books from Firestore - fetch more books to filter and sort
    const booksSnapshot = await db.collection('books')
      .where('isActive', '==', true)
      .get();
    
    const books = [];
    booksSnapshot.docs.forEach(doc => {
      const bookData = doc.data();
      const quantity = bookData.quantity || 0;
      const totalQuantity = bookData.totalQuantity || 0;
      const borrowed = Math.max(0, totalQuantity - quantity);
      
      books.push({
        id: doc.id,
        title: bookData.title || 'Untitled',
        author: bookData.author || 'Unknown Author',
        genre: bookData.genre || 'Other',
        quantity,
        totalQuantity,
        borrowed,
        image: bookData.imageData || null
      });
    });

    // Sort by most borrowed (highest borrowed count first) and limit to 5
    const topBooks = books
      .sort((a, b) => b.borrowed - a.borrowed)
      .slice(0, 5);

    res.json({
      success: true,
      books: topBooks
    });

  } catch (error) {
    console.error('Get top books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get top handbags
// @route   GET /api/admin/top-handbags
// @access  Private (Admin only)
const getTopHandbags = async (req, res) => {
  try {
    // Get handbags from Firestore
    const handbagsSnapshot = await db.collection('handbags')
      .where('isActive', '==', true)
      .get();
    
    const handbags = [];
    handbagsSnapshot.docs.forEach(doc => {
      const handbagData = doc.data();
      const quantity = handbagData.quantity || 0;
      const totalQuantity = handbagData.totalQuantity || 0;
      const sold = Math.max(0, totalQuantity - quantity);
      
      handbags.push({
        id: doc.id,
        title: handbagData.title || 'Untitled',
        size: handbagData.size || 'Unknown',
        price: handbagData.price || 0,
        quantity,
        totalQuantity,
        sold,
        image: handbagData.imageData || null
      });
    });

    // Sort by most sold (highest sold count first) and limit to 5
    const topHandbags = handbags
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.json({
      success: true,
      handbags: topHandbags
    });

  } catch (error) {
    console.error('Get top handbags error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top handbags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single handbag by ID for admin
// @route   GET /api/admin/handbags/:id
// @access  Private (Admin only)
const getHandbagById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid handbag ID provided'
      });
    }

    const handbagRef = require('../config/firebaseAdmin').firestore.collection('handbags').doc(id);
    const handbagDoc = await handbagRef.get();

    if (!handbagDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    const handbag = { id: handbagDoc.id, ...handbagDoc.data() };

    res.json({
      success: true,
      handbag
    });

  } catch (error) {
    console.error('Get handbag by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching handbag details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete handbag by ID for admin
// @route   DELETE /api/admin/handbags/:id
// @access  Private (Admin only)
const deleteHandbag = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid handbag ID provided'
      });
    }

    const handbagRef = require('../config/firebaseAdmin').firestore.collection('handbags').doc(id);
    const handbagDoc = await handbagRef.get();

    if (!handbagDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    // Soft delete by setting isActive to false
    await handbagRef.update({
      isActive: false,
      deletedAt: require('../config/firebaseAdmin').admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Handbag deleted successfully'
    });

  } catch (error) {
    console.error('Delete handbag error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting handbag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get handbag sales data for admin
// @route   GET /api/admin/handbags/:id/sales-data
// @access  Private (Admin only)
const getHandbagSalesData = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid handbag ID provided'
      });
    }

    const handbagRef = require('../config/firebaseAdmin').firestore.collection('handbags').doc(id);
    const handbagDoc = await handbagRef.get();

    if (!handbagDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    const handbag = { id: handbagDoc.id, ...handbagDoc.data() };

    // Mock sales data for now - replace with real Order queries later
    const mockSalesData = [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        quantity: 2,
        revenue: handbag.price * 2,
        customer: { name: 'Sarah Johnson', email: 'sarah@example.com' }
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        quantity: 1,
        revenue: handbag.price,
        customer: { name: 'Mike Chen', email: 'mike@example.com' }
      },
      {
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
        quantity: 3,
        revenue: handbag.price * 3,
        customer: { name: 'Emma Davis', email: 'emma@example.com' }
      }
    ];

    res.json({
      success: true,
      sales: mockSalesData,
      summary: {
        totalSold: mockSalesData.reduce((sum, sale) => sum + sale.quantity, 0),
        totalRevenue: mockSalesData.reduce((sum, sale) => sum + sale.revenue, 0),
        averageOrderValue: mockSalesData.length > 0 
          ? mockSalesData.reduce((sum, sale) => sum + sale.revenue, 0) / mockSalesData.length 
          : 0
      }
    });

  } catch (error) {
    console.error('Get handbag sales data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching handbag sales data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all book requests for admin
// @route   GET /api/admin/book-requests
// @access  Private (Admin only)
const getAllBookRequests = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await bookRequestService.getBookRequests(filters);

    // Ensure dates are properly formatted for frontend
    const formattedRequests = result.requests.map(request => ({
      id: request.id,
      status: request.status || 'PENDING',
      userId: request.userId,
      bookId: request.bookId,
      userEmail: request.userEmail || request.userData?.email || 'Unknown User',
      userName: request.userName || request.userData?.name || '',
      userPhone: request.userPhone || request.userData?.phoneNumber || request.userData?.phone || '',
      createdAt: request.createdAt || new Date().toISOString(),
      updatedAt: request.updatedAt || new Date().toISOString(),
      dueDate: request.dueDate || null,
      pickedUpAt: request.pickedUpAt || null,
      returnedAt: request.returnedAt || null,
      bookData: request.bookData || request.book || { title: 'Unknown Book', author: 'Unknown Author' },
      userData: {
        ...(request.userData || request.user || {}),
        name: request.userData?.name || request.userName || request.userEmail || 'Unknown User',
        email: request.userData?.email || request.userEmail || '',
        phoneNumber: request.userPhone || request.userData?.phoneNumber || request.userData?.phone || ''
      }
    }));

    res.json({
      success: true,
      count: formattedRequests.length,
      total: result.total || 0,
      totalPages: result.totalPages || 0,
      currentPage: result.currentPage || 1,
      requests: formattedRequests
    });

  } catch (error) {
    console.error('Get all book requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update book request status
// @route   PUT /api/admin/book-requests/:id/status
// @access  Private (Admin only)
const updateBookRequestStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    // BUSINESS RULE: Valid statuses for book requests
    const validStatuses = [
      'PENDING', 
      'ACCEPTED', 
      'REJECTED', 
      'PICKED_UP', 
      'RETURNED'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    const request = await bookRequestService.getBookRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Book request not found'
      });
    }

    // Handle inventory management based on status changes
    let inventoryUpdated = false;
    try {
      const bookService = require('../services/bookService');
      const book = await bookService.getBookById(request.bookId);
      
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Associated book not found'
        });
      }

      // ── Inventory logic ────────────────────────────────────────────────────
      // Quantity is reduced when user PLACES the request.
      // So we only need to RESTORE quantity when the book won't be borrowed:
      //   - REJECTED from PENDING   → user never got it, restore
      //   - REJECTED from ACCEPTED  → user never got it, restore
      //   - RETURNED from PICKED_UP → user returned it, restore
      // No change needed for ACCEPTED or PICKED_UP transitions.

      if (
        status === 'REJECTED' &&
        ['PENDING', 'ACCEPTED'].includes(request.status)
      ) {
        // Restore stock — book won't be borrowed
        await bookService.updateBookQuantity(request.bookId, (book.quantity + 1));
        inventoryUpdated = true;
      } else if (status === 'RETURNED' && request.status === 'PICKED_UP') {
        // Book returned — restore stock
        await bookService.updateBookQuantity(request.bookId, (book.quantity + 1));
        inventoryUpdated = true;
      }
    } catch (inventoryError) {
      console.error('Error updating book inventory:', inventoryError);
      // Don't fail the entire request, just log the error
    }

    // Set due date for accepted requests (1 month from acceptance)
    let dueDateData = {};
    if (status === 'ACCEPTED') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days borrowing period
      dueDateData.dueDate = dueDate;
    } else if (status === 'PICKED_UP') {
      // Set pickup date
      dueDateData.pickedUpAt = new Date();
    } else if (status === 'RETURNED') {
      // Set return date
      dueDateData.returnedAt = new Date();
    }

    await bookRequestService.updateBookRequestStatus(
      req.params.id, 
      status, 
      note || getBookRequestStatusMessage(status), 
      req.user.uid,
      dueDateData
    );

    res.json({
      success: true,
      message: getBookRequestStatusMessage(status),
      request: {
        id: req.params.id,
        status,
        updatedAt: new Date(),
        inventoryUpdated,
        ...dueDateData
      }
    });

  } catch (error) {
    console.error('Update book request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book request status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function for book request status messages
const getBookRequestStatusMessage = (status) => {
  const messages = {
    'PENDING':   'Book request is pending admin review.',
    'ACCEPTED':  'Book request accepted! Coordinate with the NGO to schedule pickup.',
    'REJECTED':  'Book request has been rejected.',
    'PICKED_UP': 'Book has been picked up. Please return within 30 days.',
    'RETURNED':  'Book has been returned successfully. Thank you!'
  };
  return messages[status] || 'Status updated successfully.';
};

module.exports = {
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
};