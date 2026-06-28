const { firestore } = require('../config/firebaseAdmin');
const path = require('path');

/**
 * Firebase Firestore service for donation management
 * Handles book donations, pickup requests, and approval workflow
 */

// Collection reference
const donationsRef = firestore.collection('donations');

// Helper function to generate donation number
const generateDonationNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DON${timestamp}${random}`;
};

// Helper function to calculate estimated pickup date
const calculateEstimatedPickup = (isUrgent = false) => {
  const now = new Date();
  const days = isUrgent ? 1 : 3; // Urgent donations picked up within 1 day
  return new Date(now.setDate(now.getDate() + days));
};

// Create new donation
const createDonation = async (donationData) => {
  try {
    const donationNumber = generateDonationNumber();
    const estimatedPickup = calculateEstimatedPickup(donationData.isUrgent);
    
    const donation = {
      donationNumber,
      donorId: donationData.donorId,
      donorEmail: donationData.donorEmail,
      book: {
        title: donationData.book.title,
        author: donationData.book.author,
        description: donationData.book.description,
        genre: donationData.book.genre || '',
        condition: donationData.book.condition,
        publicationYear: donationData.book.publicationYear || null,
        language: donationData.book.language || 'English',
        publisher: donationData.book.publisher || ''
      },
      pickupDetails: {
        address: donationData.pickupDetails.address,
        city: donationData.pickupDetails.city,
        state: donationData.pickupDetails.state,
        zipCode: donationData.pickupDetails.zipCode,
        contactName: donationData.pickupDetails.contactName,
        contactPhone: donationData.pickupDetails.contactPhone,
        contactEmail: donationData.pickupDetails.contactEmail || donationData.donorEmail,
        preferredPickupTime: donationData.pickupDetails.preferredPickupTime || '',
        specialInstructions: donationData.pickupDetails.specialInstructions || ''
      },
      images: donationData.images || [],
      quantity: donationData.quantity || 1,
      estimatedValue: donationData.estimatedValue || 0,
      donorMessage: donationData.donorMessage || '',
      donationStatus: 'pending', // pending, approved, rejected, picked_up, processing, completed
      isUrgent: donationData.isUrgent || false,
      estimatedPickup,
      actualPickup: null,
      adminNotes: '',
      statusHistory: [{
        status: 'pending',
        updatedAt: new Date(),
        updatedBy: 'system',
        note: 'Donation submitted'
      }],
      processedIntoBook: false,
      processedBookId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await donationsRef.add(donation);
    
    return {
      id: docRef.id,
      ...donation
    };
  } catch (error) {
    console.error('Error creating donation:', error);
    throw new Error('Failed to create donation');
  }
};

// Get donations with filters and pagination
const getDonations = async (filters = {}) => {
  try {
    let query = donationsRef.where('isActive', '==', true);

    // Apply filters
    if (filters.donorId) {
      query = query.where('donorId', '==', filters.donorId);
    }

    if (filters.status) {
      query = query.where('donationStatus', '==', filters.status);
    }

    if (filters.condition) {
      query = query.where('book.condition', '==', filters.condition);
    }

    if (filters.isUrgent !== undefined) {
      query = query.where('isUrgent', '==', filters.isUrgent);
    }

    if (filters.genre) {
      query = query.where('book.genre', '==', filters.genre);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Apply pagination
    const limit = parseInt(filters.limit) || 10;
    const page = parseInt(filters.page) || 1;
    const offset = (page - 1) * limit;

    if (offset > 0) {
      // For pagination, we need to get the offset document
      const offsetQuery = query.limit(offset);
      const offsetSnapshot = await offsetQuery.get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(limit);

    // Execute query
    const snapshot = await query.get();
    const donations = [];

    snapshot.forEach(doc => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get total count for pagination (approximate)
    const totalSnapshot = await donationsRef.where('isActive', '==', true).get();
    const total = totalSnapshot.size;

    return {
      donations,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNext: donations.length === limit,
      hasPrev: page > 1
    };

  } catch (error) {
    console.error('Error getting donations:', error);
    throw new Error('Failed to get donations');
  }
};

// Get single donation by ID
const getDonationById = async (donationId) => {
  try {
    const doc = await donationsRef.doc(donationId).get();
    
    if (!doc.exists) {
      return null;
    }

    const donation = {
      id: doc.id,
      ...doc.data()
    };

    return donation;
  } catch (error) {
    console.error('Error getting donation by ID:', error);
    throw new Error('Failed to get donation');
  }
};

// Update donation status
const updateDonationStatus = async (donationId, status, note = '', updatedBy = 'admin') => {
  try {
    const donation = await getDonationById(donationId);
    
    if (!donation) {
      throw new Error('Donation not found');
    }

    const statusUpdate = {
      donationStatus: status,
      updatedAt: new Date()
    };

    // Add to status history
    const statusHistoryEntry = {
      status,
      updatedAt: new Date(),
      updatedBy,
      note
    };

    statusUpdate.statusHistory = [...(donation.statusHistory || []), statusHistoryEntry];

    // Update specific fields based on status
    if (status === 'picked_up') {
      statusUpdate.actualPickup = new Date();
    }

    if (note) {
      statusUpdate.adminNotes = note;
    }

    await donationsRef.doc(donationId).update(statusUpdate);

    return await getDonationById(donationId);
  } catch (error) {
    console.error('Error updating donation status:', error);
    throw new Error('Failed to update donation status');
  }
};

// Process donation into book
const processDonationIntoBook = async (donationId, bookData) => {
  try {
    const donation = await getDonationById(donationId);
    
    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.processedIntoBook) {
      throw new Error('Donation already processed into book');
    }

    // Import book service to create book
    const { createBook } = require('./bookService');
    
    // Create book from donation
    const processedBook = await createBook({
      ...bookData,
      addedBy: 'admin', // Books from donations are added by admin
      isDonated: true,
      donationId: donationId,
      donorId: donation.donorId
    });

    // Update donation to mark as processed
    await donationsRef.doc(donationId).update({
      processedIntoBook: true,
      processedBookId: processedBook.id,
      donationStatus: 'completed',
      updatedAt: new Date(),
      statusHistory: [...(donation.statusHistory || []), {
        status: 'completed',
        updatedAt: new Date(),
        updatedBy: 'system',
        note: `Processed into book: ${processedBook.title}`
      }]
    });

    return processedBook;
  } catch (error) {
    console.error('Error processing donation into book:', error);
    throw new Error('Failed to process donation into book');
  }
};

// Delete donation (soft delete)
const deleteDonation = async (donationId) => {
  try {
    await donationsRef.doc(donationId).update({
      isActive: false,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting donation:', error);
    throw new Error('Failed to delete donation');
  }
};

// Get donation statistics
const getDonationStats = async () => {
  try {
    const snapshot = await donationsRef.where('isActive', '==', true).get();
    
    let stats = {
      total: 0,
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      totalValue: 0,
      urgentCount: 0
    };

    snapshot.forEach(doc => {
      const donation = doc.data();
      stats.total++;
      stats[donation.donationStatus] = (stats[donation.donationStatus] || 0) + 1;
      stats.totalValue += donation.estimatedValue || 0;
      
      if (donation.isUrgent) {
        stats.urgentCount++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting donation stats:', error);
    throw new Error('Failed to get donation statistics');
  }
};

module.exports = {
  createDonation,
  getDonations,
  getDonationById,
  updateDonationStatus,
  processDonationIntoBook,
  deleteDonation,
  getDonationStats
};