import React, { useState, useEffect } from 'react';
import { 
  FaBook, 
  FaUser, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaEye,
  FaSearch,
  FaFilter,
  FaTrash
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import api from '../../utils/api';

const AdminBookDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    fetchBookDonations();
  }, []);

  const fetchBookDonations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/book-donations');
      setDonations(response.data.bookDonations || []);
    } catch (error) {
      console.error('Error fetching book donations:', error);
      toast.error('Failed to load book donations');
    } finally {
      setLoading(false);
    }
  };

  const updateDonationStatus = async (donationId, status) => {
    try {
      const response = await api.put(`/admin/book-donations/${donationId}/status`, {
        status
      });
      
      if (response.data.success) {
        toast.success(`Book donation ${status} successfully`);
        fetchBookDonations(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating donation status:', error);
      toast.error(error.response?.data?.message || 'Failed to update donation status');
    }
  };

  const handleRemoveFromLibrary = (donation) => {
    setSelectedDonation(donation);
    setShowRemoveModal(true);
  };

  const confirmRemoveFromLibrary = async () => {
    if (!selectedDonation) return;

    try {
      const response = await api.delete(`/admin/book-donations/${selectedDonation._id}/remove-from-library`);
      
      if (response.data.success) {
        toast.success('Book removed from library successfully');
        fetchBookDonations(); // Refresh list
      }
    } catch (error) {
      console.error('Error removing book from library:', error);
      toast.error(error.response?.data?.message || 'Failed to remove book from library');
    } finally {
      setShowRemoveModal(false);
      setSelectedDonation(null);
    }
  };

  const handleDeleteDonation = (donation) => {
    setSelectedDonation(donation);
    setShowDeleteModal(true);
  };

  const confirmDeleteDonation = async () => {
    if (!selectedDonation) return;

    try {
      const response = await api.delete(`/admin/book-donations/${selectedDonation._id}`);
      
      if (response.data.success) {
        toast.success('Book donation deleted successfully');
        fetchBookDonations(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting book donation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete book donation');
    } finally {
      setShowDeleteModal(false);
      setSelectedDonation(null);
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
      case 'added_to_library':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-600" />;
      case 'approved':
        return <FaCheck className="text-green-600" />;
      case 'rejected':
        return <FaTimes className="text-red-600" />;
      case 'added_to_library':
        return <FaBook className="text-blue-600" />;
      default:
        return <FaClock className="text-gray-600" />;
    }
  };

  const filteredDonations = donations.filter(donation => {
    const matchesFilter = filter === 'all' || donation.status === filter;
    const matchesSearch = 
      (donation.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (donation.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (donation.donor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaBook className="mr-3 text-indigo-600" />
            Book Donations Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and manage book donations from the community
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, author, or donor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Added to Library">Added to Library</option>
              </select>
            </div>
          </div>
        </div>

        {/* Donations List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredDonations.length === 0 ? (
            <div className="p-8 text-center">
              <FaBook className="mx-auto text-5xl text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No book donations found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "No book donations have been submitted yet."
                  : `No book donations with status "${filter}" found.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
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
                    <tr key={donation._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {donation.image ? (
                            <img
                              src={donation.image}
                              alt={donation.title}
                              className="h-12 w-12 rounded-lg object-cover mr-4"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                              <FaBook className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {donation.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              by {donation.author}
                            </div>
                            <div className="text-xs text-gray-400">
                              {donation.category} • Qty: {donation.quantity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUser className="text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {donation.donor?.name || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {donation.donor?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          donation.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                          donation.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                          donation.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {donation.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                          {getStatusIcon(donation.status)}
                          <span className="ml-1 capitalize">{(donation.status || '').replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(donation.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {donation.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => updateDonationStatus(donation._id, 'Approved')}
                                className="text-green-600 hover:text-green-900 flex items-center"
                                title="Approve"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => updateDonationStatus(donation._id, 'Rejected')}
                                className="text-red-600 hover:text-red-900 flex items-center"
                                title="Reject"
                              >
                                <FaTimes />
                              </button>
                              <button
                                onClick={() => handleDeleteDonation(donation)}
                                className="text-gray-600 hover:text-gray-900 flex items-center"
                                title="Delete Donation"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {donation.status === 'Approved' && (
                            <>
                              <button
                                onClick={() => updateDonationStatus(donation._id, 'Added to Library')}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                title="Add to Library"
                              >
                                <FaBook />
                              </button>
                              <button
                                onClick={() => updateDonationStatus(donation._id, 'Rejected')}
                                className="text-red-600 hover:text-red-900 flex items-center"
                                title="Reject (Undo Approval)"
                              >
                                <FaTimes />
                              </button>
                              <button
                                onClick={() => handleDeleteDonation(donation)}
                                className="text-gray-600 hover:text-gray-900 flex items-center"
                                title="Delete Donation"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {donation.status === 'Added to Library' && (
                            <>
                              <button
                                onClick={() => handleRemoveFromLibrary(donation)}
                                className="text-orange-600 hover:text-orange-900 flex items-center"
                                title="Remove from Library"
                              >
                                <FaTimes />
                              </button>
                              <button
                                onClick={() => handleDeleteDonation(donation)}
                                className="text-gray-600 hover:text-gray-900 flex items-center"
                                title="Delete Donation"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {donation.status === 'Rejected' && (
                            <button
                              onClick={() => handleDeleteDonation(donation)}
                              className="text-gray-600 hover:text-gray-900 flex items-center"
                              title="Delete Donation"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedDonation(null);
        }}
        onConfirm={confirmDeleteDonation}
        title="Delete Book Donation"
        message={selectedDonation ? `Are you sure you want to permanently delete the book donation "${selectedDonation.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Remove from Library Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setSelectedDonation(null);
        }}
        onConfirm={confirmRemoveFromLibrary}
        title="Remove from Library"
        message={selectedDonation ? `Are you sure you want to remove "${selectedDonation.title}" from the library? This will delete the book from the library catalog.` : ''}
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default AdminBookDonations;