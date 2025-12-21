import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaEdit, 
  FaTrash, 
  FaShoppingBag, 
  FaTag,
  FaRuler,
  FaPalette,
  FaWeight,
  FaBuilding,
  FaChartLine,
  FaDollarSign,
  FaBoxOpen,
  FaEye,
  FaClock,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import ImageWithFallback from '../../components/ImageWithFallback';
import api from '../../utils/api';

const HandbagDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [handbag, setHandbag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchHandbag();
    fetchSalesData();
  }, [id]);

  const fetchHandbag = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/handbags/${id}`);
      setHandbag(response.data.handbag);
    } catch (error) {
      console.error('Error fetching handbag:', error);
      toast.error('Failed to load handbag details');
      navigate('/admin/handbags');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoadingSales(true);
      const response = await api.get(`/admin/handbags/${id}/sales-data`);
      setSalesData(response.data.sales || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await api.delete(`/admin/handbags/${id}`);
      toast.success('Handbag deleted successfully');
      navigate('/admin/handbags');
    } catch (error) {
      console.error('Error deleting handbag:', error);
      toast.error(error.response?.data?.message || 'Failed to delete handbag');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);

    try {
      await api.delete(`/admin/handbags/${id}`);
      toast.success('Handbag deleted successfully');
      navigate('/admin/handbags');
    } catch (error) {
      console.error('Error deleting handbag:', error);
      toast.error(error.response?.data?.message || 'Failed to delete handbag');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatPrice = (price) => {
    const numPrice = Number(price) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'undefined') return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) return 'Not available';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
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

  const nextImage = () => {
    if (handbag?.images && handbag.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === handbag.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (handbag?.images && handbag.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? handbag.images.length - 1 : prev - 1
      );
    }
  };



  if (loading) {
    return <LoadingSpinner />;
  }

  if (!handbag) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Handbag Not Found</h3>
          <p className="text-gray-500 mb-6">The handbag you're looking for doesn't exist.</p>
          <Link to="/admin/handbags" className="btn-primary">
            Back to Handbags
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/handbags')}
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <FaArrowLeft className="mr-2" />
              Back to Handbags
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Handbag Details</h1>
              <p className="text-gray-600">View and manage handbag information</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link
              to={`/admin/handbags/${id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <FaEdit className="mr-2" />
              Edit Handbag
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FaTrash className="mr-2" />
              Delete Handbag
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Handbag Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery & Basic Info */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Gallery */}
                <div>
                  <div className="relative">
                    <div className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden">
                      {handbag.imageData ? (
                        <ImageWithFallback
                          src={handbag.imageData}
                          alt={handbag.name || 'Handbag'}
                          className="w-full h-full object-cover"
                          fallbackSrc="/placeholder.jpg"
                        />
                      ) : handbag.images && handbag.images.length > 0 ? (
                        <>
                          <img
                            src={handbag.images[currentImageIndex]}
                            alt={handbag.name || 'Handbag'}
                            className="w-full h-full object-cover"
                          />
                          {handbag.images.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                              >
                                <FaChevronLeft />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                              >
                                <FaChevronRight />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                          <FaShoppingBag className="text-6xl text-primary-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Image Thumbnails */}
                    {handbag.images && handbag.images.length > 1 && (
                      <div className="flex space-x-2 mt-4 overflow-x-auto">
                        {handbag.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                              currentImageIndex === index ? 'border-primary-600' : 'border-gray-300'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${handbag.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Basic Information */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{handbag.name || 'Unnamed Handbag'}</h2>
                  <p className="text-3xl font-bold text-primary-600 mb-4">{formatPrice(handbag.price || 0)}</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <FaTag className="mr-3" />
                      <span className="text-sm font-medium">Category:</span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {handbag.category || 'Uncategorized'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FaRuler className="mr-3" />
                      <span className="text-sm font-medium">Size:</span>
                      <span className="ml-2">{handbag.size || 'Not specified'}</span>
                    </div>
                    
                    {handbag.weight && (
                      <div className="flex items-center text-gray-600">
                        <FaWeight className="mr-3" />
                        <span className="text-sm font-medium">Weight:</span>
                        <span className="ml-2">{handbag.weight}g</span>
                      </div>
                    )}
                    
                    {handbag.brand && (
                      <div className="flex items-center text-gray-600">
                        <FaBuilding className="mr-3" />
                        <span className="text-sm font-medium">Brand:</span>
                        <span className="ml-2">{handbag.brand}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Handbag"
          message={`Are you sure you want to delete "${handbag?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteModal(false)}
        />
      </div>
    </div>
  );
};

export default HandbagDetails;