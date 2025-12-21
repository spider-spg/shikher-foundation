// User-friendly error message utilities for common scenarios

const ErrorMessages = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'The email or password you entered is incorrect. Please try again',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Please try logging in instead',
    WEAK_PASSWORD: 'Please choose a stronger password with at least 6 characters',
    INVALID_EMAIL: 'Please enter a valid email address',
    USER_DISABLED: 'Your account has been temporarily disabled. Please contact support',
    TOO_MANY_REQUESTS: 'Too many failed login attempts. Please wait a few minutes before trying again',
    NETWORK_ERROR: 'Connection problem. Please check your internet and try again',
    SERVER_ERROR: 'We\'re experiencing technical difficulties. Please try again in a few minutes',
    LOGOUT_ERROR: 'Having trouble signing you out. Please try again',
    SIGNUP_SUCCESS: 'Welcome! Your account has been created successfully',
    LOGIN_SUCCESS: 'Welcome back!',
    LOGOUT_SUCCESS: 'You have been signed out successfully'
  },

  // Form validation errors
  VALIDATION: {
    REQUIRED_FIELD: (fieldName) => `Please enter your ${fieldName}`,
    INVALID_FORMAT: (fieldName) => `Please enter a valid ${fieldName}`,
    PASSWORD_TOO_SHORT: 'Password should be at least 6 characters long for your security',
    PASSWORDS_DONT_MATCH: 'Passwords don\'t match. Please make sure both passwords are the same',
    EMAIL_FORMAT: 'Please enter a valid email address (example: name@example.com)',
    PHONE_FORMAT: 'Please enter a valid phone number',
    FILL_ALL_FIELDS: 'Please fill in all the required fields',
    NAME_TOO_SHORT: 'Name should be at least 2 characters long'
  },

  // Data loading errors
  LOADING: {
    BOOKS_ERROR: 'We\'re having trouble loading the books right now. Please try again in a moment',
    BOOK_NOT_FOUND: 'The book you\'re looking for is not available or has been removed from our collection',
    HANDBAGS_ERROR: 'We\'re having trouble loading the handbags right now. Please try again in a moment',
    HANDBAG_NOT_FOUND: 'The handbag you\'re looking for is not available or has been removed from our collection',
    PROFILE_ERROR: 'We\'re having trouble loading your profile information. Please refresh the page',
    ORDER_ERROR: 'We\'re having trouble loading your order details. Please try again in a moment',
    DONATION_ERROR: 'We\'re having trouble loading your donation details. Please try again in a moment',
    GENERIC_LOADING_ERROR: 'We\'re having trouble loading this information right now. Please try again in a moment'
  },

  // Operation errors
  OPERATIONS: {
    BOOK_BORROW_ERROR: 'We\'re having trouble processing your book borrowing request. Please try again in a moment',
    BOOK_NOT_AVAILABLE: 'This book is currently not available. All copies may already be borrowed or it might be under review',
    ALREADY_BORROWED: 'You have already borrowed this book. Please return it before borrowing it again',
    PICKUP_LOCATION_REQUIRED: 'Please specify where you would like to pick up the book',
    DONATION_SUBMIT_ERROR: 'We\'re having trouble submitting your donation right now. Please try again in a few minutes',
    PAYMENT_ERROR: 'We\'re having trouble processing your payment. Please try again or use a different payment method',
    ORDER_CREATE_ERROR: 'We\'re having trouble creating your order. Please try again in a few minutes',
    PROFILE_UPDATE_ERROR: 'We\'re having trouble updating your profile. Please try again',
    PASSWORD_CHANGE_ERROR: 'We\'re having trouble changing your password. Please try again'
  },

  // Success messages
  SUCCESS: {
    PROFILE_UPDATED: 'Your profile has been updated successfully',
    PASSWORD_CHANGED: 'Your password has been changed successfully',
    BOOK_BORROWED: 'Book borrowed successfully! You can pick it up from the specified location',
    BOOK_RETURNED: 'Book returned successfully. Thank you!',
    DONATION_SUBMITTED: 'Thank you for your donation! We\'ll review it and get back to you soon',
    ORDER_PLACED: 'Your order has been placed successfully!',
    ITEM_ADDED_TO_CART: 'Item added to your cart successfully',
    ITEM_REMOVED_FROM_CART: 'Item removed from your cart'
  },

  // Generic fallbacks
  GENERIC: {
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try again',
    TRY_AGAIN_LATER: 'Please try again in a few minutes',
    CONTACT_SUPPORT: 'If this problem persists, please contact our support team'
  }
};

// Helper function to get error message with fallback
const getErrorMessage = (category, key, fallback = ErrorMessages.GENERIC.SOMETHING_WENT_WRONG) => {
  try {
    return ErrorMessages[category] && ErrorMessages[category][key] 
      ? ErrorMessages[category][key] 
      : fallback;
  } catch (error) {
    return fallback;
  }
};

// Helper function to format validation errors
const formatValidationError = (field, error) => {
  switch (error) {
    case 'required':
      return ErrorMessages.VALIDATION.REQUIRED_FIELD(field);
    case 'invalid':
      return ErrorMessages.VALIDATION.INVALID_FORMAT(field);
    case 'too_short':
      return field === 'password' 
        ? ErrorMessages.VALIDATION.PASSWORD_TOO_SHORT 
        : ErrorMessages.VALIDATION.NAME_TOO_SHORT;
    default:
      return ErrorMessages.VALIDATION.FILL_ALL_FIELDS;
  }
};

export { ErrorMessages, getErrorMessage, formatValidationError };