const { firestore, admin } = require('../config/firebaseAdmin');

/**
 * Handbag service functions for Firestore operations
 */

// Create a new handbag
const createHandbag = async (handbagData, addedBy) => {
  try {
    const handbagRef = firestore.collection('handbags').doc();
    const handbagDoc = {
      ...handbagData,
      addedBy,
      isActive: true,
      isFeatured: handbagData.isFeatured || false,
      totalQuantity: handbagData.quantity || 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await handbagRef.set(handbagDoc);
    return { id: handbagRef.id, ...handbagDoc };
  } catch (error) {
    console.error('Error creating handbag:', error);
    throw error;
  }
};

// Get all handbags with filtering and pagination
const getHandbags = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      available,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Start with the simplest possible query to avoid index issues  
    let query = firestore.collection('handbags').where('isActive', '==', true);

    // Skip all filters for now to avoid composite index issues
    // Get a reasonable number of documents
    query = query.limit(1000);

    const querySnapshot = await query.get();
    let handbags = [];

    for (const doc of querySnapshot.docs) {
      const handbagData = { id: doc.id, ...doc.data() };
      
      // Add user data for addedBy
      if (handbagData.addedBy) {
        const userRef = firestore.collection('users').doc(handbagData.addedBy);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          handbagData.addedByUser = { id: userSnap.id, name: userSnap.data().name };
        }
      }

      // Apply search and price filters if needed
      let includeItem = true;

      // Apply category filter
      if (category && handbagData.category !== category) {
        includeItem = false;
      }

      // Apply availability filter
      if (available === 'true' && (!handbagData.quantity || handbagData.quantity <= 0)) {
        includeItem = false;
      }

      // Apply featured filter
      if (featured === 'true' && !handbagData.isFeatured) {
        includeItem = false;
      }

      if (search) {
        const searchLower = search.toLowerCase();
        includeItem = includeItem && (
          handbagData.title?.toLowerCase().includes(searchLower) ||
          handbagData.description?.toLowerCase().includes(searchLower) ||
          handbagData.designerName?.toLowerCase().includes(searchLower)
        );
      }

      if (minPrice && handbagData.price < parseFloat(minPrice)) {
        includeItem = false;
      }

      if (maxPrice && handbagData.price > parseFloat(maxPrice)) {
        includeItem = false;
      }

      if (includeItem) {
        // Calculate average rating
        if (handbagData.reviews && handbagData.reviews.length > 0) {
          const totalRating = handbagData.reviews.reduce((sum, review) => sum + review.rating, 0);
          handbagData.averageRating = (totalRating / handbagData.reviews.length).toFixed(1);
        } else {
          handbagData.averageRating = 0;
        }

        handbags.push(handbagData);
      }
    }

    // Client-side sorting to avoid index requirements
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    handbags.sort((a, b) => {
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
    const paginatedHandbags = handbags.slice(startIndex, endIndex);

    // Get total count for pagination
    const countQuery = firestore.collection('handbags').where('isActive', '==', true);
    const countSnapshot = await countQuery.get();
    const total = countSnapshot.size;

    return {
      handbags: paginatedHandbags,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    };
  } catch (error) {
    console.error('Error getting handbags:', error);
    throw error;
  }
};

