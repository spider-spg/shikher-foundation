const express = require('express');
const router = express.Router();
const multer = require('multer');
const donationController = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Configure multer for handling multiple files
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public donation routes
router.post('/create', 
  authMiddleware, 
  upload.fields([
    { name: 'image_0', maxCount: 1 },
    { name: 'image_1', maxCount: 1 },
    { name: 'image_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
    { name: 'image_4', maxCount: 1 },
    { name: 'image_5', maxCount: 1 },
    { name: 'image_6', maxCount: 1 },
    { name: 'image_7', maxCount: 1 },
    { name: 'image_8', maxCount: 1 },
    { name: 'image_9', maxCount: 1 }
  ]),
  donationController.createDonation
);

// User donation routes
router.get('/my-donations', authMiddleware, donationController.getUserDonations);
router.get('/:donationId', authMiddleware, donationController.getDonationById);

// Admin donation routes
router.get('/', authMiddleware, adminMiddleware, donationController.getAllDonations);
router.put('/:donationId/status', authMiddleware, adminMiddleware, donationController.updateDonationStatus);

module.exports = router;