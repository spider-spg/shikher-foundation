const multer = require('multer');
const uploadService = require('../services/uploadService');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const validation = uploadService.validateFile(file);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error), false);
    }
  }
});

// Middleware to process uploaded files to base64
const processUploads = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }

    // Process single file
    if (req.file) {
      const result = await uploadService.processImageToBase64(req.file.buffer);
      if (result.success) {
        req.imageData = result.imageData;
      } else {
        return res.status(400).json({ error: result.error });
      }
    }

    // Process multiple files
    if (req.files && Array.isArray(req.files)) {
      const result = await uploadService.processMultipleImages(req.files);
      if (result.success) {
        req.imagesData = result.images;
      } else {
        return res.status(400).json({ error: result.error });
      }
    }

    next();
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Error processing uploaded files' });
  }
};

module.exports = {
  // Single file upload
  single: (fieldName) => [upload.single(fieldName), processUploads],
  
  // Multiple file upload
  array: (fieldName, maxCount = 10) => [upload.array(fieldName, maxCount), processUploads],
  
  // Multiple fields
  fields: (fields) => [upload.fields(fields), processUploads]
};