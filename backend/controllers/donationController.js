const { firestore, admin } = require('../config/firebaseAdmin');
const db = firestore;
const { v4: uuidv4 } = require('uuid');
const { getUserDocument } = require('../services/userService');

const donationController = {
  // Create new donation
  async createDonation(req, res) {
    try {
      console.log('Create donation request:', { body: req.body, user: req.user });
      console.log('Create donation request received');
      console.log('Body keys:', Object.keys(req.body));
      console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
      
      const { itemType, donorMessage } = req.body;
      
      if (!req.body.items) {
        return res.status(400).json({
          success: false,
          message: 'Please provide details about the items you want to donate'
        });
      }
      
      let items;
      try {
        items = JSON.parse(req.body.items);
        console.log('Parsed items:', items);
      } catch (parseError) {
        console.error('Items parsing error:', parseError);
        return res.status(400).json({
          success: false,
          message: 'There was an issue processing your donation details. Please try again'
        });
      }
      
      if (!itemType || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select the type of items you want to donate and add at least one item to your donation'
        });
      }

      // Process uploaded images - store as base64 for now
      console.log('=== IMAGE PROCESSING DEBUG ===');
      console.log('req.files:', req.files ? Object.keys(req.files) : 'No files object');
      console.log('Number of items:', items.length);
      
      for (let i = 0; i < items.length; i++) {
        const fileKey = `image_${i}`;
        console.log(`Checking for file with key: ${fileKey}`);
        
        if (req.files && req.files[fileKey]) {
          const fileArray = req.files[fileKey];
          if (fileArray && fileArray.length > 0) {
            const file = fileArray[0];
            console.log(`Processing image ${i}:`, { 
              originalname: file.originalname, 
              mimetype: file.mimetype, 
              size: file.buffer.length 
            });
            
            try {
              const base64Image = file.buffer.toString('base64');
              items[i].imageData = `data:${file.mimetype};base64,${base64Image}`;
              console.log(`✓ Image ${i} processed successfully. Data length:`, base64Image.length);
            } catch (base64Error) {
              console.error(`✗ Failed to convert image ${i} to base64:`, base64Error);
            }
          } else {
            console.log(`✗ File array for ${fileKey} is empty`);
          }
        } else {
          console.log(`✗ No file found for key: ${fileKey}`);
        }
      }
      
      console.log('=== END IMAGE PROCESSING DEBUG ===');

      // Fetch user's phone number from Firestore profile
      const userDoc = await getUserDocument(req.user.uid);
      const userPhone = userDoc?.phoneNumber || userDoc?.phone || '';

      // Create donation document
      const donationData = {
        donorId:      req.user.uid,
        donorName:    userDoc?.name || req.user.displayName || req.user.email,
        donorEmail:   req.user.email,
        donorPhone:   userPhone,
        itemType,
        items,
        donorMessage: donorMessage || '',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      console.log('Creating donation with data:', {
        ...donationData,
        items: donationData.items.map(item => ({
          ...item,
          imageData: item.imageData ? `[BASE64_DATA_LENGTH:${item.imageData.length}]` : 'NO_IMAGE'
        }))
      });

      const docRef = await db.collection('donations').add(donationData);

      console.log('Donation created with ID:', docRef.id);

      res.status(201).json({
        success: true,
        message: 'Donation submitted successfully',
        donationId: docRef.id
      });

    } catch (error) {
      console.error('Create donation error:', error);
      res.status(500).json({
        success: false,
        message: 'We\'re having trouble submitting your donation right now. Please try again in a few minutes',
        error: error.message
      });
    }
  },

  // Get user's donations
  async getUserDonations(req, res) {
    try {
      console.log('Fetching donations for user:', req.user.uid);
      
      // First try without ordering to see if there are any donations
      const snapshot = await db.collection('donations')
        .where('donorId', '==', req.user.uid)
        .get();

      const donations = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        donations.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        });
      });

      // Sort by createdAt in memory (descending)
      donations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log('Found donations:', donations.length);

      res.json({
        success: true,
        donations
      });

    } catch (error) {
      console.error('Get user donations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch donations',
        error: error.message
      });
    }
  },

  // Get all donations (Admin only)
  async getAllDonations(req, res) {
    try {
      console.log('Fetching all donations for admin');
      
      const { status, limit = 50, page = 1 } = req.query;
      let query = db.collection('donations');

      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const allDonations = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        allDonations.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        });
      });

      // Sort by createdAt in memory (descending)
      allDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination in memory
      const offset = (page - 1) * limit;
      const donations = allDonations.slice(offset, offset + parseInt(limit));
      const total = allDonations.length;

      console.log('Found total donations:', total);

      res.json({
        success: true,
        donations,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get all donations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch donations',
        error: error.message
      });
    }
  },

  // Update donation status (Admin only)
  async updateDonationStatus(req, res) {
    try {
      console.log('Updating donation status:', req.params.donationId, req.body);
      
      const { donationId } = req.params;
      const { status, adminMessage } = req.body;

      if (!['pending', 'approved', 'rejected', 'received'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const updateData = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (adminMessage) {
        updateData.adminMessage = adminMessage;
      }

      if (status === 'approved') {
        updateData.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (status === 'received') {
        updateData.receivedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await db.collection('donations').doc(donationId).update(updateData);

      res.json({
        success: true,
        message: 'Donation status updated successfully'
      });

    } catch (error) {
      console.error('Update donation status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update donation status',
        error: error.message
      });
    }
  },

  // Get donation by ID
  async getDonationById(req, res) {
    try {
      const { donationId } = req.params;
      const doc = await db.collection('donations').doc(donationId).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Donation not found'
        });
      }

      const donation = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      };

      res.json({
        success: true,
        donation
      });

    } catch (error) {
      console.error('Get donation by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'We\'re having trouble loading your donation details. Please try again in a moment',
        error: error.message
      });
    }
  }
};

module.exports = donationController;