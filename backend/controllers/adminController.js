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
        borrowed: 0,
        outOfStock: 0
      },
      handbags: {
        total: 0,
        available: 0,
        sold: 0,
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
        completed: 0
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
        const quantity = bookData.quantity || 0;
        const totalQuantity = bookData.totalQuantity || 0;
        
        dashboard.books.available += quantity;
        dashboard.books.borrowed += Math.max(0, totalQuantity - quantity);
        
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

    // Get handbags statistics
    try {
      const handbagsSnapshot = await db.collection('handbags').where('isActive', '==', true).get();
      dashboard.handbags.total = handbagsSnapshot.size;
      
      handbagsSnapshot.docs.forEach(doc => {
        const handbagData = doc.data();
        const quantity = parseInt(handbagData.quantity) || 0;
        const totalQuantity = parseInt(handbagData.totalQuantity) || quantity;
        
        // Ensure totalQuantity is never less than current quantity
        const adjustedTotalQuantity = Math.max(totalQuantity, quantity);
        const sold = Math.max(0, adjustedTotalQuantity - quantity);
        
        dashboard.handbags.available += quantity;
        dashboard.handbags.sold += sold;
        
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
      });
    } catch (error) {
      console.warn('Error fetching handbags data:', error);
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
          case 'PAID_PENDING_PICKUP':
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

    // Get donations statistics
    try {
      const donationsSnapshot = await db.collection('donations').where('type', '==', 'book').get();
      dashboard.donations.total = donationsSnapshot.size;
      
      donationsSnapshot.docs.forEach(doc => {
        const donationData = doc.data();
        const status = donationData.status || donationData.donationStatus;
        
        switch (status) {
          case 'Pending':
            dashboard.donations.pending++;
            break;
          case 'Approved':
            dashboard.donations.approved++;
            break;
          case 'Added to Library':
            dashboard.donations.completed++;
            break;
        }
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

    res.json({
      success: true,
      count: result.books.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      books: result.books
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
// @route   GET /api/admin/books/:id/borrow-history
// @access  Private (Admin only)
const getBookBorrowHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID provided'
      });
    }

    // For now, return mock data since we don't have a borrow tracking system yet
    // In a real implementation, you would have a BorrowRecord model
    const mockBorrowHistory = [
      {
        _id: '1',
        user: {
          _id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        borrowedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        returnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'returned',
        notes: 'Book returned in good condition'
      },
      {
        _id: '2',
        user: {
          _id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        borrowedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        returnedAt: null,
        dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
        status: 'active',
        notes: null
      }
    ];

    res.json({
      success: true,
      history: mockBorrowHistory,
      totalRecords: mockBorrowHistory.length
    });

  } catch (error) {
    console.error('Get book borrow history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching borrow history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
      isbn,
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
    if (!title?.trim() || !author?.trim() || !description?.trim() || !bookQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, description, and quantity are required',
        received: { title, author, description, quantity: bookQuantity }
      });
    }

    // Generate unique ISBN if not provided
    let bookIsbn = isbn;
    if (!bookIsbn || bookIsbn.trim() === '') {
      bookIsbn = `MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // Handle image data safely - prioritize uploaded file over Google Books URL
    let imageData = null;
    if (req.imageData) {
      // From uploaded file (processed by middleware)
      imageData = req.imageData;
    } else if (googleBooksImageUrl?.trim()) {
      // From Google Books API
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
      description: description.trim(),
      imageData,
      quantity: safeParseInt(bookQuantity, 1),
      totalQuantity: safeParseInt(bookQuantity, 1),
      genre: category?.trim() || genre?.trim() || 'Other',
      isbn: bookIsbn.trim(),
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
    if (error.code === 6) { // ALREADY_EXISTS
      return res.status(400).json({
        success: false,
        message: 'A book with this ISBN already exists'
      });
    }

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

// @desc    Get book by ISBN
// @route   GET /api/admin/books/isbn/:isbn
// @access  Private (Admin only)
const getBookByISBN = async (req, res) => {
  try {
    const { isbn } = req.params;

    // Use Firebase service to get book by ISBN
    // For now, return a placeholder response since the service needs to be enhanced
    res.json({
      success: false,
      message: 'ISBN search not implemented for Firebase yet'
    });

  } catch (error) {
    console.error('Get book by ISBN error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book by ISBN',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      'PAID_PENDING_PICKUP', 
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

    // BUSINESS RULE: If order expires, restore stock
    if (status === 'EXPIRED' && (orderData.orderStatus === 'PAID_PENDING_PICKUP' || orderData.status === 'PAID_PENDING_PICKUP')) {
      // Restore stock for expired orders
      const batch = db.batch();
      
      for (const item of orderData.items || []) {
        const handbagRef = db.collection('handbags').doc(item.handbagId);
        const handbagDoc = await handbagRef.get();
        
        if (handbagDoc.exists) {
          const handbagData = handbagDoc.data();
          const restoredQuantity = (handbagData.quantity || 0) + item.quantity;
          
          batch.update(handbagRef, {
            quantity: restoredQuantity,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      }
      
      await batch.commit();
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
    'PAID_PENDING_PICKUP': 'Order paid. Please call NGO before visiting to collect.',
    'PICKED_UP': 'Order successfully picked up by customer.',
    'EXPIRED': 'Order expired. Pickup window closed.',
    'CANCELLED': 'Order cancelled.'
  };
  return messages[status] || `Status updated to ${status}`;
};

// @desc    Check and expire orders past pickup deadline
// @route   POST /api/admin/orders/check-expired
// @access  Private (Admin only)
const checkExpiredOrders = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all orders that are PAID_PENDING_PICKUP and past deadline
    const ordersSnapshot = await db.collection('orders')
      .where('orderStatus', '==', 'PAID_PENDING_PICKUP')
      .get();
    
    let expiredCount = 0;
    const batch = db.batch();
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      const pickupDeadline = orderData.pickupDeadline?.toDate();
      
      if (pickupDeadline && now > pickupDeadline) {
        // Mark as expired
        batch.update(orderDoc.ref, {
          orderStatus: 'EXPIRED',
          expiredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastModifiedBy: 'system'
        });
        
        // Restore stock
        for (const item of orderData.items || []) {
          const handbagRef = db.collection('handbags').doc(item.handbagId);
          const handbagDoc = await handbagRef.get();
          
          if (handbagDoc.exists) {
            const handbagData = handbagDoc.data();
            const restoredQuantity = (handbagData.quantity || 0) + item.quantity;
            
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
          note: 'Order expired automatically - pickup window closed',
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

// @desc    Get all book donations for admin
// @route   GET /api/admin/book-donations
// @access  Private (Admin only)
const getBookDonations = async (req, res) => {
  try {
    // Firebase implementation for book donations - simplified query to avoid composite index issues
    const donationsSnapshot = await require('../config/firebaseAdmin').firestore
      .collection('donations')
      .where('type', '==', 'book')
      .limit(50)
      .get();
    
    const bookDonations = [];
    
    for (const doc of donationsSnapshot.docs) {
      try {
        const donationData = doc.data();
        
        // Get donor information
        let donorInfo = { name: 'Anonymous', email: '' };
        if (donationData.donorId) {
          try {
            const userRef = require('../config/firebaseAdmin').firestore
              .collection('users')
              .doc(donationData.donorId);
            const userDoc = await userRef.get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              donorInfo = {
                name: userData.name || 'Anonymous',
                email: userData.email || ''
              };
            }
          } catch (userError) {
            console.warn('Error fetching donor info:', userError);
          }
        }
        
        // Map the donation data to match frontend expectations
        const mappedDonation = {
          _id: doc.id,
          id: doc.id,
          title: (donationData.book && donationData.book.title) || 'Untitled',
          author: (donationData.book && donationData.book.author) || 'Unknown Author',
          category: (donationData.book && donationData.book.genre) || 'Other',
          condition: (donationData.book && donationData.book.condition) || 'Good',
          isbn: (donationData.book && donationData.book.isbn) || '',
          language: (donationData.book && donationData.book.language) || 'English',
          publisher: (donationData.book && donationData.book.publisher) || '',
          quantity: donationData.quantity || 1,
          image: (donationData.images && donationData.images.length > 0) ? donationData.images[0] : null,
          status: donationData.donationStatus || 'pending',
          donor: donorInfo,
          donorMessage: donationData.donorMessage || '',
          createdAt: donationData.createdAt && donationData.createdAt.toDate ? donationData.createdAt.toDate() : new Date(),
          updatedAt: donationData.updatedAt && donationData.updatedAt.toDate ? donationData.updatedAt.toDate() : new Date()
        };
        
        bookDonations.push(mappedDonation);
      } catch (docError) {
        console.error('Error processing donation document:', docError);
        // Continue processing other documents
      }
    }

    // Sort client-side to avoid composite index issues
    bookDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: bookDonations.length,
      total: bookDonations.length,
      currentPage: 1,
      totalPages: 1,
      bookDonations
    });

  } catch (error) {
    console.error('Get book donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book donations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update book donation status
// @route   PUT /api/admin/book-donations/:id/status
// @access  Private (Admin only)
const updateBookDonationStatus = async (req, res) => {
  try {
    const donationId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Added to Library'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    // Get the donation first
    const donationDoc = await db.collection('donations').doc(donationId).get();
    
    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donationData = donationDoc.data();
    
    // Update the donation status
    await db.collection('donations').doc(donationId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: req.user.uid
    });

    // If status is 'Added to Library', also add the book to the books collection
    if (status === 'Added to Library' && donationData.type === 'book' && donationData.book) {
      const bookData = {
        title: donationData.book.title,
        author: donationData.book.author,
        genre: donationData.book.genre,
        isbn: donationData.book.isbn || '',
        description: donationData.book.description || '',
        publishedYear: donationData.book.publishedYear || new Date().getFullYear(),
        language: donationData.book.language || 'English',
        pages: donationData.book.pages || 0,
        publisher: donationData.book.publisher || '',
        availableCopies: 1,
        totalCopies: 1,
        imageUrl: donationData.book.imageUrl || '',
        addedBy: 'donation',
        donationId: donationId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await db.collection('books').add(bookData);
    }

    res.json({
      success: true,
      message: `Donation status updated to ${status}`,
      donation: {
        id: donationId,
        status,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Update book donation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating book donation status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove book donation from library
// @route   DELETE /api/admin/book-donations/:id/remove-from-library
// @access  Private (Admin only)
const removeBookDonationFromLibrary = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Remove book donation from library not implemented for Firebase yet'
    });
  } catch (error) {
    console.error('Remove book from library error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing book from library',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete book donation
// @route   DELETE /api/admin/book-donations/:id
// @access  Private (Admin only)
const deleteBookDonation = async (req, res) => {
  try {
    const donationId = req.params.id;

    // Check if donation exists
    const donationDoc = await db.collection('donations').doc(donationId).get();
    
    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donationData = donationDoc.data();
    
    // If the donation was already added to library, we should also remove from books collection
    if (donationData.status === 'Added to Library') {
      const booksSnapshot = await db.collection('books')
        .where('donationId', '==', donationId)
        .get();
      
      const batch = db.batch();
      booksSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Delete the donation
    await db.collection('donations').doc(donationId).delete();

    res.json({
      success: true,
      message: 'Book donation deleted successfully'
    });

  } catch (error) {
    console.error('Delete book donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting book donation',
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
      createdAt: request.createdAt || new Date().toISOString(),
      updatedAt: request.updatedAt || new Date().toISOString(),
      dueDate: request.dueDate || null,
      pickedUpAt: request.pickedUpAt || null,
      returnedAt: request.returnedAt || null,
      // Ensure book and user data are included with defaults
      bookData: request.bookData || request.book || { title: 'Unknown Book', author: 'Unknown Author' },
      userData: request.userData || request.user || { 
        name: request.userEmail || 'Unknown User', 
        email: request.userEmail || '' 
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

      // Update inventory based on status changes
      if (status === 'ACCEPTED' && request.status === 'PENDING') {
        // Decrease inventory when accepting request
        if ((book.quantity || 0) <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Book is out of stock and cannot be accepted'
          });
        }
        await bookService.updateBookQuantity(request.bookId, (book.quantity - 1));
        inventoryUpdated = true;
      } else if (status === 'RETURNED' && request.status === 'PICKED_UP') {
        // Increase inventory when book is returned
        await bookService.updateBookQuantity(request.bookId, (book.quantity + 1));
        inventoryUpdated = true;
      } else if (status === 'REJECTED' && request.status === 'ACCEPTED') {
        // Restore inventory if rejecting an accepted request
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
    'PENDING': 'Book request is pending admin review.',
    'ACCEPTED': 'Book request accepted! Please call the NGO to schedule pickup: +91-9324335478',
    'REJECTED': 'Book request has been rejected.',
    'PICKED_UP': 'Book has been picked up. Please return within 30 days.',
    'RETURNED': 'Book has been returned successfully. Thank you!'
  };
  return messages[status] || 'Status updated successfully.';
};

module.exports = {
  getDashboard,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBookBorrowHistory,
  addBook,
  getBookByISBN,
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
  getBookDonations,
  updateBookDonationStatus,
  removeBookDonationFromLibrary,
  deleteBookDonation,
  getAllBookRequests,
  updateBookRequestStatus,
  getRecentActivities,
  getTopBooks,
  getTopHandbags
};