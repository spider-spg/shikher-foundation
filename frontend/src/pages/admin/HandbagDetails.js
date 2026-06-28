import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaShoppingBag,
  FaRuler,
  FaWeight,
  FaBuilding,
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchHandbag();
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

  const nextImage = () => {
    if (handbag?.images && handbag.images.length > 1) {
      setCurrentImageIndex((prev) => prev === handbag.images.length - 1 ? 0 : prev + 1);
    }
  };

  const prevImage = () => {
    if (handbag?.images && handbag.images.length > 1) {
      setCurrentImageIndex((prev) => prev === 0 ? handbag.images.length - 1 : prev - 1);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!handbag) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaShoppingBag className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Handbag Not Found</h3>
          <p className="text-gray-500 mb-6">The handbag you're looking for doesn't exist.</p>
          <Link to="/admin/handbags" className="btn-primary">Back to Handbags</Link>
        </div>
      </div>
    );
  }

  const title       = handbag.title || handbag.name || 'Unnamed Handbag';
  const total       = handbag.totalQuantity ?? handbag.quantity ?? 0;
  const available   = handbag.quantity ?? 0;
  const sold        = Math.max(0, total - available);
  const availPct    = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Handbag Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Image Gallery */}
                <div>
                  <div className="relative">
                    <div className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden">
                      {handbag.imageData ? (
                        <ImageWithFallback
                          src={handbag.imageData}
                          alt={title}
                          className="w-full h-full object-cover"
                          fallbackSrc="/placeholder.jpg"
                        />
                      ) : handbag.images && handbag.images.length > 0 ? (
                        <>
                          <img src={handbag.images[currentImageIndex]} alt={title} className="w-full h-full object-cover" />
                          {handbag.images.length > 1 && (
                            <>
                              <button onClick={prevImage} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">
                                <FaChevronLeft />
                              </button>
                              <button onClick={nextImage} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75">
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

                    {handbag.images && handbag.images.length > 1 && (
                      <div className="flex space-x-2 mt-4 overflow-x-auto">
                        {handbag.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${currentImageIndex === index ? 'border-primary-600' : 'border-gray-300'}`}
                          >
                            <img src={image} alt={`${title} ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                  <p className="text-3xl font-bold text-primary-600 mb-4">{formatPrice(handbag.price || 0)}</p>

                  <div className="space-y-3 mb-6">
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

                  {handbag.description && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Description</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{handbag.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Quantity Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Information</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Quantity</span>
                  <span className="text-xl font-bold text-gray-900">{total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">In Stock</span>
                  <span className="text-xl font-bold text-green-600">{available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sold</span>
                  <span className="text-xl font-bold text-yellow-600">{sold}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Availability</span>
                  <span>{availPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${availPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

              <div className="space-y-3">
                <Link
                  to={`/admin/handbags/${id}/edit`}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                >
                  <FaEdit className="mr-2" />
                  Edit Handbag
                </Link>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                >
                  <FaTrash className="mr-2" />
                  Delete Handbag
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Handbag"
          message={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
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