// Get a single handbag by ID
const getHandbagById = async (handbagId) => {
  try {
    // Validate handbagId
    if (!handbagId || typeof handbagId !== 'string' || handbagId.trim() === '') {
      console.log('Invalid handbagId provided:', handbagId);
      // Log call stack to help trace where invalid id originates
      try {
        const stack = new Error('Invalid handbagId stack').stack;
        console.log(stack);
      } catch (e) {
        // ignore
      }
      return null;
    }
    
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    const handbagSnap = await handbagRef.get();
    
    if (!handbagSnap.exists) {
      return null;
    }

    const handbagData = { id: handbagSnap.id, ...handbagSnap.data() };

    // Get addedBy user data
    if (handbagData.addedBy) {
      const userRef = firestore.collection('users').doc(handbagData.addedBy);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        handbagData.addedByUser = { id: userSnap.id, name: userSnap.data().name };
      }
    }

    // Get sales history
    const salesHistoryRef = firestore.collection('handbags').doc(handbagId).collection('salesHistory');
    const salesHistorySnap = await salesHistoryRef.orderBy('soldAt', 'desc').get();
    
    handbagData.salesHistory = [];
    let totalRevenue = 0;

    for (const doc of salesHistorySnap.docs) {
      const saleData = { id: doc.id, ...doc.data() };
      
      // Get user data for buyer
      if (saleData.user) {
        const userRef = firestore.collection('users').doc(saleData.user);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          saleData.userData = { id: userSnap.id, name: userSnap.data().name };
        }
      }
      
      totalRevenue += saleData.salePrice * saleData.quantity;
      handbagData.salesHistory.push(saleData);
    }

    handbagData.totalRevenue = totalRevenue;
    handbagData.totalSold = handbagData.totalQuantity - handbagData.quantity;

    // Get reviews
    const reviewsRef = firestore.collection('handbags').doc(handbagId).collection('reviews');
    const reviewsSnap = await reviewsRef.orderBy('createdAt', 'desc').get();
    
    handbagData.reviews = [];
    let totalRating = 0;

    for (const doc of reviewsSnap.docs) {
      const reviewData = { id: doc.id, ...doc.data() };
      
      // Get user data for reviewer
      if (reviewData.user) {
        const userRef = firestore.collection('users').doc(reviewData.user);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          reviewData.userData = { id: userSnap.id, name: userSnap.data().name };
        }
      }
      
      totalRating += reviewData.rating;
      handbagData.reviews.push(reviewData);
    }

    handbagData.averageRating = handbagData.reviews.length > 0 ? 
      (totalRating / handbagData.reviews.length).toFixed(1) : 0;

    return handbagData;
  } catch (error) {
    console.error('Error getting handbag:', error);
    throw error;
  }
};

// Update handbag
const updateHandbag = async (handbagId, updateData) => {
  try {
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    const updatedData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await handbagRef.update(updatedData);
    return getHandbagById(handbagId);
  } catch (error) {
    console.error('Error updating handbag:', error);
    throw error;
  }
};

// Delete handbag (soft delete)
const deleteHandbag = async (handbagId) => {
  try {
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    await handbagRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error deleting handbag:', error);
    throw error;
  }
};

// Sell handbag
const sellHandbag = async (handbagId, userId, quantityToSell, salePrice, orderId) => {
  try {
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    
    return await firestore.runTransaction(async (transaction) => {
      const handbagDoc = await transaction.get(handbagRef);
      
      if (!handbagDoc.exists) {
        throw new Error('Handbag not found');
      }

      const handbagData = handbagDoc.data();
      
      if (handbagData.quantity < quantityToSell) {
        throw new Error('Insufficient quantity available');
      }

      // Update handbag quantity
      transaction.update(handbagRef, {
        quantity: handbagData.quantity - quantityToSell,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add sales history record
      const salesHistoryRef = firestore.collection('handbags').doc(handbagId).collection('salesHistory').doc();
      transaction.set(salesHistoryRef, {
        user: userId,
        quantity: quantityToSell,
        salePrice,
        orderId,
        soldAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    });
  } catch (error) {
    console.error('Error selling handbag:', error);
    throw error;
  }
};

// Restock handbag
const restockHandbag = async (handbagId, additionalQuantity) => {
  try {
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    
    return await firestore.runTransaction(async (transaction) => {
      const handbagDoc = await transaction.get(handbagRef);
      
      if (!handbagDoc.exists) {
        throw new Error('Handbag not found');
      }

      const handbagData = handbagDoc.data();

      transaction.update(handbagRef, {
        quantity: handbagData.quantity + additionalQuantity,
        totalQuantity: handbagData.totalQuantity + additionalQuantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    });
  } catch (error) {
    console.error('Error restocking handbag:', error);
    throw error;
  }
};

// Add review
const addReview = async (handbagId, userId, rating, comment) => {
  try {
    const reviewsRef = firestore.collection('handbags').doc(handbagId).collection('reviews');
    
    // Check if user already reviewed this handbag
    const existingReviewQuery = await reviewsRef.where('user', '==', userId).limit(1).get();
    
    if (!existingReviewQuery.empty) {
      // Update existing review
      const existingReviewRef = existingReviewQuery.docs[0].ref;
      await existingReviewRef.update({
        rating,
        comment,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Add new review
      await reviewsRef.add({
        user: userId,
        rating,
        comment,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return true;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

module.exports = {
  createHandbag,
  getHandbags,
  getHandbagById,
  updateHandbag,
  deleteHandbag,
  sellHandbag,
  restockHandbag,
  addReview
};
