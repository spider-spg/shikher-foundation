import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaHandPaper, 
  FaShoppingCart, 
  FaStar,
  FaTag,
  FaPlus,
  FaRupeeSign
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api, { getImageUrl } from '../utils/api';

const Handbags = () => {
  const [handbags, setHandbags] = useState([]);
  const [filteredHandbags, setFilteredHandbags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [addingToCart, setAddingToCart] = useState({});
  
  const { isAuthenticated, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHandbags();
  }, []);

  useEffect(() => {
    filterAndSortHandbags();
  }, [handbags, sortBy]);

  const fetchHandbags = async () => {
    try {
      setLoading(true);
      const response = await api.get('/handbags');
      setHandbags(response.data.handbags || []);
    } catch (error) {
      console.error('Error fetching handbags:', error);
      // Don't show error toast for server/network issues
      if (!error.message?.includes('timeout') && !error.message?.includes('Network Error') && error.response?.status !== 500) {
        toast.error('Failed to load handbags');
      } else {
        console.warn('Backend unavailable, handbags will not be loaded');
      }
      // Set empty array as fallback
      setHandbags([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortHandbags = () => {
    let filtered = [...handbags];

    // Sort handbags
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'available':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    setFilteredHandbags(filtered);
  };

  const handleAddToCart = async (handbagId) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (isAdmin()) {
      toast.error('Admins cannot purchase products');
      return;
    }

    setAddingToCart(prev => ({ ...prev, [handbagId]: true }));

    try {
      await addToCart(handbagId, 1);
      toast.success('Added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [handbagId]: false }));
    }
  };

  const isHandbagAvailable = (handbag) => {
    return handbag.quantity > 0;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Handcrafted Handbags
          </h1>
          <p className="text-lg text-gray-600">
            Beautiful handmade bags. Each purchase supports our community.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-left">
            {/* Sort By */}
            <div className="w-full max-w-xs">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="name">Sort by Name</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="available">Most Available</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredHandbags.length} of {handbags.length} handbags
          </p>
          
          {isAdmin() && (
            <Link
              to="/admin/handbags/add"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Handbag</span>
            </Link>
          )}
        </div>

        {/* Handbags Grid */}
        {filteredHandbags.length === 0 ? (
          <div className="text-center py-12">
            <FaHandPaper className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Handbags Found</h3>
            <p className="text-gray-500">
              No handbags available at the moment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHandbags.map((handbag, index) => (
              <div key={handbag.id || `handbag-${index}`} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
                {/* Handbag Image */}
                <div className="relative h-64 bg-gray-200 flex-shrink-0">
                  {handbag.imageData ? (
                    <img
                      src={handbag.imageData}
                      alt={handbag.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center" style={{ display: handbag.imageData ? 'none' : 'flex' }}>
                    <FaHandPaper className="text-4xl text-purple-600" />
                  </div>
                  
                  {/* Stock Badge */}
                  {handbag.quantity <= 5 && handbag.quantity > 0 && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Only {handbag.quantity} left
                    </div>
                  )}
                  
                  {handbag.quantity === 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Handbag Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <div className="mb-2">
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {handbag.category}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {handbag.title}
                    </h3>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <FaTag className="mr-1" />
                      <span className="line-clamp-1">{handbag.color}</span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {handbag.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary-600">
                        {formatPrice(handbag.price)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Stock: {handbag.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Action Button - Always at bottom */}
                  <div className="mt-auto">
                    {!isAuthenticated ? (
                      <Link
                        to="/login"
                        className="w-full btn-outline text-center"
                      >
                        Login to Purchase
                      </Link>
                    ) : isAdmin() ? (
                      <Link
                        to={`/admin/handbags/${handbag.id}/edit`}
                        className="w-full btn-outline text-center"
                      >
                        Edit Handbag
                      </Link>
                    ) : !isHandbagAvailable(handbag) ? (
                      <button
                        disabled
                        className="w-full bg-red-100 text-red-800 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    ) : (
                      <button
                        onClick={() => handbag.id && handleAddToCart(handbag.id)}
                        disabled={!handbag.id || addingToCart[handbag.id]}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {addingToCart[handbag.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <FaShoppingCart />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Handbags;