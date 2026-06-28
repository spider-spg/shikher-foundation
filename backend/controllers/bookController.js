const bookService = require('../services/bookService');

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
        totalQuantity: book.totalQuantity,
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
        condition: book.condition,
        language: book.language,
        publicationYear: book.publicationYear,
        isAvailable: book.quantity > 0 && book.isActive,
        addedBy: book.addedBy,
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

module.exports = {
  getBooks: getAllBooks,
  getBook
};
