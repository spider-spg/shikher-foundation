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

// ─── Get all handbags ─────────────────────────────────────────────────────────
const getAllHandbags = async (req, res) => {
  try {
    const filters = {
      page:      parseInt(req.query.page)  || 1,
      limit:     parseInt(req.query.limit) || 1000,
      search:    req.query.search,
      category:  req.query.category,
      minPrice:  req.query.minPrice,
      maxPrice:  req.query.maxPrice,
      designer:  req.query.designer,
      available: req.query.available,
      featured:  req.query.featured,
      sortBy:    req.query.sortBy    || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await getHandbags(filters);

    res.json({
      success: true,
      count:      result.handbags.length,
      total:      result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      handbags: result.handbags.map(h => ({
        id:           h.id,
        title:        h.title,
        description:  h.description,
        price:        h.price,
        designerName: h.designerName,
        imageData:    h.imageData,
        quantity:     h.quantity,
        category:     h.category,
        material:     h.material,
        color:        h.color,
        dimensions:   h.dimensions,
        isFeatured:   h.isFeatured,
        isAvailable:  h.quantity > 0 && h.isActive,
        averageRating: h.averageRating,
        totalSold:    h.totalSold,
        totalRevenue: h.totalRevenue,
        totalQuantity: h.totalQuantity,
        addedBy:      h.addedBy,
        createdAt:    h.createdAt
      }))
    });
  } catch (error) {
    console.error('Get handbags error:', error);
    res.status(500).json({
      success: false,
      message: "We're having trouble loading the handbags right now. Please try again in a moment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get single handbag ───────────────────────────────────────────────────────
const getHandbag = async (req, res) => {
  try {
    const handbag = await getHandbagById(req.params.id);
    if (!handbag) {
      return res.status(404).json({ success: false, message: 'Handbag not found' });
    }

    let userHasPurchased = false;
    if (req.user) {
      userHasPurchased = handbag.salesHistory &&
        handbag.salesHistory.some(sale => sale.userId === req.user.uid);
    }

    res.json({
      success: true,
      handbag: {
        id:           handbag.id,
        title:        handbag.title,
        description:  handbag.description,
        price:        handbag.price,
        designerName: handbag.designerName,
        image:        handbag.image,
        quantity:     handbag.quantity,
        totalQuantity: handbag.totalQuantity,
        category:     handbag.category,
        material:     handbag.material,
        color:        handbag.color,
        dimensions:   handbag.dimensions,
        weight:       handbag.weight,
        isAvailable:  handbag.quantity > 0 && handbag.isActive,
        isFeatured:   handbag.isFeatured,
        averageRating: handbag.averageRating,
        totalSold:    handbag.totalSold,
        totalRevenue: handbag.totalRevenue,
        userHasPurchased,
        reviews:      handbag.reviews,
        addedBy:      handbag.addedBy,
        createdAt:    handbag.createdAt,
        updatedAt:    handbag.updatedAt
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

// ─── Add handbag to cart ──────────────────────────────────────────────────────
// Stock validation + decrement is handled inside userService.addToCart (transaction).
// This controller just validates the handbag exists/is active, then delegates.
const addToCartController = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const handbag = await getHandbagById(req.params.id);

    if (!handbag) {
      return res.status(404).json({ success: false, message: 'Handbag not found' });
    }
    if (!handbag.isActive) {
      return res.status(400).json({ success: false, message: 'This handbag is no longer available' });
    }

    // Delegate to userService — stock check + decrement happens there inside a transaction
    await addToCart(req.user.uid, {
      type:     'handbag',
      itemId:   req.params.id,
      quantity,
      price:    handbag.price || 0,
      name:     handbag.title || handbag.name || 'Unknown Item',
      image:    handbag.imageData || handbag.image || ''
    });

    res.json({
      success: true,
      message: 'Handbag added to cart. Reserved for 7 days.',
      cartItem: {
        handbagId:  req.params.id,
        title:      handbag.title,
        price:      handbag.price,
        quantity,
        reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    // Surface stock/availability errors as 400 so the front end can show them
    const isStockError = error.message?.toLowerCase().includes('available') ||
                         error.message?.toLowerCase().includes('stock');
    res.status(isStockError ? 400 : 500).json({
      success: false,
      message: error.message || 'Error adding handbag to cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Remove handbag from cart ─────────────────────────────────────────────────
// Stock restoration is handled inside userService.removeFromCart.
const removeFromCartController = async (req, res) => {
  try {
    await removeFromCart(req.user.uid, req.params.id);
    res.json({ success: true, message: 'Handbag removed from cart successfully' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing handbag from cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get user's cart ──────────────────────────────────────────────────────────
// getUserCart already handles expiry + stock restore for stale items.
const getCart = async (req, res) => {
  try {
    // getUserCart returns items with handbag populated as an object and reservedUntil set
    const cartItems = await getUserCart(req.user.uid);

    const handbagCartItems = [];
    let total = 0;

    for (const item of cartItems) {
      // After getUserCart, item.handbag is already the populated object
      const hb = typeof item.handbag === 'object' ? item.handbag : null;
      if (!hb) continue;

      const subtotal = (hb.price || 0) * item.quantity;

      handbagCartItems.push({
        id:       item.id,
        handbag: {
          id:           hb.id,
          title:        hb.title || hb.name,
          price:        hb.price,
          image:        hb.imageData || hb.image,
          quantity:     hb.quantity, // remaining stock (after reservation)
          isAvailable:  hb.isActive !== false,
          category:     hb.category,
          color:        hb.color,
          designerName: hb.designerName
        },
        quantity:      item.quantity,
        subtotal,
        type:          item.type || 'handbag',
        addedAt:       item.addedAt,
        reservedUntil: item.reservedUntil, // expose to frontend for countdown
        isAvailable:   hb.isActive !== false
      });

      total += subtotal;
    }

    res.json({
      success:   true,
      count:     handbagCartItems.length,
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

// ─── Update cart quantity ─────────────────────────────────────────────────────
// Stock delta management is handled inside userService.updateCartQuantity (transaction).
const updateCartQuantityController = async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    const handbag = await getHandbagById(req.params.id);
    if (!handbag || !handbag.isActive) {
      return res.status(404).json({ success: false, message: 'Handbag not found' });
    }

    // Delegate — userService handles stock delta inside a transaction
    await updateCartQuantity(req.user.uid, req.params.id, quantity);

    res.json({
      success: true,
      message: 'Cart updated successfully',
      cartItem: {
        handbagId: req.params.id,
        title:     handbag.title,
        price:     handbag.price,
        quantity,
        subtotal:  handbag.price * quantity
      }
    });

  } catch (error) {
    console.error('Update cart error:', error);
    const isStockError = error.message?.toLowerCase().includes('available') ||
                         error.message?.toLowerCase().includes('stock');
    res.status(isStockError ? 400 : 500).json({
      success: false,
      message: error.message || 'Error updating cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Clear cart ───────────────────────────────────────────────────────────────
const clearCartController = async (req, res) => {
  try {
    await clearCart(req.user.uid);
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Add review ───────────────────────────────────────────────────────────────
const addReviewController = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const handbag = await getHandbagById(req.params.id);
    if (!handbag || !handbag.isActive) {
      return res.status(404).json({ success: false, message: 'Handbag not found' });
    }

    const hasPurchased = handbag.salesHistory &&
      handbag.salesHistory.some(sale => sale.userId === req.user.uid);
    if (!hasPurchased) {
      return res.status(403).json({ success: false, message: 'You can only review handbags you have purchased' });
    }

    await addReview(req.params.id, {
      userId:    req.user.uid,
      userEmail: req.user.email,
      rating,
      comment
    });

    res.json({ success: true, message: 'Review added successfully' });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get categories ───────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const result     = await getHandbags({ page: 1, limit: 1000, distinctCategories: true });
    const categories = [...new Set(result.handbags
      .filter(h => h.category && h.category.trim() !== '')
      .map(h => h.category))];
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Get featured handbags ────────────────────────────────────────────────────
const getFeaturedHandbags = async (req, res) => {
  try {
    const result = await getHandbags({ page: 1, limit: 6, featured: true, available: true, sortBy: 'createdAt', sortOrder: 'desc' });
    res.json({
      success:          true,
      count:            result.handbags.length,
      featuredHandbags: result.handbags.map(h => ({
        id:           h.id,
        title:        h.title,
        description:  h.description,
        price:        h.price,
        designerName: h.designerName,
        image:        h.image,
        category:     h.category,
        averageRating: h.averageRating,
        isAvailable:  h.quantity > 0 && h.isActive
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
  getHandbags:        getAllHandbags,
  getHandbag,
  addToCart:          addToCartController,
  removeFromCart:     removeFromCartController,
  getCart,
  updateCartQuantity: updateCartQuantityController,
  clearCart:          clearCartController,
  addReview:          addReviewController,
  getCategories,
  getFeaturedHandbags
};