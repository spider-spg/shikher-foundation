# Shikher Foundations - NGO Portal

A comprehensive full-stack web application for the Shikher Foundations NGO, featuring book lending, handbag sales, donation system, and complete admin management.

## 🚀 Features

### Admin Features
- **Dashboard**: Real-time analytics and statistics
- **Book Management**: Add, edit, remove books and track borrowings
- **Handbag Management**: Manage handmade handbag inventory and sales
- **Order Management**: Track orders, delivery status, and customer details
- **Donation Tracking**: Monitor book donations and cash donations
- **User Management**: View and manage customer accounts
- **Book Request System**: Handle customer book requests

### Customer Features
- **Book Browsing**: Search and browse available books
- **Book Borrowing**: Borrow books with tracking system
- **Handbag Shopping**: Browse and purchase handmade handbags
- **Shopping Cart**: Add items to cart with persistent storage
- **Book Donations**: Donate books to the foundation
- **Cash Donations**: Make monetary donations
- **Order Tracking**: Track order status and delivery
- **User Profile**: Manage personal information and view history
- **My Shelf**: Track borrowed books and reading history

## 🛠️ Tech Stack

- **Frontend**: React.js 18, React Router DOM, TailwindCSS, React Icons
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Authentication with JWT tokens
- **File Upload**: Multer with Sharp for image processing
- **Payment**: Razorpay integration
- **State Management**: React Context API
- **Styling**: TailwindCSS with custom utilities
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- Firebase Project with Firestore and Authentication enabled
- Firebase Service Account Key
- Razorpay Account (for payment processing)

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd "Shikher Foundations"
```

### 2. Install Dependencies
```bash
# Install all dependencies (frontend + backend)
npm run install-all

# Or install individually:
npm run install-server  # Backend dependencies
npm run install-client  # Frontend dependencies
```

### 3. Firebase Configuration

#### Backend Setup:
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database and Authentication
3. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `ServiceAccountKey.json` in the backend root directory

#### Frontend Setup:
1. Get Firebase web config from Project Settings > General
2. Create `firebase.js` in `frontend/src/` with your config

### 4. Environment Configuration

#### Backend `.env` file:
```env
NODE_ENV=development
PORT=5000
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=http://localhost:3000
```

#### Frontend `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 5. Firebase Security Rules
Configure Firestore security rules and Firebase Storage rules for proper access control.

## 🏃‍♂️ Running the Application

### Development Mode (Both servers)
```bash
# Run both frontend and backend concurrently
npm run dev
```

### Individual Servers

#### Start Backend Server
```bash
npm run server
# or
cd backend && npm run dev
```
Backend will run on http://localhost:5000

#### Start Frontend Server
```bash
npm run client
# or
cd frontend && npm start
```
Frontend will run on http://localhost:3000

### Production Build
```bash
npm run build
npm start
```


## 📁 Project Structure

```
Shikher Foundations/
├── backend/
│   ├── config/
│   │   └── firebaseAdmin.js         # Firebase admin configuration
│   ├── controllers/
│   │   ├── adminController.js       # Admin management
│   │   ├── authController.js        # Authentication logic
│   │   ├── bookController.js        # Book operations
│   │   ├── bookRequestController.js # Book request handling
│   │   ├── donationController.js    # Donation management
│   │   ├── handbagController.js     # Handbag operations
│   │   └── orderController.js       # Order processing
│   ├── middleware/
│   │   ├── adminMiddleware.js       # Admin authorization
│   │   ├── authMiddleware.js        # Authentication middleware
│   │   └── uploadMiddleware.js      # File upload handling
│   ├── routes/
│   │   ├── adminRoutes.js           # Admin API routes
│   │   ├── authRoutes.js            # Authentication routes
│   │   ├── bookRoutes.js            # Book API routes
│   │   ├── donationRoutes.js        # Donation API routes
│   │   ├── handbagRoutes.js         # Handbag API routes
│   │   └── orderRoutes.js           # Order API routes
│   ├── services/
│   │   ├── bookService.js           # Book business logic
│   │   ├── donationService.js       # Donation business logic
│   │   ├── uploadService.js         # File upload service
│   │   └── userService.js           # User management service
│   ├── utils/                       # Utility functions
│   ├── server.js                    # Express server
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── ErrorBoundary.js     # Error handling
│   │   │   ├── Footer.js            # Footer component
│   │   │   ├── LoadingSpinner.js    # Loading states
│   │   │   ├── Navbar.js            # Navigation
│   │   │   └── ProtectedRoute.js    # Route protection
│   │   ├── context/
│   │   │   ├── AuthContext.js       # Authentication state
│   │   │   └── CartContext.js       # Shopping cart state
│   │   ├── pages/
│   │   │   ├── admin/               # Admin pages
│   │   │   ├── Books.js             # Book catalog
│   │   │   ├── Cart.js              # Shopping cart
│   │   │   ├── Checkout.js          # Order checkout
│   │   │   ├── Donate.js            # Donation page
│   │   │   ├── Home.js              # Landing page
│   │   │   ├── Login.js             # User login
│   │   │   ├── Orders.js            # Order history
│   │   │   └── Profile.js           # User profile
│   │   ├── utils/
│   │   │   └── api.js               # API utilities
│   │   ├── firebase.js              # Firebase config
│   │   ├── App.js                   # Main app component
│   │   └── index.js                 # React entry point
│   ├── tailwind.config.js           # TailwindCSS config
│   └── package.json
├── ServiceAccountKey.json           # Firebase service account (gitignored)
├── .gitignore                       # Git ignore rules
├── firestore.rules                  # Firestore security rules
├── package.json                     # Root package file
└── README.md
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User/Admin login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout
- `GET /api/auth/stats` - Get user statistics

### Books
- `GET /api/books` - Get all available books
- `GET /api/books/:id` - Get book details
- `POST /api/books/borrow` - Borrow a book
- `PUT /api/books/return` - Return a borrowed book
- `GET /api/books/borrowed` - Get user's borrowed books

### Book Requests
- `POST /api/book-requests` - Request a new book
- `GET /api/book-requests` - Get user's book requests

### Handbags
- `GET /api/handbags` - Get all handbags
- `GET /api/handbags/:id` - Get handbag details
- `POST /api/handbags/cart` - Add handbag to cart
- `DELETE /api/handbags/cart/:id` - Remove from cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get specific order details
- `PUT /api/orders/:id/cancel` - Cancel order

### Donations
- `POST /api/donations` - Make cash donation
- `POST /api/donations/books` - Donate books
- `GET /api/donations` - Get user's donation history

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard analytics
- `GET /api/admin/users` - Get all users
- `POST /api/admin/books` - Add new book
- `PUT /api/admin/books/:id` - Update book
- `DELETE /api/admin/books/:id` - Delete book
- `POST /api/admin/handbags` - Add new handbag
- `PUT /api/admin/handbags/:id` - Update handbag
- `DELETE /api/admin/handbags/:id` - Delete handbag
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id` - Update order status
- `GET /api/admin/donations` - Get all donations
- `GET /api/admin/book-requests` - Get all book requests

