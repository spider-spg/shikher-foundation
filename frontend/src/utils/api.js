import axios from 'axios';

// Create axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Helper function to get full image URL - will be updated for Firebase Storage later
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath; // Firebase Storage URLs
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return `${baseURL.replace('/api', '')}${imagePath}`;
};

// Request interceptor to add Firebase ID token
API.interceptors.request.use(
  (config) => {
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle Firebase token errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message || '';
      const isTokenError = message.includes('Token expired') || 
                          message.includes('Invalid token') || 
                          message.includes('Token revoked') ||
                          message.includes('not valid') ||
                          message.includes('No token provided');
      
      // Don't handle logout API errors or if already on auth pages
      const isLogoutRequest = error.config?.url?.includes('/auth/logout');
      const isOnAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
      
      if (isTokenError && !isLogoutRequest && !isOnAuthPage) {
        // Try to refresh token first
        try {
          // This will be handled by Firebase onAuthStateChanged
          const { auth } = await import('../firebase');
          const user = auth.currentUser;
          if (user) {
            const newIdToken = await user.getIdToken(true); // Force refresh
            localStorage.setItem('idToken', newIdToken);
            
            // Retry the original request with new token
            error.config.headers.Authorization = `Bearer ${newIdToken}`;
            return API.request(error.config);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
        
        // If refresh fails, clear storage and redirect
        localStorage.removeItem('idToken');
        localStorage.removeItem('user');
        
        // Use setTimeout to avoid interfering with ongoing logout process
        setTimeout(() => {
          if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            window.location.href = '/login';
          }
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  signup: (userData) => API.post('/auth/signup', userData),
  getMe: () => API.get('/auth/me'),
  updateProfile: (userData) => API.put('/auth/profile', userData),
  changePassword: (passwords) => API.put('/auth/change-password', passwords),
  logout: () => API.post('/auth/logout'),
};

export const booksAPI = {
  getBooks: (params) => API.get('/books', { params }),
  getBook: (id) => API.get(`/books/${id}`),
};

export const handbagsAPI = {
  getHandbags: (params) => API.get('/handbags', { params }),
  getHandbag: (id) => API.get(`/handbags/${id}`),
  addToCart: (id, data) => API.post(`/handbags/${id}/cart`, data),
  removeFromCart: (id) => API.delete(`/handbags/${id}/cart`),
  getCart: () => API.get('/handbags/cart'),
  updateCartQuantity: (id, data) => API.put(`/handbags/${id}/cart`, data),
  clearCart: () => API.delete('/handbags/cart'),
  addReview: (id, data) => API.post(`/handbags/${id}/review`, data),
  getCategories: () => API.get('/handbags/categories'),
  getFeaturedHandbags: () => API.get('/handbags/featured'),
};

export const ordersAPI = {
  createOrder: (data) => API.post('/orders/create', data),
  verifyPayment: (id, data) => API.post(`/orders/${id}/verify-payment`, data),
  getMyOrders: (params) => API.get('/orders', { params }),
  getOrder: (id) => API.get(`/orders/${id}`),
  cancelOrder: (id, data) => API.put(`/orders/${id}/cancel`, data),
  trackOrder: (trackingId) => API.get(`/orders/track/${trackingId}`),
};

export const donationsAPI = {
  createDonation: (data) => {
    const formData = new FormData();
    
    // Append book data
    Object.keys(data.book).forEach(key => {
      formData.append(`book[${key}]`, data.book[key]);
    });
    
    // Append pickup details
    Object.keys(data.pickupDetails).forEach(key => {
      formData.append(`pickupDetails[${key}]`, data.pickupDetails[key]);
    });
    
    // Append other fields
    formData.append('quantity', data.quantity);
    formData.append('isUrgent', data.isUrgent);
    
    // Append images
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('donationImages', image);
      });
    }
    
    return API.post('/donations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getMyDonations: (params) => API.get('/donations/my-donations', { params }),
  getDonation: (id) => API.get(`/donations/${id}`),
  updateDonation: (id, data) => {
    const formData = new FormData();
    
    // Append updated data
    if (data.book) {
      Object.keys(data.book).forEach(key => {
        formData.append(`book[${key}]`, data.book[key]);
      });
    }
    
    if (data.pickupDetails) {
      Object.keys(data.pickupDetails).forEach(key => {
        formData.append(`pickupDetails[${key}]`, data.pickupDetails[key]);
      });
    }
    
    if (data.isUrgent !== undefined) {
      formData.append('isUrgent', data.isUrgent);
    }
    
    // Append new images if any
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        formData.append('donationImages', image);
      });
    }
    
    return API.put(`/donations/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  cancelDonation: (id, data) => API.delete(`/donations/${id}`, { data }),
  getDonationStats: () => API.get('/donations/stats'),
};

export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getBooks: () => API.get('/books'),
  getHandbags: () => API.get('/handbags'),
  getOrders: () => API.get('/orders'),
  getAllDonations: (params) => API.get('/admin/donations', { params }),
  updateDonationStatus: (id, data) => API.put(`/admin/donations/${id}/status`, data),
  addBook: (data) => {
    const formData = new FormData();
    
    // Append book data
    Object.keys(data).forEach(key => {
      if (key !== 'image') {
        formData.append(key, data[key]);
      }
    });
    
    // Append image - either file upload or Google Books URL
    if (data.image) {
      formData.append('bookImage', data.image);
    }
    
    return API.post('/admin/books', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  addHandbag: (data) => {
    const formData = new FormData();
    
    // Append handbag data
    Object.keys(data).forEach(key => {
      if (key !== 'image') {
        formData.append(key, data[key]);
      }
    });
    
    // Append image
    if (data.image) {
      formData.append('handbagImage', data.image);
    }
    
    return API.post('/admin/handbags', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateBookQuantity: (id, data) => API.put(`/admin/books/${id}/quantity`, data),
  updateHandbagQuantity: (id, data) => API.put(`/admin/handbags/${id}/quantity`, data),
  getAllOrders: (params) => API.get('/admin/orders', { params }),
  updateOrderStatus: (id, data) => API.put(`/admin/orders/${id}/status`, data),
  getAllDonations: (params) => API.get('/admin/donations', { params }),
  updateDonationStatus: (id, data) => API.put(`/admin/donations/${id}/status`, data),
  // Google Books integration methods
    addBookStock: (id, data) => API.put(`/admin/books/${id}/add-stock`, data),
  // Generic methods for Google Books API integration
  get: (url, config) => API.get(url, config),
  post: (url, data, config) => API.post(url, data, config),
  put: (url, data, config) => API.put(url, data, config),
};

export default API;