import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { handbagsAPI } from '../utils/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  cart: [],
  loading: false,
  totalItems: 0,
  totalAmount: 0,
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_CART: 'SET_CART',
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  CALCULATE_TOTALS: 'CALCULATE_TOTALS',
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case ActionTypes.SET_CART:
      const cart = action.payload;
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
      return {
        ...state,
        cart,
        totalItems,
        totalAmount,
        loading: false,
      };
    case ActionTypes.ADD_TO_CART:
      return {
        ...state,
        cart: [...state.cart, action.payload],
      };
    case ActionTypes.REMOVE_FROM_CART:
      return {
        ...state,
        cart: state.cart.filter(item => (item.handbag._id || item.handbag.id) !== action.payload),
      };
    case ActionTypes.UPDATE_QUANTITY:
      return {
        ...state,
        cart: state.cart.map(item =>
          (item.handbag._id || item.handbag.id) === action.payload.id
            ? { ...item, quantity: action.payload.quantity, subtotal: item.handbag.price * action.payload.quantity }
            : item
        ),
      };
    case ActionTypes.CLEAR_CART:
      return {
        ...state,
        cart: [],
        totalItems: 0,
        totalAmount: 0,
      };
    case ActionTypes.CALCULATE_TOTALS:
      const items = state.cart.reduce((sum, item) => sum + item.quantity, 0);
      const amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
      return {
        ...state,
        totalItems: items,
        totalAmount: amount,
      };
    default:
      return state;
  }
};

// Create context
const CartContext = createContext();

// Cart Provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from API
  const loadCart = useCallback(async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      const response = await handbagsAPI.getCart();
      dispatch({
        type: ActionTypes.SET_CART,
        payload: response.data.cartItems || [],
      });
    } catch (error) {
      console.error('Load cart error:', error);
      // Set empty cart on error to prevent app from breaking
      dispatch({
        type: ActionTypes.SET_CART,
        payload: [],
      });
      // Don't show error toast for network issues during initial load
      if (!error.message?.includes('timeout') && !error.message?.includes('Network Error')) {
        console.warn('Cart loading failed, using empty cart as fallback');
      }
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []); // Empty dependency array since loadCart doesn't depend on any external values

  // Add item to cart
  const addToCart = async (handbagId, quantity = 1) => {
    try {
      const response = await handbagsAPI.addToCart(handbagId, { quantity });
      
      // Reload cart to get updated data
      await loadCart();
      
      toast.success('Item added to cart');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add to cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Remove item from cart
  const removeFromCart = async (handbagId) => {
    try {
      await handbagsAPI.removeFromCart(handbagId);
      
      dispatch({
        type: ActionTypes.REMOVE_FROM_CART,
        payload: handbagId,
      });
      
      dispatch({ type: ActionTypes.CALCULATE_TOTALS });
      
      toast.success('Item removed from cart');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove from cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Update item quantity
  const updateQuantity = async (handbagId, quantity) => {
    if (quantity < 1) {
      return removeFromCart(handbagId);
    }

    try {
      await handbagsAPI.updateCartQuantity(handbagId, { quantity });
      
      dispatch({
        type: ActionTypes.UPDATE_QUANTITY,
        payload: { id: handbagId, quantity },
      });
      
      dispatch({ type: ActionTypes.CALCULATE_TOTALS });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update quantity';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      await handbagsAPI.clearCart();
      
      dispatch({ type: ActionTypes.CLEAR_CART });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to clear cart';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Get cart item count for a specific handbag
  const getItemQuantity = (handbagId) => {
    const item = state.cart.find(item => (item.handbag._id || item.handbag.id) === handbagId);
    return item ? item.quantity : 0;
  };

  // Check if item is in cart
  const isInCart = (handbagId) => {
    return state.cart.some(item => (item.handbag._id || item.handbag.id) === handbagId);
  };

  // Calculate shipping cost
  const getShippingCost = () => {
    return state.totalAmount > 1000 ? 0 : 50;
  };

  // Calculate tax (18% GST)
  const getTax = () => {
    return state.totalAmount * 0.18;
  };

  // Calculate final total
  const getFinalTotal = () => {
    return state.totalAmount + getShippingCost() + getTax();
  };

  const value = {
    ...state,
    cartItems: state.cart, // Expose cart as cartItems for consistency
    loadCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
    getShippingCost,
    getTax,
    getFinalTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;