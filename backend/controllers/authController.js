const { auth } = require('../config/firebaseAdmin');
const { 
  createUserDocument, 
  getUserDocument, 
  updateUserDocument, 
  findUserByEmail,
  getUserCart,
  addToCart,
  removeFromCart,
  clearCart,
  setUserRole
} = require('../services/userService');
const validator = require('validator');
const { firestore } = require('../config/firebaseAdmin');

// ─── Verify a password against Firebase Auth (Admin SDK can't check passwords) ─
// Uses the Firebase Auth REST API's signInWithPassword endpoint.
const verifyPasswordWithFirebase = async (email, password) => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY;

  if (!apiKey) {
    console.warn('FIREBASE_WEB_API_KEY not set - cannot verify password via Firebase Auth');
    return false;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false })
      }
    );

    return response.ok; // true if credentials are valid
  } catch (error) {
    console.error('Firebase password verification error:', error);
    return false;
  }
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  let firebaseUser = null;
  
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all the required fields to create your account'
      });
    }

    if (!phoneNumber || !/^[6-9]\d{9}$/.test(phoneNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number'
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Your password should be at least 6 characters long for security'
      });
    }

    console.log('Starting signup process for email:', email);

    // Check if user already exists in Firestore
    try {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please try logging in instead'
        });
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
      // Don't fail signup if check fails, continue with Firebase Auth check
    }

    // Create user in Firebase Auth
    console.log('Creating user in Firebase Auth...');
    firebaseUser = await auth.createUser({
      email: email.toLowerCase(),
      password,
      displayName: name.trim()
    });
    console.log('Firebase Auth user created:', firebaseUser.uid);

    // Set user role as customer
    console.log('Setting user role...');
    try {
      await setUserRole(firebaseUser.uid, 'customer');
      console.log('User role set successfully');
    } catch (roleError) {
      console.error('Error setting user role:', roleError);
      // Continue without failing, we can set role later
    }

    // Create user document in Firestore
    console.log('Creating user document in Firestore...');
    const userDoc = await createUserDocument(firebaseUser.uid, {
      name: name.trim(),
      email: email.toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      role: 'customer'
    });
    console.log('User document created successfully:', userDoc.id);

    // Generate custom token for immediate sign-in
    console.log('Generating custom token...');
    const customToken = await auth.createCustomToken(firebaseUser.uid);
    console.log('Custom token generated successfully');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      customToken,
      user: {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    
    // If Firebase user was created but Firestore failed, clean up
    if (firebaseUser && firebaseUser.uid) {
      try {
        console.log('Cleaning up Firebase Auth user due to error...');
        await auth.deleteUser(firebaseUser.uid);
        console.log('Firebase Auth user cleaned up successfully');
      } catch (cleanupError) {
        console.error('Error cleaning up Firebase Auth user:', cleanupError);
      }
    }
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please try logging in instead'
      });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        message: 'Please choose a stronger password with at least 6 characters'
      });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }
    
    // Handle network and permission errors
    if (error.code === 'permission-denied') {
      return res.status(500).json({
        success: false,
        message: 'We\'re having trouble accessing our systems. Please try again in a moment'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble creating your account right now. Please try again in a few minutes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both your email and password to sign in'
      });
    }

    console.log('Login attempt:', { 
      email, 
      providedEmail: email.toLowerCase(),
      envAdminEmail: process.env.ADMIN_EMAIL
    });

    // Check if this email is the admin account
    if (email.toLowerCase() === process.env.ADMIN_EMAIL) {
      // BUSINESS RULE: Accept either the original hardcoded env password
      // OR a password the admin has changed via their Profile page
      // (which updates Firebase Auth directly).
      const matchesEnvPassword = process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
      const matchesFirebasePassword = await verifyPasswordWithFirebase(email.toLowerCase(), password);

      if (!matchesEnvPassword && !matchesFirebasePassword) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email or password. Please check your credentials and try again'
        });
      }

      // Check if admin user exists in Firebase Auth
      let adminUser;
      try {
        adminUser = await auth.getUserByEmail(email.toLowerCase());
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create admin user in Firebase Auth
          adminUser = await auth.createUser({
            email: email.toLowerCase(),
            password: password,
            displayName: 'Admin'
          });
        } else {
          throw error;
        }
      }

      // Set admin role
      await setUserRole(adminUser.uid, 'admin');

      // Check if admin user document exists in Firestore
      let adminUserDoc = await getUserDocument(adminUser.uid);
      if (!adminUserDoc) {
        adminUserDoc = await createUserDocument(adminUser.uid, {
          name: 'Admin',
          email: email.toLowerCase(),
          role: 'admin'
        });
      }

      // Generate custom token
      const customToken = await auth.createCustomToken(adminUser.uid);

      return res.json({
        success: true,
        message: 'Admin login successful',
        customToken,
        user: {
          id: adminUserDoc.id,
          name: adminUserDoc.name,
          email: adminUserDoc.email,
          role: adminUserDoc.role
        }
      });
    }

    // For regular users, they need to authenticate on the frontend
    // This endpoint will be used less frequently as Firebase handles auth client-side
    res.status(400).json({
      success: false,
      message: 'Invalid email or password. Please check your credentials and try again'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble signing you in right now. Please try again in a few minutes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is set by Firebase auth middleware
    const user = await getUserDocument(req.user.uid);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user cart
    const cart = await getUserCart(req.user.uid);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber || user.phone || '',
        role: user.role,
        cart: cart,
        cartItemCount: cart.reduce((total, item) => total + (item.quantity || 0), 0),
        createdAt: user.createdAt,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, phoneNumber } = req.body;
    const incomingPhone = phoneNumber !== undefined ? phoneNumber : phone;

    // ── Validate name ────────────────────────────────────────────────────────
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    // ── Validate email if provided ───────────────────────────────────────────
    if (email && !validator.isEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // ── Validate phone if provided ───────────────────────────────────────────
    if (incomingPhone !== undefined) {
      const trimmedPhone = incomingPhone.trim();
      if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit Indian mobile number'
        });
      }
    }

    // ── Build Firestore update object ────────────────────────────────────────
    const updateData = { name: name.trim() };
    if (email) updateData.email = email.trim().toLowerCase();
    if (incomingPhone !== undefined) updateData.phoneNumber = incomingPhone.trim();

    // ── Check if new email is already taken ──────────────────────────────────
    if (email && email.trim().toLowerCase() !== req.user.email?.toLowerCase()) {
      const existing = await findUserByEmail(email.trim().toLowerCase());
      if (existing && existing.id !== req.user.uid) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already associated with another account'
        });
      }
    }

    // ── Update Firebase Auth (name + email) ──────────────────────────────────
    const authUpdate = { displayName: name.trim() };
    if (email && email.trim().toLowerCase() !== req.user.email?.toLowerCase()) {
      authUpdate.email = email.trim().toLowerCase();
    }
    await auth.updateUser(req.user.uid, authUpdate);

    // ── Update Firestore document ────────────────────────────────────────────
    const updatedUser = await updateUserDocument(req.user.uid, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id:          updatedUser.id,
        name:        updatedUser.name,
        email:       updatedUser.email,
        phone:       updatedUser.phoneNumber || updatedUser.phone || '',
        phoneNumber: updatedUser.phoneNumber || updatedUser.phone || '',
        role:        updatedUser.role,
        createdAt:   updatedUser.createdAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    // Firebase-specific email errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'This email address is already in use by another account'
      });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Update password in Firebase Auth
    await auth.updateUser(req.user.uid, {
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // With Firebase, logout is primarily handled on the client side
    // We can revoke refresh tokens if needed for enhanced security
    await auth.revokeRefreshTokens(req.user.uid);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// @desc    Get user stats
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Count borrowed books
    const borrowedBooksRef = firestore.collection('users').doc(userId).collection('borrowedBooks');
    const borrowedBooksSnap = await borrowedBooksRef.where('returned', '==', false).get();
    const borrowedBooksCount = borrowedBooksSnap.size;

    // Count total orders for this user
    const ordersRef = firestore.collection('orders');
    const ordersSnap = await ordersRef.where('user', '==', userId).get();
    const totalOrders = ordersSnap.size;

    // Count total donations
    const donationsRef = firestore.collection('donations');
    const donationsSnap = await donationsRef.where('donor', '==', userId).get();
    
    const bookDonationsRef = firestore.collection('bookDonations');
    const bookDonationsSnap = await bookDonationsRef.where('donor', '==', userId).get();
    
    const totalDonations = donationsSnap.size + bookDonationsSnap.size;

    // Calculate total spent (sum of all completed orders)
    let totalSpent = 0;
    ordersSnap.forEach(doc => {
      const order = doc.data();
      if (order.paymentInfo?.paymentStatus === 'completed') {
        totalSpent += order.totalAmount || 0;
      }
    });

    const stats = {
      borrowedBooks: borrowedBooksCount,
      totalOrders,
      totalDonations,
      totalSpent
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getUserStats
};