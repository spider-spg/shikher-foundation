const { firestore, auth, admin } = require('../config/firebaseAdmin');

/**
 * User service functions for Firestore operations
 */

const CART_EXPIRY_DAYS = 7; // Items expire from cart after 7 days

// ─── User document helpers ────────────────────────────────────────────────────

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
    const createdDoc = await userRef.get();
    if (!createdDoc.exists) throw new Error('User document was not created successfully');
    return { id: uid, ...userDoc };
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

const getUserDocument = async (uid) => {
  try {
    const userRef = firestore.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return null;
    return { id: userSnap.id, ...userSnap.data() };
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

const updateUserDocument = async (uid, updateData) => {
  try {
    const userRef = firestore.collection('users').doc(uid);
    await userRef.update({ ...updateData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return getUserDocument(uid);
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

const findUserByEmail = async (email) => {
  try {
    const usersRef = firestore.collection('users');
    const querySnap = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
    if (querySnap.empty) return null;
    const userDoc = querySnap.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

// ─── Cart helpers ─────────────────────────────────────────────────────────────

/**
 * Restore stock for a single cart item back to the handbag document.
 * Called when an item is removed from cart or expires.
 */
const _restoreHandbagStock = async (handbagId, quantity) => {
  try {
    const handbagRef = firestore.collection('handbags').doc(handbagId);
    await firestore.runTransaction(async (t) => {
      const snap = await t.get(handbagRef);
      if (!snap.exists) return;
      const current = snap.data().quantity || 0;
      t.update(handbagRef, {
        quantity: current + quantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (err) {
    console.error(`Failed to restore stock for handbag ${handbagId}:`, err);
    // Non-fatal — log and continue
  }
};

// ─── Get user cart ────────────────────────────────────────────────────────────

/**
 * Fetch the user's cart.
 * • Expired items (older than CART_EXPIRY_DAYS) are deleted and their stock
 *   is restored to the handbag document automatically.
 * • Invalid items (no handbag field) are silently cleaned up.
 */
const getUserCart = async (uid) => {
  try {
    const cartRef  = firestore.collection('users').doc(uid).collection('cart');
    const cartSnap = await cartRef.get();
    const now      = Date.now();

    const cartItems = [];

    for (const doc of cartSnap.docs) {
      const cartItem = { id: doc.id, ...doc.data() };

      // ── Clean up items with no handbag reference ──────────────────────────
      if (!cartItem.handbag) {
        console.warn(`Removing invalid cart item for user ${uid}: cartDoc=${doc.id}`);
        await doc.ref.delete();
        continue;
      }

      // ── Auto-expire items older than 7 days ───────────────────────────────
      const expiresAt = cartItem.reservedUntil
        ? (cartItem.reservedUntil.toDate
            ? cartItem.reservedUntil.toDate().getTime()
            : new Date(cartItem.reservedUntil).getTime())
        : null;

      if (expiresAt && now > expiresAt) {
        console.log(`Cart item expired for user ${uid}, handbag ${cartItem.handbag}. Restoring ${cartItem.quantity} units.`);
        await _restoreHandbagStock(cartItem.handbag, cartItem.quantity || 1);
        await doc.ref.delete();
        continue; // don't include in returned cart
      }

      // ── Populate handbag data ─────────────────────────────────────────────
      const handbagRef  = firestore.collection('handbags').doc(cartItem.handbag);
      const handbagSnap = await handbagRef.get();
      if (handbagSnap.exists) {
        cartItem.handbagData = { id: handbagSnap.id, ...handbagSnap.data() };
        // Surface handbag as nested object for front-end compatibility
        cartItem.handbag = { id: handbagSnap.id, ...handbagSnap.data() };
      }

      // Attach expiry info for the front end
      cartItem.reservedUntil = expiresAt ? new Date(expiresAt) : null;

      cartItems.push(cartItem);
    }

    return cartItems;
  } catch (error) {
    console.error('Error getting user cart:', error);
    throw error;
  }
};

// ─── Add to cart ──────────────────────────────────────────────────────────────

/**
 * Add a handbag to the user's cart.
 * • Validates that enough stock is available BEFORE adding.
 * • Decrements the handbag's inventory by the requested quantity.
 * • Stores reservedUntil = now + 7 days on the cart document.
 *
 * If the item is already in the cart (user is increasing qty):
 * • Only decrements the DELTA (new qty − old qty) from inventory.
 */
const addToCart = async (uid, itemData) => {
  try {
    const cartRef = firestore.collection('users').doc(uid).collection('cart');

    // Normalise both call signatures
    let handbagId, quantity, itemInfo = {};
    if (typeof itemData === 'string') {
      handbagId = itemData;
      quantity  = 1;
    } else {
      handbagId = itemData.itemId;
      quantity  = itemData.quantity || 1;
      itemInfo  = {
        type:  itemData.type  || 'handbag',
        price: itemData.price || 0,
        name:  itemData.name  || '',
        image: itemData.image || ''
      };
    }

    // ── Fetch current handbag stock ───────────────────────────────────────
    const handbagRef  = firestore.collection('handbags').doc(handbagId);
    const handbagSnap = await handbagRef.get();
    if (!handbagSnap.exists) throw new Error('Handbag not found');
    const handbagData   = handbagSnap.data();
    const currentStock  = handbagData.quantity || 0;

    // ── Check if item already in cart ─────────────────────────────────────
    const existingQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();
    const existingQty   = existingQuery.empty ? 0 : (existingQuery.docs[0].data().quantity || 0);

    // Qty delta = how many MORE units we actually need to take from stock
    const delta = quantity; // addToCart always adds ON TOP of existing qty

    if (currentStock < delta) {
      throw new Error(
        `Only ${currentStock} unit${currentStock !== 1 ? 's' : ''} available in stock`
      );
    }

    const reservedUntil = new Date(Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await firestore.runTransaction(async (t) => {
      // Re-read stock inside transaction for safety
      const freshSnap  = await t.get(handbagRef);
      const freshStock = freshSnap.data().quantity || 0;
      if (freshStock < delta) {
        throw new Error(`Only ${freshStock} unit${freshStock !== 1 ? 's' : ''} available in stock`);
      }

      // Decrement stock
      t.update(handbagRef, {
        quantity:  freshStock - delta,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update or create cart item
      if (!existingQuery.empty) {
        const existingDoc = existingQuery.docs[0];
        t.update(existingDoc.ref, {
          quantity:       existingQty + quantity,
          reservedUntil:  reservedUntil,
          updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
          ...Object.fromEntries(Object.entries(itemInfo).filter(([, v]) => v != null))
        });
      } else {
        const newItemRef = cartRef.doc();
        t.set(newItemRef, {
          handbag:       handbagId,
          quantity,
          reservedUntil,
          addedAt:       admin.firestore.FieldValue.serverTimestamp(),
          updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
          ...Object.fromEntries(Object.entries(itemInfo).filter(([, v]) => v != null))
        });
      }
    });

    return true;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

// ─── Remove from cart ─────────────────────────────────────────────────────────

/**
 * Remove a handbag from the cart.
 * Restores the reserved quantity back to the handbag's stock.
 */
const removeFromCart = async (uid, handbagId) => {
  try {
    const cartRef   = firestore.collection('users').doc(uid).collection('cart');
    const itemQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();

    if (itemQuery.empty) return false;

    const cartDoc = itemQuery.docs[0];
    const qty     = cartDoc.data().quantity || 0;

    // Restore stock first, then delete cart item
    await _restoreHandbagStock(handbagId, qty);
    await cartDoc.ref.delete();

    return true;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
};

// ─── Clear cart ───────────────────────────────────────────────────────────────

/**
 * Clear the entire cart (called after a successful order).
 * Does NOT restore inventory — stock was already decremented at order-placement.
 */
const clearCart = async (uid) => {
  try {
    const cartRef  = firestore.collection('users').doc(uid).collection('cart');
    const cartSnap = await cartRef.get();
    const batch    = firestore.batch();
    cartSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};

// ─── Update cart quantity ─────────────────────────────────────────────────────

/**
 * Change the quantity of an existing cart item.
 * • If new qty > old qty: check & decrement extra stock from handbag.
 * • If new qty < old qty: restore the difference back to handbag stock.
 * • If new qty === 0: delegate to removeFromCart.
 */
const updateCartQuantity = async (uid, handbagId, newQuantity) => {
  try {
    if (newQuantity < 1) return removeFromCart(uid, handbagId);

    const cartRef   = firestore.collection('users').doc(uid).collection('cart');
    const itemQuery = await cartRef.where('handbag', '==', handbagId).limit(1).get();

    if (itemQuery.empty) throw new Error('Cart item not found');

    const cartDoc = itemQuery.docs[0];
    const oldQty  = cartDoc.data().quantity || 0;
    const delta   = newQuantity - oldQty;

    if (delta === 0) return true;

    const handbagRef = firestore.collection('handbags').doc(handbagId);

    await firestore.runTransaction(async (t) => {
      const handbagSnap = await t.get(handbagRef);
      if (!handbagSnap.exists) throw new Error('Handbag not found');

      const currentStock = handbagSnap.data().quantity || 0;

      if (delta > 0) {
        // User wants more — check stock
        if (currentStock < delta) {
          throw new Error(`Only ${currentStock} additional unit${currentStock !== 1 ? 's' : ''} available`);
        }
        t.update(handbagRef, {
          quantity:  currentStock - delta,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // User reduced quantity — restore to stock
        t.update(handbagRef, {
          quantity:  currentStock + Math.abs(delta),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      t.update(cartDoc.ref, {
        quantity:  newQuantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return true;
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    throw error;
  }
};

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
  setUserRole
};