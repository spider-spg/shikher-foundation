import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaBook, FaShoppingBag, FaShoppingCart, FaUser, FaBars, FaTimes,
  FaSignOutAlt, FaHome, FaBox, FaCog, FaChartBar, FaHeart
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
    if (isAuthenticated && user?.role !== 'admin') loadCart();
  }, [isAuthenticated, user?.role, loadCart]);

  const handleLogout = () => { logout(); navigate('/'); setIsProfileDropdownOpen(false); };
  const toggleMenu  = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu   = () => setIsMenuOpen(false);
  const isActive    = (path) => location.pathname === path ? 'text-primary-600 font-semibold' : '';

  const navLink = (to, Icon, label) => (
    <Link to={to} className={`flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors ${isActive(to)}`}>
      <Icon /><span>{label}</span>
    </Link>
  );

  if (loading) return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-full mr-3" />
            <Link to="/" className="text-2xl font-bold text-gradient">Shikher Foundations</Link>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-full mr-3" />
            <Link to="/" className="text-2xl font-bold text-gradient">Shikher Foundations</Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {!isAuthenticated ? (
              <>
                {navLink('/', FaHome, 'Home')}
                {navLink('/books', FaBook, 'Books')}
                {navLink('/handbags', FaShoppingBag, 'Handbags')}
                <Link to="/login" className="btn-outline">Login</Link>
                <Link to="/signup" className="btn-primary">Sign Up</Link>
              </>
            ) : isAdmin() ? (
              <>
                {navLink('/admin/dashboard', FaChartBar, 'Dashboard')}
                {navLink('/admin/books', FaBook, 'Books')}
                {navLink('/admin/handbags', FaShoppingBag, 'Handbags')}
                {navLink('/admin/orders', FaBox, 'Orders')}
                {navLink('/admin/donations', FaHeart, 'Donations')}
                {/* Admin Profile Dropdown */}
                <div className="relative">
                  <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                    <FaUser /><span>{user?.name}</span>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaCog className="inline mr-2" />Profile Settings
                      </Link>
                      <button onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaSignOutAlt className="inline mr-2" />Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {navLink('/', FaHome, 'Home')}
                {navLink('/books', FaBook, 'Books')}
                {navLink('/handbags', FaShoppingBag, 'Handbags')}
                {navLink('/donate', FaHeart, 'Donate')}
                {/* Cart */}
                <Link to="/cart" className="relative flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                  <FaShoppingCart /><span>Cart</span>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
                {/* Customer Profile Dropdown */}
                <div className="relative">
                  <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                    <FaUser /><span>{user?.name}</span>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaCog className="inline mr-2" />Profile Settings
                      </Link>
                      <Link to="/shelf" onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaBook className="inline mr-2" />My Shelf
                      </Link>
                      <Link to="/orders" onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaShoppingBag className="inline mr-2" />My Orders
                      </Link>
                      <Link to="/my-donations" onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaHeart className="inline mr-2" />My Donations
                      </Link>
                      <button onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <FaSignOutAlt className="inline mr-2" />Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button onClick={toggleMenu} className="text-gray-700 hover:text-primary-600 transition-colors">
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {!isAuthenticated ? (
                <>
                  <Link to="/"        onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaHome className="inline mr-2" />Home</Link>
                  <Link to="/books"   onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaBook className="inline mr-2" />Books</Link>
                  <Link to="/handbags" onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaShoppingBag className="inline mr-2" />Handbags</Link>
                  <Link to="/login"   onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600">Login</Link>
                  <Link to="/signup"  onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600">Sign Up</Link>
                </>
              ) : isAdmin() ? (
                <>
                  <Link to="/admin/dashboard" onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaChartBar className="inline mr-2" />Dashboard</Link>
                  <Link to="/admin/books"     onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaBook className="inline mr-2" />Books</Link>
                  <Link to="/admin/handbags"  onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaShoppingBag className="inline mr-2" />Handbags</Link>
                  <Link to="/admin/orders"    onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaBox className="inline mr-2" />Orders</Link>
                  <Link to="/admin/donations" onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaHeart className="inline mr-2" />Donations</Link>
                  <Link to="/profile"         onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaUser className="inline mr-2" />Profile</Link>
                  <button onClick={() => { handleLogout(); closeMenu(); }} className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary-600">
                    <FaSignOutAlt className="inline mr-2" />Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/"           onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaHome className="inline mr-2" />Home</Link>
                  <Link to="/books"      onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaBook className="inline mr-2" />Books</Link>
                  <Link to="/handbags"   onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaShoppingBag className="inline mr-2" />Handbags</Link>
                  <Link to="/donate"     onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaHeart className="inline mr-2" />Donate</Link>
                  <Link to="/cart"       onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaShoppingCart className="inline mr-2" />Cart {totalItems > 0 && `(${totalItems})`}</Link>
                  <Link to="/shelf"      onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaBook className="inline mr-2" />My Shelf</Link>
                  <Link to="/orders"     onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaShoppingBag className="inline mr-2" />My Orders</Link>
                  <Link to="/my-donations" onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaHeart className="inline mr-2" />My Donations</Link>
                  <Link to="/profile"    onClick={closeMenu} className="block px-3 py-2 text-gray-700 hover:text-primary-600"><FaUser className="inline mr-2" />Profile</Link>
                  <button onClick={() => { handleLogout(); closeMenu(); }} className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary-600">
                    <FaSignOutAlt className="inline mr-2" />Logout
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