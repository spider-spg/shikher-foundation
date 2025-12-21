const { firestore } = require('../config/firebaseAdmin');

/**
 * Debug utility to inspect handbag and order data structure
 */
const debugDataStructure = async () => {
  try {
    console.log('=== DEBUG: Inspecting data structure ===');
    
    // Check a sample handbag
    console.log('\n--- HANDBAG DATA ---');
    const handbagsSnapshot = await firestore.collection('handbags').limit(1).get();
    if (!handbagsSnapshot.empty) {
      const handbag = handbagsSnapshot.docs[0];
      console.log('Handbag ID:', handbag.id);
      console.log('Handbag fields:', Object.keys(handbag.data()));
      console.log('Has image field:', !!handbag.data().image);
      console.log('Has imageData field:', !!handbag.data().imageData);
      console.log('Has imageUrl field:', !!handbag.data().imageUrl);
      if (handbag.data().image) {
        console.log('image type:', typeof handbag.data().image);
        console.log('image preview:', handbag.data().image.substring(0, 50) + '...');
      }
      if (handbag.data().imageData) {
        console.log('imageData type:', typeof handbag.data().imageData);
        console.log('imageData preview:', handbag.data().imageData.substring(0, 50) + '...');
      }
    }
    
    // Check a sample order
    console.log('\n--- ORDER DATA ---');
    const ordersSnapshot = await firestore.collection('orders').limit(1).get();
    if (!ordersSnapshot.empty) {
      const order = ordersSnapshot.docs[0];
      console.log('Order ID:', order.id);
      console.log('Order fields:', Object.keys(order.data()));
      console.log('Items count:', order.data().items?.length || 0);
      
      if (order.data().items && order.data().items.length > 0) {
        const item = order.data().items[0];
        console.log('First item fields:', Object.keys(item));
        console.log('Has handbagId:', !!item.handbagId);
        console.log('Has handbag:', !!item.handbag);
        console.log('Has image:', !!item.image);
        console.log('handbagId value:', item.handbagId);
        console.log('handbag value:', item.handbag);
        if (item.image) {
          console.log('image type:', typeof item.image);
          console.log('image preview:', item.image.substring(0, 50) + '...');
        }
      }
    }
    
    console.log('\n=== DEBUG COMPLETED ===');
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};

module.exports = {
  debugDataStructure
};