## � Development

### Backend Development
- **Framework**: Express.js with middleware for authentication, CORS, and security
- **Database**: Firebase Firestore with real-time capabilities
- **Authentication**: Firebase Authentication with custom token support
- **File Uploads**: Multer with Sharp for image processing and optimization
- **Payment Integration**: Razorpay for secure payment processing
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Development**: Nodemon for auto-restart during development

### Frontend Development
- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router DOM v6 for navigation
- **State Management**: React Context API for global state
- **Styling**: TailwindCSS with custom utilities and responsive design
- **Icons**: React Icons for consistent iconography
- **Notifications**: React Hot Toast for user feedback
- **Authentication**: Firebase Authentication client-side integration

### Code Organization
- **Services Layer**: Business logic separation in backend services
- **Context Providers**: Centralized state management for auth and cart
- **Protected Routes**: Role-based access control for admin and user areas
- **Error Boundaries**: React error boundaries for graceful error handling
- **API Layer**: Centralized API calls with automatic token handling

## 🚀 Deployment

### Prerequisites for Deployment
- Firebase project with production configuration
- Domain name (optional but recommended)
- SSL certificate (automatically handled by most platforms)

### Recommended Platforms
- **Frontend**: Vercel, Netlify, or Firebase Hosting
- **Backend**: Railway, Render, or Google Cloud Run
- **Database**: Firebase Firestore (already cloud-based)
- **File Storage**: Firebase Storage

### Environment Variables for Production
Ensure all environment variables are properly configured in your hosting platform:
- Firebase configuration
- Razorpay keys
- Admin credentials
- CORS origins

## 📱 Features & Functionality

### Authentication System
- **Firebase Authentication**: Secure user registration and login
- **Role-based Access**: Admin and customer role separation
- **Session Management**: Persistent login with automatic token refresh
- **Profile Management**: Update user information and change passwords
- **Security**: Token-based authentication with refresh token support

### Book Management System
- **Catalog Browsing**: Search and filter available books
- **Borrowing System**: Track borrowed books with due dates
- **Book Requests**: Request books not in current inventory
- **Digital Library**: Personal shelf to track reading history
- **Admin Controls**: Add, edit, and manage book inventory

### E-commerce Features
- **Handbag Catalog**: Browse handmade handbag collection
- **Shopping Cart**: Persistent cart with item management
- **Secure Checkout**: Razorpay integration for payments
- **Order Tracking**: Real-time order status updates
- **Inventory Management**: Stock tracking and availability

### Donation System
- **Book Donations**: Donate books to expand library
- **Cash Donations**: Monetary contributions to the foundation
- **Donation History**: Track all donation activities
- **Impact Tracking**: See how donations help the community

### Admin Dashboard
- **Analytics**: Real-time statistics and insights
- **User Management**: View and manage user accounts
- **Content Management**: Control all books and handbags
- **Order Management**: Process and track all orders
- **Donation Oversight**: Monitor all donation activities

## 🔒 Security Features

- **Firebase Security Rules**: Secure database access
- **Input Validation**: Server-side validation using Validator.js
- **Rate Limiting**: Prevent API abuse and spam
- **CORS Protection**: Controlled cross-origin requests
- **Helmet Security**: Security headers and protection
- **Environment Variables**: Sensitive data protection
- **Token Revocation**: Secure logout with token invalidation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add comments for complex logic
- Test thoroughly before submitting PRs
- Update documentation for new features
- Ensure responsive design compatibility

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Documentation: Check this README and inline code comments

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Firebase** for authentication and database services
- **React Community** for excellent documentation and tools
- **TailwindCSS** for beautiful, responsive styling
- **Open Source Contributors** who make projects like this possible

---
