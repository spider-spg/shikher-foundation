const sharp = require('sharp');

/**
 * Base64 Image Processing Service
 * Converts images to optimized base64 strings for Firestore storage
 */

class UploadService {
  // Convert file buffer to base64 with optimization
  async processImageToBase64(buffer, options = {}) {
    try {
      const {
        maxWidth = 800,
        maxHeight = 600,
        quality = 80,
        format = 'jpeg'
      } = options;

      // Process image with sharp for optimization
      const processedBuffer = await sharp(buffer)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toBuffer();

      // Convert to base64
      const base64String = `data:image/${format};base64,${processedBuffer.toString('base64')}`;
      
      return {
        success: true,
        imageData: base64String,
        size: processedBuffer.length
      };
    } catch (error) {
      console.error('Error processing image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process multiple images
  async processMultipleImages(files, options = {}) {
    try {
      const results = [];
      
      for (const file of files) {
        const result = await this.processImageToBase64(file.buffer, options);
        if (result.success) {
          results.push({
            originalName: file.originalname,
            imageData: result.imageData,
            size: result.size
          });
        }
      }

      return {
        success: true,
        images: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate file before processing
  validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    return { valid: true };
  }
}

module.exports = new UploadService();