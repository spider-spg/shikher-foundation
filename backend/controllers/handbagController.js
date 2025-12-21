const {
  createHandbag,
  getHandbags,
  getHandbagById,
  updateHandbag,
  deleteHandbag,
  sellHandbag,
  restockHandbag,
  addReview
} = require('../services/handbagService');
const { 
  addToCart, 
  removeFromCart, 
  getUserCart, 
  updateCartQuantity, 
  clearCart 
} = require('../services/userService');

// @desc    Get all handbags
// @route   GET /api/handbags
// @access  Public
const getAllHandbags = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 1000,
      search: req.query.search,
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      designer: req.query.designer,
      available: req.query.available,
      featured: req.query.featured,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await getHandbags(filters);

    res.json({
      success: true,
      count: result.handbags.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      handbags: result.handbags.map(handbag => ({
        id: handbag.id,
        title: handbag.title,
        description: handbag.description,
        price: handbag.price,
        designerName: handbag.designerName,
        imageData: handbag.imageData,
        quantity: handbag.quantity,
        category: handbag.category,
        material: handbag.material,
        color: handbag.color,
        dimensions: handbag.dimensions,
        isFeatured: handbag.isFeatured,
        isAvailable: handbag.quantity > 0 && handbag.isActive,
        averageRating: handbag.averageRating,
        totalSold: handbag.totalSold,
        addedBy: handbag.addedBy,
        createdAt: handbag.createdAt
      }))
    });

  } catch (error) {
    console.error('Get handbags error:', error);
    res.status(500).json({
      success: false,
      message: 'We\'re having trouble loading the handbags right now. Please try again in a moment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single handbag
// @route   GET /api/handbags/:id
// @access  Public
const getHandbag = async (req, res) => {
  try {
    const handbag = await getHandbagById(req.params.id);

    if (!handbag) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    // Check if current user has purchased this handbag (if authenticated)
    let userHasPurchased = false;
    if (req.user) {
      // Check if user has purchased this handbag (from sales history)
      userHasPurchased = handbag.salesHistory && 
        handbag.salesHistory.some(sale => sale.userId === req.user.uid);
    }

    res.json({
      success: true,
      handbag: {
        id: handbag.id,
        title: handbag.title,
        description: handbag.description,
        price: handbag.price,
        designerName: handbag.designerName,
        image: handbag.image,
        quantity: handbag.quantity,
        totalQuantity: handbag.totalQuantity,
        category: handbag.category,
        material: handbag.material,
        color: handbag.color,
        dimensions: handbag.dimensions,
        weight: handbag.weight,
        isAvailable: handbag.quantity > 0 && handbag.isActive,
        isFeatured: handbag.isFeatured,
        averageRating: handbag.averageRating,
        totalSold: handbag.totalSold,
        totalRevenue: handbag.totalRevenue,
        userHasPurchased,
        reviews: handbag.reviews,
        addedBy: handbag.addedBy,
        createdAt: handbag.createdAt,
        updatedAt: handbag.updatedAt
      }
    });

  } catch (error) {
    console.error('Get handbag error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching handbag',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add handbag to cart
// @route   POST /api/handbags/:id/cart
// @access  Private (Customer only)
const addToCartController = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const handbag = await getHandbagById(req.params.id);

    if (!handbag) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    if (!handbag.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This handbag is no longer available'
      });
    }

    // BUSINESS RULE: Cart doesn't block stock - allow adding to cart regardless of stock
    // Stock will be validated only at checkout
    await addToCart(req.user.uid, {
      type: 'handbag',
      itemId: req.params.id,
      quantity,
      price: handbag.price || 0,
      name: handbag.title || handbag.name || 'Unknown Item',
      image: handbag.image || handbag.imageData || ''
    });

    // Get current cart item to return proper quantity
    const cart = await getUserCart(req.user.uid);
    const cartItem = cart.find(item => item.handbagId === req.params.id);

    res.json({
      success: true,
      message: 'Handbag added to cart successfully',
      cartItem: {
        handbagId: req.params.id,
        title: handbag.title,
        price: handbag.price,
        quantity: cartItem ? cartItem.quantity : quantity,
        addedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding handbag to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove handbag from cart
// @route   DELETE /api/handbags/:id/cart
// @access  Private (Customer only)
const removeFromCartController = async (req, res) => {
  try {
    await removeFromCart(req.user.uid, req.params.id);

    res.json({
      success: true,
      message: 'Handbag removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing handbag from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's cart
// @route   GET /api/handbags/cart
// @access  Private (Customer only)
const getCart = async (req, res) => {
  try {
    const cartItems = await getUserCart(req.user.uid);

    // Process cart items and add detailed information
    const handbagCartItems = [];
    let total = 0;

    for (const item of cartItems) {
      // All items in handbag cart should be handbags
      if (item.handbag) {
        const handbag = await getHandbagById(item.handbag);
        if (handbag && handbag.isActive) {
          const isAvailable = handbag.quantity >= item.quantity;
          const subtotal = handbag.price * item.quantity;
          
          handbagCartItems.push({
            id: item.id,
            handbag: {
              id: handbag.id,
              title: handbag.title || handbag.name,
              price: handbag.price,
              image: handbag.imageData || handbag.image,
              quantity: handbag.quantity,
              isAvailable: isAvailable,
              category: handbag.category,
              color: handbag.color,
              designerName: handbag.designerName
            },
            quantity: item.quantity,
            subtotal,
            addedAt: item.addedAt,
            isAvailable
          });

          if (isAvailable) {
            total += subtotal;
          }
        }
      }
    }

    res.json({
      success: true,
      count: handbagCartItems.length,
      total,
      cartItems: handbagCartItems
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/handbags/:id/cart
// @access  Private (Customer only)
const updateCartQuantityController = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const handbag = await getHandbagById(req.params.id);

    if (!handbag || !handbag.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    if (handbag.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    await updateCartQuantity(req.user.uid, req.params.id, quantity);

    res.json({
      success: true,
      message: 'Cart updated successfully',
      cartItem: {
        handbagId: req.params.id,
        title: handbag.title,
        price: handbag.price,
        quantity,
        subtotal: handbag.price * quantity
      }
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Clear user's cart
// @route   DELETE /api/handbags/cart
// @access  Private (Customer only)
const clearCartController = async (req, res) => {
  try {
    await clearCart(req.user.uid);

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add review for handbag
// @route   POST /api/handbags/:id/review
// @access  Private (Customer only)
const addReviewController = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const handbag = await getHandbagById(req.params.id);

    if (!handbag || !handbag.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Handbag not found'
      });
    }

    // Check if user has purchased this handbag
    const hasPurchased = handbag.salesHistory && 
      handbag.salesHistory.some(sale => sale.userId === req.user.uid);

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review handbags you have purchased'
      });
    }

    await addReview(req.params.id, {
      userId: req.user.uid,
      userEmail: req.user.email,
      rating,
      comment
    });

    res.json({
      success: true,
      message: 'Review added successfully'
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get handbag categories
// @route   GET /api/handbags/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    // Get categories from handbag service
    const result = await getHandbags({ 
      page: 1, 
      limit: 1000, // Get all for categories
      distinctCategories: true 
    });
    
    const categories = [...new Set(result.handbags
      .filter(handbag => handbag.category && handbag.category.trim() !== '')
      .map(handbag => handbag.category))];
    
    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get featured handbags
// @route   GET /api/handbags/featured
// @access  Public
const getFeaturedHandbags = async (req, res) => {
  try {
    const result = await getHandbags({
      page: 1,
      limit: 6,
      featured: true,
      available: true,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    res.json({
      success: true,
      count: result.handbags.length,
      featuredHandbags: result.handbags.map(handbag => ({
        id: handbag.id,
        title: handbag.title,
        description: handbag.description,
        price: handbag.price,
        designerName: handbag.designerName,
        image: handbag.image,
        category: handbag.category,
        averageRating: handbag.averageRating,
        isAvailable: handbag.quantity > 0 && handbag.isActive
      }))
    });

  } catch (error) {
    console.error('Get featured handbags error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured handbags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getHandbags: getAllHandbags,
  getHandbag,
  addToCart: addToCartController,
  removeFromCart: removeFromCartController,
  getCart,
  updateCartQuantity: updateCartQuantityController,
  clearCart: clearCartController,
  addReview: addReviewController,
  getCategories,
  getFeaturedHandbags
};