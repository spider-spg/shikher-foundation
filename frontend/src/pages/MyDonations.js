import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaHeart, 
  FaEye, 
  FaArrowLeft,
  FaGift,
  FaSpinner,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHandshake
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDonations();
  }, [isAuthenticated, navigate]);

  const fetchDonations = async () => {
    try {
      const response = await api.get('/donations/my-donations');
      if (response.data.success) {
        setDonations(response.data.donations || []);
      } else {
        setDonations([]);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('Failed to load donations');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'approved':
        return <FaCheckCircle className="text-green-500" />;
      case 'rejected':
        return <FaTimesCircle className="text-red-500" />;
      case 'received':
        return <FaHandshake className="text-blue-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'received':
        return 'Received';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openModal = (donation) => {
    setSelectedDonation(donation);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDonation(null);
  };

  const getApprovalMessage = (donation) => {
    if (donation.status === 'approved') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center mb-2">
            <FaCheckCircle className="text-green-500 mr-2" />
            <span className="font-semibold text-green-800">Donation Approved!</span>
          </div>
          <p className="text-green-700">
            Your donation has been approved. Please <strong>CALL the NGO</strong> to coordinate drop-off or pickup.
          </p>
          <div className="mt-2 text-sm text-green-600">
            <p><strong>Shikher Foundation Pickup Point*</strong></p>
            <p>📞 Phone: +91-9324335478</p>
            <p>📍 Jhulelal Society, House no 15, Sector 2B</p>
            <p>Airoli, Navi Mumbai, Maharashtra 400708</p>
            <p className="text-red-600 font-semibold mt-1">*Call us before you send or come to drop!</p>
            <a 
              href="https://maps.app.goo.gl/qkcwEVqw5bcsnN3s7" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-500 text-sm underline block mt-1"
            >
              📍 View on Google Maps
            </a>
          </div>
        </div>
      );
    }
    
    if (donation.status === 'received') {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center mb-2">
            <FaHandshake className="text-blue-500 mr-2" />
            <span className="font-semibold text-blue-800">Donation Received!</span>
          </div>
          <p className="text-blue-700">
            <strong>Thank you!</strong> Your donation has been successfully received at the NGO and will help those in need.
          </p>
          <div className="mt-2 text-sm text-blue-600">
            <p>Your kindness makes a difference in our community! 💝</p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors duration-200"
            >
              <FaArrowLeft className="text-lg" />
              <span className="font-medium">Back to Home</span>
            </button>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FaHeart className="mr-3 text-primary-600" />
              My Donations
            </h1>
            <p className="text-gray-600 mt-2">
              Track your donations to Shikher Foundation
            </p>
          </div>
        </div>

        {/* Donations List */}
        {!donations || donations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FaGift className="mx-auto text-6xl text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">No Donations Yet</h2>
            <p className="text-gray-500 mb-6">You haven't made any donations yet. Start making a difference today!</p>
            <button
              onClick={() => navigate('/donate')}
              className="btn-primary"
            >
              Make a Donation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {donations.map((donation) => (
              <div key={donation.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(donation.status)}`}>
                        {getStatusIcon(donation.status)}
                        <span>{getStatusText(donation.status)}</span>
                      </span>
                      <span className="text-gray-500 text-sm">
                        {new Date(donation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 capitalize">
                      {donation.itemType} Donation
                    </h3>
                    <p className="text-gray-600">
                      {donation.items?.length || 0} item{(donation.items?.length || 0) > 1 ? 's' : ''} donated
                    </p>
                  </div>
                  <button
                    onClick={() => openModal(donation)}
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    <FaEye />
                    <span>View Details</span>
                  </button>
                </div>

                {/* Items Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {donation.items && donation.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        {(item.imageData || item.image) && (
                          <img
                            src={item.imageData || item.image}
                            alt={item.title || item.name || `${donation.itemType} item`}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{item.title || item.name || `${donation.itemType} item`}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} | {item.condition}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(donation.items?.length || 0) > 3 && (
                    <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-center text-gray-500">
                      +{(donation.items?.length || 0) - 3} more items
                    </div>
                  )}
                </div>

                {getApprovalMessage(donation)}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && selectedDonation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 capitalize">
                    {selectedDonation.itemType} Donation Details
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Donation Info */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDonation.status)}`}>
                        {getStatusIcon(selectedDonation.status)}
                        <span>{getStatusText(selectedDonation.status)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Submitted</p>
                      <p className="font-medium">{new Date(selectedDonation.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {selectedDonation.donorMessage && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Your Message</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedDonation.donorMessage}</p>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Items Donated ({selectedDonation.items?.length || 0})</h3>
                  <div className="space-y-4">
                    {selectedDonation.items && selectedDonation.items.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          {(item.imageData || item.image) && (
                            <img
                              src={item.imageData || item.image}
                              alt={item.title || item.name || `${selectedDonation.itemType} item`}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                              {item.title || item.name || `${selectedDonation.itemType} Item ${index + 1}`}
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Quantity:</span> {item.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Condition:</span> {item.condition}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {getApprovalMessage(selectedDonation)}

                {selectedDonation.adminMessage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-800 mb-2">Admin Message</h4>
                    <p className="text-blue-700">{selectedDonation.adminMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonations;