import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaShoppingBag, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter,
  FaEye,
  FaDollarSign,
  FaTag,
  FaSort,
  FaBoxOpen,
  FaChartLine
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import api, { getImageUrl } from '../../utils/api';

const AdminHandbags = () => {
  const [handbags, setHandbags] = useState([]);
  const [filteredHandbags, setFilteredHandbags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [handbagToDelete, setHandbagToDelete] = useState(null);
  
  const { isAdmin, user } = useAuth();

  const categories = [
    'Tote Bags',
    'Handbags',
    'Crossbody Bags',
    'Backpacks',
    'Clutches',
    'Shoulder Bags',
    'Evening Bags',
    'Travel Bags',
    'Eco-Friendly',
    'Handmade',
    'Vintage',
    'Other'
  ];

  const priceRanges = [
    { label: 'Under ₹500', min: 0, max: 500 },
    { label: '₹500 - ₹1000', min: 500, max: 1000 },
    { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
    { label: '₹2000 - ₹5000', min: 2000, max: 5000 },
    { label: 'Above ₹5000', min: 5000, max: Infinity }
  ];

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchHandbags();
    }
  }, [user?.role]); // Use user.role instead of isAdmin() function

  useEffect(() => {
    filterAndSortHandbags();
  }, [handbags, searchTerm, selectedCategory, priceRange, sortBy]);

  const fetchHandbags = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/handbags?limit=1000');
      setHandbags(response.data.handbags || []);
    } catch (error) {
      console.error('Error fetching handbags:', error);
      toast.error('Failed to load handbags');
      setHandbags([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortHandbags = () => {
    let filtered = [...handbags];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(handbag =>
        handbag.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        handbag.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (handbag.material && handbag.material.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(handbag => handbag.category === selectedCategory);
    }

    // Filter by price range
    if (priceRange) {
      const range = priceRanges.find(r => r.label === priceRange);
      if (range) {
        filtered = filtered.filter(handbag => 
          handbag.price >= range.min && handbag.price < range.max
        );
      }
    }

    // Sort handbags
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'priceDesc':
          return (b.price || 0) - (a.price || 0);
        case 'stock':
          return (b.stock || 0) - (a.stock || 0);
        case 'sales':
          return (b.totalSales || 0) - (a.totalSales || 0);
        case 'createdAt':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    setFilteredHandbags(filtered);
  };

  const handleDeleteClick = (handbag) => {
    setHandbagToDelete(handbag);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!handbagToDelete) return;

    setDeleting(prev => ({ ...prev, [handbagToDelete.id]: true }));

    try {
      await api.delete(`/admin/handbags/${handbagToDelete.id}`);
      toast.success('Handbag deleted successfully!');
      
      // Remove handbag from state
      setHandbags(prevHandbags => prevHandbags.filter(handbag => handbag.id !== handbagToDelete.id));
      setShowDeleteModal(false);
      setHandbagToDelete(null);
    } catch (error) {
      console.error('Error deleting handbag:', error);
      toast.error(error.response?.data?.message || 'Failed to delete handbag');
    } finally {
      setDeleting(prev => ({ ...prev, [handbagToDelete.id]: false }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'undefined') return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) return 'Not available';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Not available';
    }
  };

  const getStockStatusColor = (stock) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (stock) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 5) return 'Low Stock';
    return 'In Stock';
  };

  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !handbagToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Handbag
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{handbagToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting[handbagToDelete.id]}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting[handbagToDelete.id] ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setHandbagToDelete(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Handbags</h1>
            <p className="text-gray-600">Add, edit, and manage your handbag inventory</p>
          </div>
          <Link
            to="/admin/handbags/add"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <FaPlus />
            <span>Add New Handbag</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaShoppingBag className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Handbags</p>
                <p className="text-2xl font-bold text-gray-900">{handbags.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaBoxOpen className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {handbags.filter(h => h.stock > 0).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaChartLine className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {handbags.reduce((sum, h) => sum + (h.totalSales || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaDollarSign className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(handbags.reduce((sum, h) => sum + (h.price * h.stock), 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search handbags by name, description, or material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <div className="relative">
                <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Prices</option>
                  {priceRanges.map(range => (
                    <option key={range.label} value={range.label}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <div className="relative">
                <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price (Low to High)</option>
                  <option value="priceDesc">Sort by Price (High to Low)</option>
                  <option value="stock">Sort by Stock</option>
                  <option value="sales">Sort by Sales</option>
                  <option value="createdAt">Sort by Date Added</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredHandbags.length} of {handbags.length} handbags
          </p>
        </div>

        {/* Handbags Grid */}
        {filteredHandbags.length === 0 ? (
          <div className="text-center py-12">
            <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Handbags Found</h3>
            <p className="text-gray-500 mb-6">
              {handbags.length === 0 
                ? 'Start building your inventory by adding some handbags'
                : 'Try adjusting your search filters'
              }
            </p>
            {handbags.length === 0 && (
              <Link to="/admin/handbags/add" className="btn-primary">
                Add First Handbag
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHandbags.map((handbag) => (
              <div key={handbag.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="relative h-64 bg-gray-200 flex-shrink-0">
                    {handbag.imageData ? (
                      <img
                        src={handbag.imageData}
                        alt={handbag.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                        <FaShoppingBag className="text-4xl text-primary-600" />
                      </div>
                    )}
                    
                    {/* Stock Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(handbag.quantity)}`}>
                        {getStockStatusText(handbag.quantity)}
                      </span>
                    </div>
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      {handbag.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {formatPrice(handbag.price)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {handbag.quantity}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {handbag.category}
                      </span>
                      <span>Sales: {handbag.totalSales || 0}</span>
                    </div>
                    
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {handbag.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex space-x-2">
                      <Link
                        to={`/admin/handbags/${handbag.id}`}
                        className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                      </Link>
                      <Link
                        to={`/admin/handbags/${handbag.id}/edit`}
                        className="text-yellow-600 hover:text-yellow-700"
                        title="Edit Handbag"
                      >
                        <FaEdit />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(handbag)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete Handbag"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal />
      </div>
    </div>
  );
};

export default AdminHandbags;