import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  signInWithCustomToken
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  firebaseUser: null,
  idToken: null,
  loading: true,
  isAuthenticated: false,
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  AUTH_ERROR: 'AUTH_ERROR',
  SET_ID_TOKEN: 'SET_ID_TOKEN',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case ActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        firebaseUser: action.payload.firebaseUser,
        loading: false,
        isAuthenticated: true,
      };
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    case ActionTypes.SET_ID_TOKEN:
      return {
        ...state,
        idToken: action.payload,
      };
    case ActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        firebaseUser: null,
        idToken: null,
        loading: false,
        isAuthenticated: false,
      };
    case ActionTypes.AUTH_ERROR:
      return {
        ...state,
        user: null,
        firebaseUser: null,
        idToken: null,
        loading: false,
        isAuthenticated: false,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fetch user data from Firestore
  const fetchUserData = async (firebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName,
          email: firebaseUser.email,
          phone: userData.phoneNumber || userData.phone || '',
          role: userData.role || 'customer',
          ...userData
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      if (firebaseUser) {
        try {
          // Get ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Fetch user data from Firestore
          const userData = await fetchUserData(firebaseUser);
          
          if (userData) {
            dispatch({
              type: ActionTypes.LOGIN_SUCCESS,
              payload: {
                user: userData,
                firebaseUser: firebaseUser,
              },
            });
            
            dispatch({
              type: ActionTypes.SET_ID_TOKEN,
              payload: idToken,
            });
            
            // Store for axios interceptor
            localStorage.setItem('idToken', idToken);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // User exists in Firebase Auth but not in Firestore
            dispatch({ type: ActionTypes.AUTH_ERROR });
            await signOut(auth);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          dispatch({ type: ActionTypes.AUTH_ERROR });
        }
      } else {
        // User is logged out
        localStorage.removeItem('idToken');
        localStorage.removeItem('user');
        dispatch({ type: ActionTypes.LOGOUT });
      }
      
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    });

    return unsubscribe;
  }, []);

  // Login with email and password
  const login = async (email, password) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      // Check for admin login via backend first (case-insensitive)
      const adminEmailEnv = (process.env.REACT_APP_ADMIN_EMAIL || '').toLowerCase();
      const enteredEmail = (email || '').toLowerCase();
      if (enteredEmail === adminEmailEnv && adminEmailEnv) {
        try {
          const response = await authAPI.login({ email, password });
          console.log('Admin login response:', response && response.data);
          if (response.data.success && response.data.customToken) {
            // Use custom token to sign in
            await signInWithCustomToken(auth, response.data.customToken);
            toast.success('Admin login successful');
            return { success: true, user: response.data.user };
          }
        } catch (adminError) {
          console.error('Admin login error:', adminError);
          dispatch({ type: ActionTypes.SET_LOADING, payload: false });
          if (adminError.message?.includes('timeout') || adminError.response?.status >= 500) {
            toast.error('Our server is currently unavailable. Please try again in a few minutes');
          } else if (adminError.response?.status === 401 || adminError.response?.status === 400) {
            toast.error('Invalid admin credentials. Please check your username and password');
          } else {
            toast.error('Unable to sign in as admin. Please try again');
          }
          return { success: false, error: 'Admin login failed' };
        }
      }
      
      // Regular Firebase login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful');
      
      // Return success with user data
      return { 
        success: true, 
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName
        }
      };
      
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: ActionTypes.AUTH_ERROR });
      
      // Handle Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          toast.error('The email or password you entered is incorrect. Please try again');
          break;
        case 'auth/invalid-email':
          toast.error('Please enter a valid email address');
          break;
        case 'auth/user-disabled':
          toast.error('Your account has been temporarily disabled. Please contact support');
          break;
        case 'auth/too-many-requests':
          toast.error('Too many failed login attempts. Please wait a few minutes before trying again');
          break;
        case 'auth/network-request-failed':
          toast.error('Connection problem. Please check your internet and try again');
          break;
        default:
          toast.error('Unable to sign you in right now. Please try again in a few minutes');
      }
      
      // Return error result
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  };

  // Register new user
  const signup = async (userData) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      
      // Create user via backend to set up Firestore document
      const response = await authAPI.signup(userData);
      
      if (response.data.success && response.data.customToken) {
        // Use custom token to sign in
        await signInWithCustomToken(auth, response.data.customToken);
        toast.success('Registration successful');
        return { success: true, user: response.data.user };
      } else {
        return { success: false, error: response.data.message || 'Registration failed' };
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      dispatch({ type: ActionTypes.AUTH_ERROR });
      
      // Handle different error types
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        toast.error('Our server is taking too long to respond. Please try again in a moment');
        return { success: false, error: 'Server timeout' };
      } else if (error.response?.status >= 500) {
        toast.error('We\'re experiencing technical difficulties. Please try again in a few minutes');
        return { success: false, error: 'Server error' };
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Please check your information and try again';
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      const errorMessage = error.response?.data?.message || 'Unable to create your account right now. Please try again';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };
  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Having trouble signing you out. Please try again');
    }
  };

  // Update user profile
  const updateUserProfile = async (userData) => {
    try {
      // Update Firebase Auth profile
      if (state.firebaseUser && userData.name) {
        await updateProfile(state.firebaseUser, {
          displayName: userData.name
        });
      }
      
      // Update backend
      const response = await authAPI.updateProfile(userData);
      
      dispatch({
        type: ActionTypes.UPDATE_USER,
        payload: response.data.user,
      });

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Profile updated successfully');
      return { success: true, user: response.data.user };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Change password
  const changeUserPassword = async (newPassword) => {
    try {
      if (!state.firebaseUser) {
        throw new Error('User not authenticated');
      }
      
      // Update Firebase Auth password
      await updatePassword(state.firebaseUser, newPassword);
      
      // Also update via backend API to ensure consistency
      await authAPI.changePassword({ newPassword });
      
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      
      // Handle Firebase Auth errors
      switch (error.code) {
        case 'auth/requires-recent-login':
          toast.error('Please log in again to change your password');
          break;
        case 'auth/weak-password':
          toast.error('Password is too weak');
          break;
        default:
          const message = error.response?.data?.message || error.message || 'Password change failed';
          toast.error(message);
      }
      
      return { success: false, message: error.message };
    }
  };

  // Refresh ID token
  const refreshToken = async () => {
    try {
      if (state.firebaseUser) {
        const idToken = await state.firebaseUser.getIdToken(true); // Force refresh
        dispatch({
          type: ActionTypes.SET_ID_TOKEN,
          payload: idToken,
        });
        localStorage.setItem('idToken', idToken);
        return idToken;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Check if user is customer
  const isCustomer = () => {
    return state.user?.role === 'customer';
  };

  // Sync user state from outside (e.g. after Profile.js saves its own API call)
  const syncUser = (updatedUser) => {
    dispatch({ type: ActionTypes.UPDATE_USER, payload: updatedUser });
    if (updatedUser) localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    ...state,
    login,
    signup,
    logout,
    updateProfile: updateUserProfile,
    syncUser,
    changePassword: changeUserPassword,
    refreshToken,
    isAdmin,
    isCustomer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;