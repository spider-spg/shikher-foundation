import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBook, 
  FaHandPaper, 
  FaShoppingCart, 
  FaUser, 
  FaBars, 
  FaTimes, 
  FaSignOutAlt,
  FaHome,
  FaDonate,
  FaBox,
  FaCog,
  FaChartBar,
  FaUsers,
  FaHeart
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout, isAdmin, loading } = useAuth();
  const { totalItems, loadCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      loadCart();
    }
  }, [isAuthenticated, user?.role, loadCart]); // Use user.role instead of isAdmin() function

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileDropdownOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/ShikherFoundationLogo.jpg" 
                alt="Shikher Foundation Logo" 
                className="w-10 h-10 object-contain rounded-full mr-3"
              />
              <Link to="/" className="text-2xl font-bold text-gradient">
                Shikher Foundation
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/ShikherFoundationLogo.jpg" 
              alt="Shikher Foundation Logo" 
              className="w-10 h-10 object-contain rounded-full mr-3"
            />
            <Link to="/" className="text-2xl font-bold text-gradient">
              Shikher Foundation
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {!isAuthenticated ? (
              // Public Navigation
              <>
                <Link
                  to="/"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHome />
                  <span>Home</span>
                </Link>
                <Link
                  to="/books"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/books') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaBook />
                  <span>Books</span>
                </Link>
                <Link
                  to="/handbags"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/handbags') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHandPaper />
                  <span>Handbags</span>
                </Link>
                <Link to="/login" className="btn-outline">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            ) : isAdmin() ? (
              // Admin Navigation
              <>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/admin/dashboard') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaChartBar />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/admin/books"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/admin/books') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaBook />
                  <span>Books</span>
                </Link>
                <Link
                  to="/admin/handbags"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/admin/handbags') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHandPaper />
                  <span>Handbags</span>
                </Link>
                <Link
                  to="/admin/orders"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/admin/orders') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaBox />
                  <span>Orders</span>
                </Link>
                <Link
                  to="/admin/donations"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/admin/donations') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHeart />
                  <span>Donations</span>
                </Link>
                
                {/* Admin Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <FaUser />
                    <span>{user?.name}</span>
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FaCog className="inline mr-2" />
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaSignOutAlt className="inline mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Customer Navigation
              <>
                <Link
                  to="/"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHome />
                  <span>Home</span>
                </Link>
                <Link
                  to="/books"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/books') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaBook />
                  <span>Books</span>
                </Link>
                <Link
                  to="/handbags"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/handbags') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHandPaper />
                  <span>Handbags</span>
                </Link>
                <Link
                  to="/shelf"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/shelf') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaBox />
                  <span>My Shelf</span>
                </Link>
                <Link
                  to="/donate"
                  className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${
                    isActivePath('/donate') ? 'text-primary-600 font-semibold' : ''
                  }`}
                >
                  <FaHeart />
                  <span>Donate</span>
                </Link>
                
                {/* Cart */}
                <Link
                  to="/cart"
                  className="relative flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <FaShoppingCart />
                  <span>Cart</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>

                {/* Customer Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <FaUser />
                    <span>{user?.name}</span>
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FaCog className="inline mr-2" />
                        Profile Settings
                      </Link>
                      <Link
                        to="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FaBox className="inline mr-2" />
                        My Orders
                      </Link>
                      <Link
                        to="/my-donations"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FaHeart className="inline mr-2" />
                        My Donations
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaSignOutAlt className="inline mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {!isAuthenticated ? (
                // Public Mobile Navigation
                <>
                  <Link
                    to="/"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHome className="inline mr-2" />
                    Home
                  </Link>
                  <Link
                    to="/books"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBook className="inline mr-2" />
                    Books
                  </Link>
                  <Link
                    to="/handbags"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHandPaper className="inline mr-2" />
                    Handbags
                  </Link>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </>
              ) : isAdmin() ? (
                // Admin Mobile Navigation
                <>
                  <Link
                    to="/admin/dashboard"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaChartBar className="inline mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/books"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBook className="inline mr-2" />
                    Books
                  </Link>
                  <Link
                    to="/admin/handbags"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHandPaper className="inline mr-2" />
                    Handbags
                  </Link>
                  <Link
                    to="/admin/orders"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBox className="inline mr-2" />
                    Orders
                  </Link>
                  <Link
                    to="/admin/book-donations"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHeart className="inline mr-2" />
                    Donations
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaUser className="inline mr-2" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <FaSignOutAlt className="inline mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                // Customer Mobile Navigation
                <>
                  <Link
                    to="/"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHome className="inline mr-2" />
                    Home
                  </Link>
                  <Link
                    to="/books"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBook className="inline mr-2" />
                    Books
                  </Link>
                  <Link
                    to="/handbags"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHandPaper className="inline mr-2" />
                    Handbags
                  </Link>
                  <Link
                    to="/shelf"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBox className="inline mr-2" />
                    My Shelf
                  </Link>
                  <Link
                    to="/donate"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaHeart className="inline mr-2" />
                    Donate
                  </Link>
                  <Link
                    to="/cart"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaShoppingCart className="inline mr-2" />
                    Cart {totalItems > 0 && `(${totalItems})`}
                  </Link>
                  <Link
                    to="/orders"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaBox className="inline mr-2" />
                    My Orders
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={closeMenu}
                  >
                    <FaUser className="inline mr-2" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <FaSignOutAlt className="inline mr-2" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;