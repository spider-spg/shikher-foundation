const express = require('express');
const router = express.Router();
const {
  getDonations,
  getDonationById,
  updateDonationStatus,
  deleteDonation
} = require('../services/donationService');
const authMiddleware = require('../middleware/authMiddleware');

// Admin-only middleware (if you have one)
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

// GET /api/admin/book-donations
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const donations = await getDonations();
    res.json({ success: true, donations });
  } catch (error) {
    console.error('Admin get donations error:', error);
    res.status(500).json({ success: false, message: 'Error fetching donations' });
  }
});

// PUT /api/admin/book-donations/:id/status
router.put('/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const donation = await getDonationById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Update status using service
    const updatedDonation = await updateDonationStatus(req.params.id, status, '', 'admin');

    res.json({ success: true, message: 'Donation status updated', donation: updatedDonation });
  } catch (error) {
    console.error('Admin donation status update error:', error);
    res.status(500).json({ success: false, message: 'Error updating donation status' });
  }
});

module.exports = router;
