const { firestore, admin } = require('../config/firebaseAdmin');

/**
 * Order service functions for Firestore operations
 */

// Create a new order
const createOrder = async (orderData) => {
  try {
    const orderRef = firestore.collection('orders').doc();
    const orderNumber = `NGO-${orderRef.id.slice(-8).toUpperCase()}`;
    
    const orderDoc = {
      ...orderData,
      orderNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await orderRef.set(orderDoc);
    return { id: orderRef.id, ...orderDoc };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Get all orders with filtering and pagination
const getOrders = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      userId,
      userEmail,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    let query = firestore.collection('orders');

    // Apply user filter - handle both userId and legacy userEmail for backward compatibility
    if (userId) {
      // For now, get all orders and filter on the client side to handle both userId and userEmail fields
      // This is a temporary solution for backward compatibility
    }

    const querySnapshot = await query.get();
    let orders = [];

    for (const doc of querySnapshot.docs) {
      const orderData = { id: doc.id, ...doc.data() };
      
      // Convert Firestore timestamps to JavaScript dates for sorting
      if (orderData.createdAt && orderData.createdAt.toDate) {
        orderData.createdAt = orderData.createdAt.toDate();
      }
      if (orderData.updatedAt && orderData.updatedAt.toDate) {
        orderData.updatedAt = orderData.updatedAt.toDate();
      }

      // Apply filters on client side
      // Filter by user (handle both userId and legacy userEmail for backward compatibility)
      if (userId || userEmail) {
        const matchesUser = (userId && orderData.userId === userId) || 
                           (userEmail && orderData.userEmail === userEmail);
        if (!matchesUser) {
          continue;
        }
      }
      
      if (status && orderData.orderStatus !== status) {
        continue;
      }
      if (paymentStatus && orderData.paymentInfo?.paymentStatus !== paymentStatus) {
        continue;
      }

      // Get user data
      if (orderData.userId) {
        try {
          const userRef = firestore.collection('users').doc(orderData.userId);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            orderData.userData = { id: userSnap.id, name: userSnap.data().name, email: userSnap.data().email };
          }
        } catch (userError) {
          console.warn('Error fetching user data:', userError);
          orderData.userData = { name: 'Unknown User', email: '' };
        }
      }

      // Get handbag data for items and populate missing image URLs
      if (orderData.items && orderData.items.length > 0) {
        for (let item of orderData.items) {
          // Check for handbagId (new format) or handbag (legacy format)
          const handbagId = item.handbagId || item.handbag;
          if (handbagId) {
            try {
              const handbagRef = firestore.collection('handbags').doc(handbagId);
              const handbagSnap = await handbagRef.get();
              if (handbagSnap.exists) {
                const handbagData = handbagSnap.data();
                item.handbagData = { id: handbagSnap.id, ...handbagData };
                
                // If the item doesn't have an image, populate it from handbag data
                if (!item.image && handbagData.image) {
                  item.image = handbagData.image;
                }
                // Also check imageData field (used in handbag listings)
                if (!item.image && handbagData.imageData) {
                  item.image = handbagData.imageData;
                }
                // Also check imageUrl field as fallback
                if (!item.image && handbagData.imageUrl) {
                  item.image = handbagData.imageUrl;
                }
              }
            } catch (handbagError) {
              console.warn('Error fetching handbag data:', handbagError);
              item.handbagData = { name: 'Unknown Item', price: 0 };
            }
          }
        }
      }

      // Calculate order number and totals
      orderData.orderNumber = `NGO-${orderData.id.slice(-8).toUpperCase()}`;
      orderData.totalItems = orderData.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
      orderData.isDelivered = orderData.orderStatus === 'delivered';
      orderData.isPaid = orderData.paymentInfo?.paymentStatus === 'completed';
      // Expose top-level paymentStatus and paymentMethod for frontend convenience
      orderData.paymentStatus = orderData.paymentInfo?.paymentStatus || orderData.paymentMethod || 'pending';
      orderData.paymentMethod = orderData.paymentInfo?.paymentMethod || orderData.paymentMethod || null;

      // Serialize pickupOTP timestamps for client consumption
      if (orderData.pickupOTP) {
        if (orderData.pickupOTP.expiresAt && orderData.pickupOTP.expiresAt.toDate) {
          orderData.pickupOTP.expiresAt = orderData.pickupOTP.expiresAt.toDate();
        }
        if (orderData.pickupOTP.generatedAt && orderData.pickupOTP.generatedAt.toDate) {
          orderData.pickupOTP.generatedAt = orderData.pickupOTP.generatedAt.toDate();
        }
      }

      orders.push(orderData);
    }

    // Client-side sorting
    orders.sort((a, b) => {
      let aValue = a[sortBy] || new Date(0);
      let bValue = b[sortBy] || new Date(0);
      
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination to sorted results
    const total = orders.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return {
      orders: paginatedOrders,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    };
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
};

// Get a single order by ID
const getOrderById = async (orderId) => {
  try {
    const orderRef = firestore.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      return null;
    }

    const orderData = { id: orderSnap.id, ...orderSnap.data() };

    // Get user data
    if (orderData.user) {
      const userRef = firestore.collection('users').doc(orderData.user);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        orderData.userData = { id: userSnap.id, ...userSnap.data() };
      }
    }

    // Get handbag data for items and populate missing image URLs
    if (orderData.items && orderData.items.length > 0) {
      for (let item of orderData.items) {
        // Check for handbagId (new format) or handbag (legacy format)
        const handbagId = item.handbagId || item.handbag;
        if (handbagId) {
          try {
            const handbagRef = firestore.collection('handbags').doc(handbagId);
            const handbagSnap = await handbagRef.get();
            if (handbagSnap.exists) {
              const handbagData = handbagSnap.data();
              item.handbagData = { id: handbagSnap.id, ...handbagData };
              
              // If the item doesn't have an image, populate it from handbag data
              if (!item.image && handbagData.image) {
                item.image = handbagData.image;
              }
              // Also check imageData field (used in handbag listings)
              if (!item.image && handbagData.imageData) {
                item.image = handbagData.imageData;
              }
              // Also check imageUrl field as fallback
              if (!item.image && handbagData.imageUrl) {
                item.image = handbagData.imageUrl;
              }
            }
          } catch (handbagError) {
            console.warn('Error fetching handbag data:', handbagError);
            item.handbagData = { name: 'Unknown Item', price: 0 };
          }
        }
      }
    }

    // Get status history
    const statusHistoryRef = firestore.collection('orders').doc(orderId).collection('statusHistory');
    const statusHistorySnap = await statusHistoryRef.orderBy('timestamp', 'asc').get();
    
    orderData.statusHistory = [];
    statusHistorySnap.forEach(doc => {
      orderData.statusHistory.push({ id: doc.id, ...doc.data() });
    });

    // Calculate derived fields
    orderData.orderNumber = `NGO-${orderData.id.slice(-8).toUpperCase()}`;
    orderData.totalItems = orderData.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
    orderData.isDelivered = orderData.orderStatus === 'delivered';
    orderData.isPaid = orderData.paymentInfo?.paymentStatus === 'completed';
    // Expose top-level paymentStatus/paymentMethod for frontend convenience
    orderData.paymentStatus = orderData.paymentInfo?.paymentStatus || orderData.paymentMethod || 'pending';
    orderData.paymentMethod = orderData.paymentInfo?.paymentMethod || orderData.paymentMethod || null;

    return orderData;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

// Get order by tracking ID
const getOrderByTrackingId = async (trackingId) => {
  try {
    const ordersRef = firestore.collection('orders');
    const querySnap = await ordersRef.where('trackingId', '==', trackingId).limit(1).get();
    
    if (querySnap.empty) {
      return null;
    }

    return await getOrderById(querySnap.docs[0].id);
  } catch (error) {
    console.error('Error getting order by tracking ID:', error);
    throw error;
  }
};

// Update order status
const updateOrderStatus = async (orderId, newStatus, note = '', additionalData = {}) => {
  try {
    const orderRef = firestore.collection('orders').doc(orderId);
    
    return await firestore.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const currentStatus = orderDoc.data().orderStatus || orderDoc.data().status;
      const alreadyPickedUp = currentStatus === 'PICKED_UP';

      const updateData = {
        orderStatus: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...additionalData
      };

      // Set delivery date if status is delivered
      if (newStatus === 'delivered') {
        updateData.actualDelivery = admin.firestore.FieldValue.serverTimestamp();
      }

      // Set pickup date if status is picked up
      if (newStatus === 'PICKED_UP') {
        updateData.pickedUpAt = admin.firestore.FieldValue.serverTimestamp();
      }

      transaction.update(orderRef, updateData);

      // ── Record real sale ONLY when the customer actually picks up the order ──
      // This is the single source of truth for "units sold" and "revenue
      // generated" on the dashboard. Placing an order (PAID_PENDING_PICKUP)
      // already reserved/decremented stock, but that's not a completed sale —
      // a customer could still no-show, get marked EXPIRED, or CANCELLED.
      // Only a genuine pickup counts as money actually earned.
      if (newStatus === 'PICKED_UP' && !alreadyPickedUp) {
        const orderData = orderDoc.data();
        const items = orderData.items || [];

        items.forEach(item => {
          const handbagId = item.handbagId || item.handbag?.id || item.id;
          if (!handbagId) return;

          const salesHistoryRef = firestore
            .collection('handbags').doc(handbagId)
            .collection('salesHistory').doc();

          transaction.set(salesHistoryRef, {
            orderId,
            userId: orderData.userId,
            quantity: item.quantity || 1,
            salePrice: item.price || 0,
            soldAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
      }

      // Add status history record
      const statusHistoryRef = firestore.collection('orders').doc(orderId).collection('statusHistory').doc();
      transaction.set(statusHistoryRef, {
        status: newStatus,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note
      });

      return true;
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Generate tracking ID for order
const generateTrackingId = async (orderId) => {
  try {
    const timestamp = Date.now().toString().slice(-6);
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingId = `TRK${timestamp}${randomStr}`;

    const orderRef = firestore.collection('orders').doc(orderId);
    await orderRef.update({
      trackingId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return trackingId;
  } catch (error) {
    console.error('Error generating tracking ID:', error);
    throw error;
  }
};

// Calculate estimated delivery date
const setEstimatedDelivery = async (orderId, days = 7) => {
  try {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);

    const orderRef = firestore.collection('orders').doc(orderId);
    await orderRef.update({
      estimatedDelivery: firestore.Timestamp.fromDate(estimatedDate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return estimatedDate;
  } catch (error) {
    console.error('Error setting estimated delivery:', error);
    throw error;
  }
};

// Cancel order and initiate refund
const cancelOrder = async (orderId, refundAmount, reason) => {
  try {
    const orderRef = firestore.collection('orders').doc(orderId);
    
    return await firestore.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();
      const currentStatus = orderData.orderStatus || orderData.status;

      // Don't allow cancelling an order that's already been picked up,
      // cancelled, or expired — and don't double-restore stock if so.
      const nonCancellable = ['PICKED_UP', 'CANCELLED', 'EXPIRED'];
      if (nonCancellable.includes(currentStatus)) {
        throw new Error('This order cannot be cancelled');
      }

      transaction.update(orderRef, {
        status: 'CANCELLED',
        orderStatus: 'CANCELLED',
        'paymentInfo.paymentStatus': 'refunded',
        'refund.isRefunded': true,
        'refund.refundAmount': refundAmount || orderData.totalAmount,
        'refund.refundReason': reason,
        'refund.refundedAt': admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add status history
      const statusHistoryRef = firestore.collection('orders').doc(orderId).collection('statusHistory').doc();
      transaction.set(statusHistoryRef, {
        status: 'CANCELLED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: `Cancelled by customer: ${reason}`
      });

      // Restore handbag quantities — stock was reserved at add-to-cart time,
      // so cancelling before pickup must give it back. Items are stored
      // with `handbagId` (see orderController.createHandbagOrder), not
      // `handbag` — using the wrong field here silently skipped this block.
      if (orderData.items && orderData.items.length > 0) {
        for (let item of orderData.items) {
          const handbagId = item.handbagId || item.handbag;
          if (handbagId) {
            const handbagRef = firestore.collection('handbags').doc(handbagId);
            const handbagDoc = await transaction.get(handbagRef);
            if (handbagDoc.exists) {
              const handbagData = handbagDoc.data();
              transaction.update(handbagRef, {
                quantity: (handbagData.quantity || 0) + (item.quantity || 1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        }
      }

      return true;
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getOrderByTrackingId,
  updateOrderStatus,
  generateTrackingId,
  setEstimatedDelivery,
  cancelOrder
};