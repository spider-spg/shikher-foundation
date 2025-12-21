const { firestore, admin } = require('../config/firebaseAdmin');

/**
 * Book Request service functions for Firestore operations
 * BUSINESS RULE: Books are not directly purchasable - users submit requests
 */

// Create a new book request
const createBookRequest = async (requestData) => {
  try {
    const requestRef = firestore.collection('bookRequests').doc();
    const requestDoc = {
      ...requestData,
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await requestRef.set(requestDoc);
    return { id: requestRef.id, ...requestDoc };
  } catch (error) {
    console.error('Error creating book request:', error);
    throw error;
  }
};

// Get all book requests with filtering and pagination
const getBookRequests = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      bookId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    let query = firestore.collection('bookRequests');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (bookId) {
      query = query.where('bookId', '==', bookId);
    }

    // Get all documents first (to avoid composite index issues)
    const querySnapshot = await query.get();
    let requests = [];

    for (const doc of querySnapshot.docs) {
      const requestData = { id: doc.id, ...doc.data() };
      
      // Convert Firestore timestamps to proper dates
      if (requestData.createdAt && requestData.createdAt.toDate) {
        requestData.createdAt = requestData.createdAt.toDate().toISOString();
      }
      if (requestData.updatedAt && requestData.updatedAt.toDate) {
        requestData.updatedAt = requestData.updatedAt.toDate().toISOString();
      }
      if (requestData.dueDate && requestData.dueDate.toDate) {
        requestData.dueDate = requestData.dueDate.toDate().toISOString();
      }
      if (requestData.pickedUpAt && requestData.pickedUpAt.toDate) {
        requestData.pickedUpAt = requestData.pickedUpAt.toDate().toISOString();
      }
      if (requestData.returnedAt && requestData.returnedAt.toDate) {
        requestData.returnedAt = requestData.returnedAt.toDate().toISOString();
      }
      
      // Get user data
      if (requestData.userId) {
        const userRef = firestore.collection('users').doc(requestData.userId);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          requestData.userData = {
            id: userSnap.id,
            name: userData.name || userData.displayName || userData.email,
            email: userData.email
          };
          // Keep backward compatibility
          requestData.user = requestData.userData;
        }
      }

      // Get book data
      if (requestData.bookId) {
        const bookRef = firestore.collection('books').doc(requestData.bookId);
        const bookSnap = await bookRef.get();
        if (bookSnap.exists) {
          requestData.bookData = { id: bookSnap.id, ...bookSnap.data() };
          // Keep backward compatibility
          requestData.book = requestData.bookData;
        }
      }

      requests.push(requestData);
    }

    // Client-side sorting
    requests.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date fields
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'dueDate') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = requests.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    return {
      requests: paginatedRequests,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    };
  } catch (error) {
    console.error('Error getting book requests:', error);
    throw error;
  }
};

// Get a single book request by ID
const getBookRequestById = async (requestId) => {
  try {
    const requestRef = firestore.collection('bookRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    
    if (!requestSnap.exists) {
      return null;
    }

    const requestData = { id: requestSnap.id, ...requestSnap.data() };

    // Get user data
    if (requestData.userId) {
      const userRef = firestore.collection('users').doc(requestData.userId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        requestData.user = {
          id: userSnap.id,
          name: userData.name || userData.displayName || userData.email,
          email: userData.email
        };
      }
    }

    // Get book data
    if (requestData.bookId) {
      const bookRef = firestore.collection('books').doc(requestData.bookId);
      const bookSnap = await bookRef.get();
      if (bookSnap.exists) {
        requestData.book = { id: bookSnap.id, ...bookSnap.data() };
      }
    }

    return requestData;
  } catch (error) {
    console.error('Error getting book request:', error);
    throw error;
  }
};

// Update book request status
const updateBookRequestStatus = async (requestId, status, adminNote = '', adminId = null, additionalData = {}) => {
  try {
    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'RETURNED'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Valid statuses: ${validStatuses.join(', ')}`);
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    };

    if (adminNote) {
      updateData.adminNote = adminNote;
    }
    
    if (adminId) {
      updateData.lastModifiedBy = adminId;
    }

    // Add status-specific fields
    switch (status) {
      case 'ACCEPTED':
        updateData.acceptedAt = admin.firestore.FieldValue.serverTimestamp();
        if (adminId) updateData.acceptedBy = adminId;
        // Set due date (30 days from acceptance)
        if (!additionalData.dueDate) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          updateData.dueDate = admin.firestore.Timestamp.fromDate(dueDate);
        }
        break;
      case 'REJECTED':
        updateData.rejectedAt = admin.firestore.FieldValue.serverTimestamp();
        if (adminId) updateData.rejectedBy = adminId;
        break;
      case 'PICKED_UP':
        updateData.pickedUpAt = admin.firestore.FieldValue.serverTimestamp();
        break;
      case 'RETURNED':
        updateData.returnedAt = admin.firestore.FieldValue.serverTimestamp();
        break;
    }

    await firestore.collection('bookRequests').doc(requestId).update(updateData);

    // Add status history entry
    await firestore.collection('bookRequests').doc(requestId).collection('statusHistory').add({
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note: adminNote || getDefaultStatusMessage(status),
      updatedBy: adminId || 'system',
      updatedByRole: adminId ? 'admin' : 'system'
    });

    return true;
  } catch (error) {
    console.error('Error updating book request status:', error);
    throw error;
  }
};

// Helper function for default status messages
const getDefaultStatusMessage = (status) => {
  const messages = {
    'PENDING': 'Book request is pending admin review.',
    'ACCEPTED': 'Book request accepted! Please call the NGO to schedule pickup: +91-9324335478',
    'REJECTED': 'Book request has been rejected.',
    'PICKED_UP': 'Book has been picked up. Please return within 30 days.',
    'RETURNED': 'Book has been returned successfully. Thank you!'
  };
  return messages[status] || `Status updated to ${status}`;
};

module.exports = {
  createBookRequest,
  getBookRequests,
  getBookRequestById,
  updateBookRequestStatus
};