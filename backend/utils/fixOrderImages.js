const { firestore } = require('../config/firebaseAdmin');
const { getHandbagById } = require('../services/handbagService');

/**
 * Utility function to fix missing images in existing orders
 * This should be run once to populate missing image data in orders
 */
const fixOrderImages = async () => {
  try {
    console.log('Starting order image fix...');
    
    // Get all orders
    const ordersSnapshot = await firestore.collection('orders').get();
    let updatedCount = 0;
    let totalOrders = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      totalOrders++;
      const orderData = orderDoc.data();
      const orderId = orderDoc.id;
      
      console.log(`Processing order ${orderId}...`);
      
      if (!orderData.items || orderData.items.length === 0) {
        console.log(`Order ${orderId} has no items, skipping...`);
        continue;
      }
      
      let orderNeedsUpdate = false;
      const updatedItems = [];
      
      for (const item of orderData.items) {
        const updatedItem = { ...item };
        
        // If item already has an image, keep it
        if (item.image) {
          updatedItems.push(updatedItem);
          continue;
        }
        
        // Try to get handbag data and populate image
        const handbagId = item.handbagId || item.handbag;
        if (handbagId) {
          try {
            console.log(`Fetching handbag data for ${handbagId}...`);
            const handbag = await getHandbagById(handbagId);
            
            if (handbag) {
              // Populate missing image from handbag data
              if (handbag.image) {
                updatedItem.image = handbag.image;
                orderNeedsUpdate = true;
                console.log(`Updated image for item ${handbagId} from handbag.image`);
              } else if (handbag.imageData) {
                updatedItem.image = handbag.imageData;
                orderNeedsUpdate = true;
                console.log(`Updated image for item ${handbagId} from handbag.imageData`);
              } else if (handbag.imageUrl) {
                updatedItem.image = handbag.imageUrl;
                orderNeedsUpdate = true;
                console.log(`Updated image for item ${handbagId} from handbag.imageUrl`);
              } else {
                console.log(`No image found for handbag ${handbagId}`);
              }
            } else {
              console.log(`Handbag ${handbagId} not found`);
            }
          } catch (error) {
            console.error(`Error fetching handbag ${handbagId}:`, error.message);
          }
        } else {
          console.log(`No handbagId found for item in order ${orderId}`);
        }
        
        updatedItems.push(updatedItem);
      }
      
      // Update the order if needed
      if (orderNeedsUpdate) {
        try {
          await firestore.collection('orders').doc(orderId).update({
            items: updatedItems,
            updatedAt: new Date()
          });
          updatedCount++;
          console.log(`Updated order ${orderId} with image data`);
        } catch (error) {
          console.error(`Error updating order ${orderId}:`, error.message);
        }
      } else {
        console.log(`Order ${orderId} doesn't need updates`);
      }
    }
    
    console.log(`\nImage fix completed:`);
    console.log(`Total orders processed: ${totalOrders}`);
    console.log(`Orders updated: ${updatedCount}`);
    
    return {
      totalOrders,
      updatedCount
    };
    
  } catch (error) {
    console.error('Error fixing order images:', error);
    throw error;
  }
};

module.exports = {
  fixOrderImages
};