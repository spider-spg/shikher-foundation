const { firestore, admin } = require('../config/firebaseAdmin');

/**
 * Book service functions for Firestore operations
 */

// Create a new book
const createBook = async (bookData, addedBy) => {
  try {
    const bookRef = firestore.collection('books').doc();
    const bookDoc = {
      ...bookData,
      addedBy,
      isActive: true,
      totalQuantity: bookData.quantity || 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await bookRef.set(bookDoc);
    return { id: bookRef.id, ...bookDoc };
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
};

// Get all books with filtering and pagination
const getBooks = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      genre,
      condition,
      available,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Start with the simplest possible query to avoid index issues
    let query = firestore.collection('books').where('isActive', '==', true);

    // Skip all filters for now to avoid composite index issues
    // Get a reasonable number of documents
    query = query.limit(1000);

    const querySnapshot = await query.get();
    let books = [];

    for (const doc of querySnapshot.docs) {
      const bookData = { id: doc.id, ...doc.data() };
      
      // Add user data for addedBy
      if (bookData.addedBy) {
        const userRef = firestore.collection('users').doc(bookData.addedBy);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          bookData.addedByUser = { id: userSnap.id, name: userSnap.data().name };
        }
      }

      // Apply search and other filters client-side
      let includeItem = true;

      // Apply genre filter
      if (genre && bookData.genre !== genre) {
        includeItem = false;
      }

      // Apply condition filter
      if (condition && bookData.condition !== condition) {
        includeItem = false;
      }

      // Apply availability filter
      if (available === 'true' && (!bookData.quantity || bookData.quantity <= 0)) {
        includeItem = false;
      }

      // Apply search filter if needed
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !bookData.title?.toLowerCase().includes(searchLower) &&
          !bookData.author?.toLowerCase().includes(searchLower) &&
          !bookData.description?.toLowerCase().includes(searchLower)
        ) {
          includeItem = false;
        }
      }

      if (includeItem) {
        books.push(bookData);
      }
    }

    // Client-side sorting to avoid index requirements
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    books.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle timestamps
      if (aVal && typeof aVal.toDate === 'function') aVal = aVal.toDate();
      if (bVal && typeof bVal.toDate === 'function') bVal = bVal.toDate();
      
      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    // Client-side pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBooks = books.slice(startIndex, endIndex);

    // Get total count for pagination
    const countQuery = firestore.collection('books').where('isActive', '==', true);
    const countSnapshot = await countQuery.get();
    const total = countSnapshot.size;

    return {
      books: paginatedBooks,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    };
  } catch (error) {
    console.error('Error getting books:', error);
    throw error;
  }
};

// Get a single book by ID
const getBookById = async (bookId) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    const bookSnap = await bookRef.get();
    
    if (!bookSnap.exists) {
      return null;
    }

    const bookData = { id: bookSnap.id, ...bookSnap.data() };

    // Get addedBy user data
    if (bookData.addedBy) {
      const userRef = firestore.collection('users').doc(bookData.addedBy);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        bookData.addedByUser = { id: userSnap.id, name: userSnap.data().name };
      }
    }

    // Calculate availability
    bookData.isAvailable = bookData.isActive !== false && bookData.quantity > 0;

    return bookData;
  } catch (error) {
    console.error('Error getting book:', error);
    throw error;
  }
};

// Update book
const updateBook = async (bookId, updateData) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    const updatedData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await bookRef.update(updatedData);
    return getBookById(bookId);
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
};

// Delete book (soft delete)
const deleteBook = async (bookId) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    await bookRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

// Update book quantity directly
const updateBookQuantity = async (bookId, newQuantity) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    const bookDoc = await bookRef.get();
    
    if (!bookDoc.exists) {
      throw new Error('Book not found');
    }
    
    await bookRef.update({
      quantity: Math.max(0, newQuantity), // Ensure quantity doesn't go below 0
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating book quantity:', error);
    throw error;
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  updateBookQuantity
};