const bookService = require('../services/bookService');
const userService = require('../services/userService');
const { firestore } = require('../config/firebaseAdmin');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getAllBooks = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 1000,
      search: req.query.search,
      genre: req.query.genre,
      condition: req.query.condition,
      available: req.query.available,
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
      books: result.books.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        imageData: book.imageData,
        quantity: book.quantity,
        genre: book.genre,
        condition: book.condition,
        language: book.language,
        publicationYear: book.publicationYear,
        isAvailable: book.quantity > 0 && book.isActive,
        addedBy: book.addedBy,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt
      }))
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble loading the books right now. Please try again in a moment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBook = async (req, res) => {
  try {
    const book = await bookService.getBookById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'The book you\'re looking for is not available or has been removed from our collection'
      });
    }

    // Check if current user has borrowed this book (if authenticated)
    let userHasBorrowed = false;
    if (req.user) {
      userHasBorrowed = await bookService.isBorrowedByUser(req.params.id, req.user.uid);
    }

    res.json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        imageData: book.imageData,
        quantity: book.quantity,
        totalQuantity: book.totalQuantity,
        genre: book.genre,
        isbn: book.isbn,
        condition: book.condition,
        language: book.language,
        publicationYear: book.publicationYear,
        isAvailable: book.isAvailable,
        currentlyBorrowed: book.currentlyBorrowed,
        totalTimesBorrowed: book.totalTimesBorrowed,
        userHasBorrowed,
        addedBy: book.addedBy,
        borrowHistory: book.borrowHistory,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt
      }
    });

  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble loading this book. Please try again in a moment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Borrow a book
// @route   POST /api/books/:id/borrow
// @access  Private (Customer only)
const borrowBookById = async (req, res) => {
  try {
    const { pickupLocation, borrowDays = 14 } = req.body;

    if (!pickupLocation) {
      return res.status(400).json({
        success: false,
        message: 'Please specify where you would like to pick up the book'
      });
    }

    const book = await bookService.getBookById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'This book is currently not available. All copies may already be borrowed or it might be under review'
      });
    }

    // Check if user already borrowed this book
    const hasBorrowed = await bookService.isBorrowedByUser(req.params.id, req.user.uid);
    if (hasBorrowed) {
      return res.status(400).json({
        success: false,
        message: 'You have already borrowed this book. Please return it before borrowing it again'
      });
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(borrowDays));

    // Borrow the book
    await bookService.borrowBook(req.params.id, req.user.uid, dueDate, pickupLocation);

    res.json({
      success: true,
      message: 'Book borrowed successfully',
      borrowDetails: {
        bookId: book.id,
        title: book.title,
        dueDate,
        pickupLocation,
        borrowedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Borrow book error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble processing your book borrowing request. Please try again in a moment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Return a book
// @route   POST /api/books/:id/return
// @access  Private (Customer only)
const returnBookById = async (req, res) => {
  try {
    const bookId = req.params.id;
    const { borrowId } = req.body;
    
    // If borrowId is provided, use it to return the specific borrow record
    if (borrowId) {
      const result = await bookService.returnBookByBorrowId(borrowId, req.user.uid);
      
      res.json({
        success: true,
        message: 'Book returned successfully',
        returnDetails: result
      });
    } else {
      // Original logic for returning by book ID
      const book = await bookService.getBookById(bookId);

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }

      // Check if user has borrowed this book
      const hasBorrowed = await bookService.isBorrowedByUser(bookId, req.user.uid);
      if (!hasBorrowed) {
        return res.status(400).json({
          success: false,
          message: 'You have not borrowed this book'
        });
      }

      // Return the book
      const result = await bookService.returnBook(bookId, req.user.uid);

      res.json({
        success: true,
        message: 'Book returned successfully',
        returnDetails: {
          bookId: book.id,
          title: book.title,
          returnedAt: new Date(),
          lateFee: result.lateFee
        }
      });
    }

  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's borrowed books
// @route   GET /api/books/my-shelf
// @access  Private (Customer only)
const getMyShelf = async (req, res) => {
  try {
    const borrowedBooks = await userService.getUserBorrowedBooks(req.user.uid);

    const activeBorrowedBooks = borrowedBooks.map(item => ({
      id: item.id,
      book: item.bookData,
      borrowDate: item.borrowedAt,
      dueDate: item.dueDate,
      pickupLocation: item.pickupLocation,
      isOverdue: new Date() > new Date(item.dueDate.seconds * 1000),
      daysUntilDue: Math.ceil((new Date(item.dueDate.seconds * 1000) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      count: activeBorrowedBooks.length,
      borrowedBooks: activeBorrowedBooks
    });

  } catch (error) {
    console.error('Get shelf error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching borrowed books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get book genres
// @route   GET /api/books/genres
// @access  Public
const getGenres = async (req, res) => {
  try {
    const { firestore } = require('../config/firebaseAdmin');
    const booksRef = firestore.collection('books');
    const snapshot = await booksRef.where('isActive', '==', true).get();
    
    const genresSet = new Set();
    snapshot.forEach(doc => {
      const genre = doc.data().genre;
      if (genre && genre.trim() !== '') {
        genresSet.add(genre);
      }
    });
    
    res.json({
      success: true,
      genres: Array.from(genresSet)
    });

  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble loading the books right now. Please try again in a moment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get borrowing history for a user
// @route   GET /api/books/history
// @access  Private (Customer only)
const getBorrowingHistory = async (req, res) => {
  try {
    const borrowingHistory = await userService.getUserBorrowHistory(req.user.uid);

    res.json({
      success: true,
      count: borrowingHistory.length,
      history: borrowingHistory
    });

  } catch (error) {
    console.error('Get borrowing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching borrowing history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Donate a book
// @route   POST /api/books/donate
// @access  Private (Customer only)
const donateBook = async (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      category,
      description,
      condition,
      quantity,
      language = 'English',
      publishedYear,
      publisher,
      donorMessage
    } = req.body;

    // Validate required fields
    if (!title || !author || !category || !description || !condition) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, author, category, description, and condition'
      });
    }

    // Get image data from middleware (base64)
    const imageData = req.imageData || null;

    const donationData = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn?.trim(),
      category: category.trim(),
      description: description.trim(),
      condition,
      quantity: parseInt(quantity) || 1,
      language: language || 'English',
      publishedYear: publishedYear || null,
      publisher: publisher?.trim(),
      donorMessage: donorMessage?.trim(),
      imageData,
      donor: req.user.uid,
      status: 'Pending'
    };

    const donationService = require('../services/donationService');
    const bookDonation = await donationService.createBookDonation(donationData);

    res.status(201).json({
      success: true,
      message: 'Book donation submitted successfully! It will be reviewed by our admin team.',
      bookDonation: {
        id: bookDonation.id,
        title: bookDonation.title,
        author: bookDonation.author,
        status: bookDonation.status,
        createdAt: bookDonation.createdAt
      }
    });

  } catch (error) {
    console.error('Donate book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting book donation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getBooks: getAllBooks,
  getBook,
  borrowBook: borrowBookById,
  returnBook: returnBookById,
  getMyShelf,
  getGenres,
  getBorrowingHistory,
  donateBook
};