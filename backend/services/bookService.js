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

    // Get borrow history
    const borrowHistoryRef = firestore.collection('books').doc(bookId).collection('borrowHistory');
    const borrowHistorySnap = await borrowHistoryRef.orderBy('borrowedAt', 'desc').get();
    
    bookData.borrowHistory = [];
    for (const doc of borrowHistorySnap.docs) {
      const historyData = { id: doc.id, ...doc.data() };
      
      // Get user data for borrower
      if (historyData.user) {
        const userRef = firestore.collection('users').doc(historyData.user);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          historyData.userData = { id: userSnap.id, name: userSnap.data().name };
        }
      }
      
      bookData.borrowHistory.push(historyData);
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

// Borrow book
const borrowBook = async (bookId, userId, dueDate, pickupLocation) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    
    return await firestore.runTransaction(async (transaction) => {
      const bookDoc = await transaction.get(bookRef);
      
      if (!bookDoc.exists) {
        throw new Error('Book not found');
      }

      const bookData = bookDoc.data();
      
      if (bookData.quantity <= 0) {
        throw new Error('Book is not available for borrowing');
      }

      // Update book quantity
      transaction.update(bookRef, {
        quantity: bookData.quantity - 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add borrow history record
      const borrowHistoryRef = firestore.collection('books').doc(bookId).collection('borrowHistory').doc();
      transaction.set(borrowHistoryRef, {
        user: userId,
        borrowedAt: admin.firestore.FieldValue.serverTimestamp(),
        dueDate: new Date(dueDate),
        pickupLocation,
        returned: false
      });

      // Add to user's borrowed books
      const userBorrowedRef = firestore.collection('users').doc(userId).collection('borrowedBooks').doc();
      transaction.set(userBorrowedRef, {
        book: bookId,
        borrowedAt: admin.firestore.FieldValue.serverTimestamp(),
        dueDate: new Date(dueDate),
        pickupLocation,
        returned: false
      });

      return true;
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    throw error;
  }
};

// Return book
const returnBook = async (bookId, userId) => {
  try {
    const bookRef = firestore.collection('books').doc(bookId);
    
    return await firestore.runTransaction(async (transaction) => {
      const bookDoc = await transaction.get(bookRef);
      
      if (!bookDoc.exists) {
        throw new Error('Book not found');
      }

      const bookData = bookDoc.data();

      // Find active borrow record
      const borrowHistoryRef = firestore.collection('books').doc(bookId).collection('borrowHistory');
      const activeBorrowQuery = await borrowHistoryRef
        .where('user', '==', userId)
        .where('returned', '==', false)
        .limit(1)
        .get();

      if (activeBorrowQuery.empty) {
        throw new Error('No active borrow record found');
      }

      const borrowDoc = activeBorrowQuery.docs[0];
      const borrowData = borrowDoc.data();

      // Calculate late fee if applicable
      let lateFee = 0;
      const now = new Date();
      if (now > borrowData.dueDate.toDate()) {
        const daysLate = Math.ceil((now - borrowData.dueDate.toDate()) / (1000 * 60 * 60 * 24));
        lateFee = daysLate * 10; // $10 per day late
      }

      // Update book quantity
      transaction.update(bookRef, {
        quantity: bookData.quantity + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update borrow history
      transaction.update(borrowDoc.ref, {
        returned: true,
        returnedAt: admin.firestore.FieldValue.serverTimestamp(),
        lateFee
      });

      // Update user's borrowed books
      const userBorrowedRef = firestore.collection('users').doc(userId).collection('borrowedBooks');
      const userBorrowQuery = await userBorrowedRef
        .where('book', '==', bookId)
        .where('returned', '==', false)
        .limit(1)
        .get();

      if (!userBorrowQuery.empty) {
        transaction.update(userBorrowQuery.docs[0].ref, {
          returned: true,
          returnedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return { success: true, lateFee };
    });
  } catch (error) {
    console.error('Error returning book:', error);
    throw error;
  }
};

// Check if a book is borrowed by a specific user
const isBorrowedByUser = async (bookId, userId) => {
  try {
    const borrowHistoryRef = firestore.collection('books').doc(bookId).collection('borrowHistory');
    const activeBorrowQuery = await borrowHistoryRef
      .where('user', '==', userId)
      .where('returned', '==', false)
      .limit(1)
      .get();
    
    return !activeBorrowQuery.empty;
  } catch (error) {
    console.error('Error checking if book is borrowed by user:', error);
    throw error;
  }
};

// Return book by borrow ID
const returnBookByBorrowId = async (borrowId, userId) => {
  try {
    // Find the borrow record in user's collection
    const userBorrowedRef = firestore.collection('users').doc(userId).collection('borrowedBooks').doc(borrowId);
    const borrowDoc = await userBorrowedRef.get();
    
    if (!borrowDoc.exists) {
      throw new Error('Borrow record not found');
    }
    
    const borrowData = borrowDoc.data();
    
    if (borrowData.returned) {
      throw new Error('Book has already been returned');
    }
    
    const bookId = borrowData.book;
    const bookRef = firestore.collection('books').doc(bookId);
    
    return await firestore.runTransaction(async (transaction) => {
      const bookDoc = await transaction.get(bookRef);
      
      if (!bookDoc.exists) {
        throw new Error('Book not found');
      }

      const bookData = bookDoc.data();

      // Calculate late fee if applicable
      let lateFee = 0;
      const now = new Date();
      if (now > borrowData.dueDate.toDate()) {
        const daysLate = Math.ceil((now - borrowData.dueDate.toDate()) / (1000 * 60 * 60 * 24));
        lateFee = daysLate * 10; // $10 per day late
      }

      // Update book quantity
      transaction.update(bookRef, {
        quantity: (bookData.quantity || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update user's borrowed books record
      transaction.update(userBorrowedRef, {
        returned: true,
        returnedAt: admin.firestore.FieldValue.serverTimestamp(),
        lateFee
      });

      // Also update the book's borrow history if it exists
      const borrowHistoryRef = firestore.collection('books').doc(bookId).collection('borrowHistory');
      const historyQuery = await borrowHistoryRef
        .where('user', '==', userId)
        .where('borrowedAt', '==', borrowData.borrowedAt)
        .where('returned', '==', false)
        .limit(1)
        .get();

      if (!historyQuery.empty) {
        transaction.update(historyQuery.docs[0].ref, {
          returned: true,
          returnedAt: admin.firestore.FieldValue.serverTimestamp(),
          lateFee
        });
      }

      return { 
        success: true, 
        lateFee,
        bookId,
        title: bookData.title,
        returnedAt: new Date()
      };
    });
  } catch (error) {
    console.error('Error returning book by borrow ID:', error);
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
  borrowBook,
  returnBook,
  returnBookByBorrowId,
  isBorrowedByUser,
  updateBookQuantity
};