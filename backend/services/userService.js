const { firestore, auth, admin } = require('../config/firebaseAdmin');

/**
 * User service functions for Firestore operations
 */

// Create a new user document in Firestore
const createUserDocument = async (uid, userData) => {
  try {
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = {
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      role: userData.role || 'customer'
    };
    
    await userRef.set(userDoc);
    
    // Verify the document was created
    const createdDoc = await userRef.get();
    if (!createdDoc.exists) {
      throw new Error('User document was not created successfully');
    }
    
    return { id: uid, ...userDoc };
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

// Get user document by UID
const getUserDocument = async (uid) => {
  try {
    const userRef = firestore.collection('users').doc(uid);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return null;
    }
    
    return { id: userSnap.id, ...userSnap.data() };
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

// Update user document
const updateUserDocument = async (uid, updateData) => {
  try {
    const userRef = firestore.collection('users').doc(uid);
    const updatedData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await userRef.update(updatedData);
    return getUserDocument(uid);
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    const usersRef = firestore.collection('users');
    const querySnap = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
    
    if (querySnap.empty) {
      return null;
    }
    
    const userDoc = querySnap.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

// Get user cart items
const getUserCart = async (uid) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');
    const cartSnap = await cartRef.get();
    
    const cartItems = [];
    for (const doc of cartSnap.docs) {
      const cartItem = { id: doc.id, ...doc.data() };

      // If cart record doesn't have a valid handbag id, remove it to keep cart clean
      if (!cartItem.handbag) {
        try {
          console.warn(`Removing invalid cart item for user ${uid}: cartDoc=${doc.id}`);
          await doc.ref.delete();
        } catch (delErr) {
          console.error('Failed to remove invalid cart item:', delErr);
        }
        continue; // skip adding this item to the returned list
      }

      // Populate handbag data
      if (cartItem.handbag) {
        const handbagRef = firestore.collection('handbags').doc(cartItem.handbag);
        const handbagSnap = await handbagRef.get();
        if (handbagSnap.exists) {
          cartItem.handbagData = { id: handbagSnap.id, ...handbagSnap.data() };
        }
      }

      cartItems.push(cartItem);
    }
    
    return cartItems;
  } catch (error) {
    console.error('Error getting user cart:', error);
    throw error;
  }
};

// Add item to cart
const addToCart = async (uid, itemData) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');
    
    // Handle both old format (handbagId, quantity) and new format (itemData object)
    let handbagId, quantity, itemInfo = {};
    
    if (typeof itemData === 'string') {
      // Old format: addToCart(uid, handbagId, quantity)
      handbagId = itemData;
      quantity = arguments[2] || 1;
    } else {
      // New format: addToCart(uid, { type, itemId, quantity, price, name, image })
      handbagId = itemData.itemId;
      quantity = itemData.quantity || 1;
      itemInfo = {
        type: itemData.type || 'handbag',
        price: itemData.price || 0,
        name: itemData.name || '',
        image: itemData.image || ''
      };
    }
    
    // Check if item already exists in cart
    const existingItemQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();
    
    if (!existingItemQuery.empty) {
      // Update existing item quantity
      const existingDoc = existingItemQuery.docs[0];
      const currentQuantity = existingDoc.data().quantity || 0;
      
      const updateData = {
        quantity: currentQuantity + quantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add item info if provided, filtering out undefined values
      Object.keys(itemInfo).forEach(key => {
        if (itemInfo[key] !== undefined && itemInfo[key] !== null) {
          updateData[key] = itemInfo[key];
        }
      });
      
      await existingDoc.ref.update(updateData);
    } else {
      // Add new item to cart
      const newCartItem = {
        handbag: handbagId,
        quantity,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add item info if provided, filtering out undefined values
      Object.keys(itemInfo).forEach(key => {
        if (itemInfo[key] !== undefined && itemInfo[key] !== null) {
          newCartItem[key] = itemInfo[key];
        }
      });
      
      await cartRef.add(newCartItem);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

// Remove item from cart
const removeFromCart = async (uid, handbagId) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');
    const itemQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();
    
    if (!itemQuery.empty) {
      await itemQuery.docs[0].ref.delete();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
};

// Clear user cart
const clearCart = async (uid) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');
    const cartSnap = await cartRef.get();
    
    const batch = firestore.batch();
    cartSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};

// Update cart item quantity
const updateCartQuantity = async (uid, handbagId, quantity) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');
    
    // Find the cart item for this handbag
    const cartItemQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();
    
    if (cartItemQuery.empty) {
      throw new Error('Cart item not found');
    }
    
    const cartItemDoc = cartItemQuery.docs[0];
    
    // Update the quantity
    await cartItemDoc.ref.update({
      quantity: quantity,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    throw error;
  }
};

// Get user borrowed books
const getUserBorrowedBooks = async (uid) => {
  try {
    const borrowedRef = firestore.collection('users').doc(uid).collection('borrowedBooks');
    const borrowedSnap = await borrowedRef.where('returned', '==', false).get();
    
    const borrowedBooks = [];
    for (const doc of borrowedSnap.docs) {
      const borrowedBook = { id: doc.id, ...doc.data() };
      
      // Populate book data
      if (borrowedBook.book) {
        const bookRef = firestore.collection('books').doc(borrowedBook.book);
        const bookSnap = await bookRef.get();
        if (bookSnap.exists) {
          borrowedBook.bookData = { id: bookSnap.id, ...bookSnap.data() };
        }
      }
      
      borrowedBooks.push(borrowedBook);
    }
    
    return borrowedBooks;
  } catch (error) {
    console.error('Error getting user borrowed books:', error);
    throw error;
  }
};

// Set custom claims for user role
const setUserRole = async (uid, role) => {
  try {
    await auth.setCustomUserClaims(uid, { role });
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

module.exports = {
  createUserDocument,
  getUserDocument,
  updateUserDocument,
  findUserByEmail,
  getUserCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getUserBorrowedBooks,
  setUserRole
};