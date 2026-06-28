import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaBook,
  FaHandPaper,
  FaDonate,
  FaHeart,
  FaShoppingBag
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gradient-white">Shikher Foundations</h3>
            <p className="text-gray-300 leading-relaxed">
              Supporting children and families through book distribution, toys and essential item donations.
            </p>
            <Link 
                to="/about" 
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
              >
                <span>About Us</span>
              </Link>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
              >
                <span>Home</span>
              </Link>
              <Link 
                to="/books" 
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
              >
                <FaBook className="text-sm" />
                <span>Books</span>
              </Link>
              <Link 
                to="/handbags" 
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
              >
                <FaShoppingBag className="text-sm" />
                <span>Handbag</span>
              </Link>
              <Link 
                to="/donate" 
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2"
              >
                <FaHeart className="text-sm" />
                <span>Donate</span>
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Our Activities</h4>
            <div className="flex flex-col space-y-2 text-gray-300">
              <div className="flex items-center space-x-2">
                <FaBook className="text-green-400 text-sm" />
                <span>Book Distribution</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaShoppingBag className="text-orange-400 text-sm" />
                <span>Selling Handbags</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaDonate className="text-blue-400 text-sm" />
                <span>Community Donations</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact Us</h4>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <FaMapMarkerAlt className="text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <p><strong>Shikher Foundations Pickup Point</strong></p>
                  <p>Jhulelal Society</p>
                  <p>House no 15, Sector 2B, Airoli</p>
                  <p>Navi Mumbai, Maharashtra 400708</p>
                  <p className="text-yellow-300 text-sm mt-1">Call us before you send or come to drop</p>
                  <a 
                    href="https://maps.app.goo.gl/qkcwEVqw5bcsnN3s7" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-200 text-sm underline mt-1 block"
                  >
                    📍 View on Google Maps
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaPhone className="text-green-400 flex-shrink-0" />
                <a 
                  href="tel:+919324335478" 
                  className="hover:text-white transition-colors"
                >
                  +91-93243 35478
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;