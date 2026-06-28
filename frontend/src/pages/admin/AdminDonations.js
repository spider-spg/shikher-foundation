import React, { useState, useEffect } from 'react';
import PhoneLink from '../../components/PhoneLink';
import { useNavigate } from 'react-router-dom';
import { 
  FaGift, 
  FaEye, 
  FaArrowLeft,
  FaSpinner,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaImage,
  FaHandshake,
  FaSearch,
  FaFilter,
  FaCheck,
  FaTimes,
  FaHeart,
  FaBook,
  FaTshirt,
  FaGamepad,
  FaPen,
  FaUser,
  FaPhoneAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    received: 0,
    byCategory: {}
  });
  
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchDonations();
  }, [isAdmin, navigate]);

  const fetchDonations = async () => {
    try {
      const response = await api.get('/donations');
      if (response.data.success) {
        const allDonations = response.data.donations || [];
        setDonations(allDonations);
        
        // Calculate stats
        const total = allDonations.length;
        const pending = allDonations.filter(d => d?.status === 'pending').length;
        const approved = allDonations.filter(d => d?.status === 'approved').length;
        const rejected = allDonations.filter(d => d?.status === 'rejected').length;
        const received = allDonations.filter(d => d?.status === 'received').length;

        // Per-category counts (books, clothes, toys, blankets, stationary, other)
        const byCategory = {};
        for (const d of allDonations) {
          const type = (d?.itemType || 'other').toLowerCase();
          byCategory[type] = (byCategory[type] || 0) + 1;
        }

        setStats({ total, pending, approved, rejected, received, byCategory });
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

  const updateDonationStatus = async (donationId, status) => {
    try {
      const response = await api.put(`/donations/${donationId}/status`, { status });
      
      if (response.data.success) {
        toast.success(`Donation ${status} successfully`);
        fetchDonations(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating donation status:', error);
      toast.error('Failed to update donation status');
    }
  };

  const getStatusBadge = (status) => {
    // Handle undefined status
    const safeStatus = status || 'pending';
    
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: FaClock },
      'approved': { color: 'bg-green-100 text-green-800', icon: FaCheck },
      'rejected': { color: 'bg-red-100 text-red-800', icon: FaTimes },
      'received': { color: 'bg-blue-100 text-blue-800', icon: FaCheckCircle }
    };

    const config = statusConfig[safeStatus] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="mr-1" />
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const openModal = (donation) => {
    setSelectedDonation(donation);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedDonation(null);
    setModalOpen(false);
    setAdminMessage('');
  };

  // Filter donations based on status and search
  const filteredDonations = donations.filter(donation => {
    const matchesFilter = filter === 'all' || donation.status === filter;
    const matchesSearch = !searchTerm || 
      donation.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Donations Management
          </h1>
          <p className="text-gray-600">
            Manage and track all item donations received (books, clothes, toys, etc.)
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaHeart className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaCheck className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaCheckCircle className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <FaTimes className="text-red-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>

          {[
            { key: 'books',     label: 'Books',     icon: FaBook,        color: 'blue' },
            { key: 'clothes',   label: 'Clothes',    icon: FaTshirt,      color: 'pink' },
            { key: 'toys',      label: 'Toys',       icon: FaGamepad,     color: 'purple' },
            { key: 'blankets',  label: 'Blankets',   icon: FaGift,        color: 'orange' },
            { key: 'stationary', label: 'Stationery', icon: FaPen,        color: 'teal' },
          ].map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`p-3 bg-${color}-100 rounded-lg`}>
                  <Icon className={`text-${color}-600 text-xl`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.byCategory[key] || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="received">Received</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                placeholder="Search donations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Donations List */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredDonations.length === 0 ? (
            <div className="text-center py-16">
              <FaHeart className="mx-auto text-5xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No donations found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "No donations have been received yet."
                  : `No donations with status "${filter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donor Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDonations.map((donation) => (
                    <tr key={donation.id || donation._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <FaUser className="text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {donation.donorName || 'Anonymous'}
                            </div>
                            {donation.donorPhone && (
                              <div className="mt-0.5">
                                <PhoneLink phone={donation.donorPhone} className="text-sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {donation.itemType?.charAt(0).toUpperCase() + donation.itemType?.slice(1)} ({donation.items?.length || 0} items)
                        </div>
                        {/* Show first few item details */}
                        <div className="text-xs text-gray-500 mt-1">
                          {donation.items && donation.items.length > 0 ? (
                            <div className="space-y-1">
                              {donation.items.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  {(item.imageData || item.image) ? (
                                    <img 
                                      src={item.imageData || item.image} 
                                      alt={item.title || item.name || 'Item'}
                                      className="w-6 h-6 object-cover rounded border"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-gray-200 rounded border flex items-center justify-center">
                                      <span className="text-xs text-gray-400">📷</span>
                                    </div>
                                  )}
                                  <span className="truncate">
                                    {item.title || item.name || 'Untitled'}
                                    {item.author && ` by ${item.author}`}
                                  </span>
                                </div>
                              ))}
                              {donation.items.length > 2 && (
                                <div className="text-gray-400">+ {donation.items.length - 2} more items</div>
                              )}
                            </div>
                          ) : (
                            donation.donorMessage && donation.donorMessage.substring(0, 50) + '...'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(donation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(donation.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {donation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateDonationStatus(donation.id, 'approved')}
                                className="text-green-600 hover:text-green-900 flex items-center px-2 py-1 border border-green-300 rounded"
                                title="Approve Donation"
                              >
                                <FaCheck className="mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => updateDonationStatus(donation.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 flex items-center px-2 py-1 border border-red-300 rounded"
                                title="Reject Donation"
                              >
                                <FaTimes className="mr-1" />
                                Reject
                              </button>
                            </>
                          )}
                          {donation.status === 'approved' && (
                            <button
                              onClick={() => updateDonationStatus(donation.id, 'received')}
                              className="text-blue-600 hover:text-blue-900 flex items-center px-2 py-1 border border-blue-300 rounded bg-blue-50"
                              title="Mark as Received at NGO"
                            >
                              <FaCheck className="mr-1" />
                              Received
                            </button>
                          )}
                          <button
                            onClick={() => openModal(donation)}
                            className="text-blue-600 hover:text-blue-900 flex items-center px-2 py-1 border border-blue-300 rounded"
                            title="View Details"
                          >
                            <FaEye className="mr-1" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for viewing donation details */}
        {modalOpen && selectedDonation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Donation Details
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Donor Information</h4>
                    <p className="text-sm text-gray-600">Name: {selectedDonation.donorName || 'Anonymous'}</p>
                    {selectedDonation.donorPhone && (
                      <div className="mt-0.5">
                        <PhoneLink phone={selectedDonation.donorPhone} className="text-sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Donation Details</h4>
                    <p className="text-sm text-gray-600">Type: {selectedDonation.itemType}</p>
                    <p className="text-sm text-gray-600">Items: {selectedDonation.items?.length || 0}</p>
                    <p className="text-sm text-gray-600">Status: {selectedDonation.status}</p>
                  </div>

                  {selectedDonation.donorMessage && (
                    <div>
                      <h4 className="font-medium text-gray-900">Message</h4>
                      <p className="text-sm text-gray-600">{selectedDonation.donorMessage}</p>
                    </div>
                  )}

                  {selectedDonation.items && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Items Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedDonation.items.map((item, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start space-x-4">
                              {/* Item Image */}
                              {(item.imageData || item.image) ? (
                                <div className="flex-shrink-0">
                                  <img 
                                    src={item.imageData || item.image} 
                                    alt={item.title || item.name || 'Item'}
                                    className="w-24 h-32 object-cover rounded-lg border shadow-sm"
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <FaImage className="text-gray-400 text-xl" />
                                </div>
                              )}
                              
                              {/* Item Details */}
                              <div className="flex-1 space-y-2">
                                <div>
                                  <h5 className="font-semibold text-gray-800 text-lg">
                                    {item.title || item.name || 'Untitled Item'}
                                  </h5>
                                  {item.author && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Author:</span> {item.author}
                                    </p>
                                  )}
                                </div>
                                
                                {item.condition && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-500">Condition:</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      item.condition === 'New' ? 'bg-green-100 text-green-800' :
                                      item.condition === 'Like New' ? 'bg-blue-100 text-blue-800' :
                                      item.condition === 'Good' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-orange-100 text-orange-800'
                                    }`}>
                                      {item.condition}
                                    </span>
                                  </div>
                                )}
                                
                                {item.description && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">Description:</p>
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                  </div>
                                )}
                                
                                {item.category && (
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Category:</span>
                                    <span className="text-sm text-gray-600 ml-2">{item.category}</span>
                                  </div>
                                )}
                                
                                {item.quantity && item.quantity > 1 && (
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Quantity:</span>
                                    <span className="text-sm text-gray-600 ml-2">{item.quantity}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {updating && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <FaSpinner className="animate-spin text-2xl text-primary-600 mx-auto mb-2" />
                      <p>Updating...</p>
                    </div>
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

export default AdminDonations;