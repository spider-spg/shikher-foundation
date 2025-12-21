const { auth } = require('../config/firebaseAdmin');
const { getUserDocument } = require('../services/userService');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, access denied'
      });
    }

    const idToken = authHeader.replace('Bearer ', '');

    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user document from Firestore
    const user = await getUserDocument(decodedToken.uid);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account is inactive'
      });
    }

    // Attach both Firebase user and Firestore user data to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || user.role, // Use custom claims if available, fallback to Firestore
      ...user
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token revoked'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = authMiddleware;