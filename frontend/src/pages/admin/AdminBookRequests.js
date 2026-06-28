import React, { useState, useEffect } from 'react';
import PhoneLink from '../../components/PhoneLink';
import { 
  FaBook, 
  FaUser, 
  FaCalendarAlt, 
  FaCheck, 
  FaTimes, 
  FaClock,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaArrowUp,
  FaPhoneAlt,
  FaArrowDown,
  FaFilter,
  FaSort
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageWithFallback from '../../components/ImageWithFallback';
import api from '../../utils/api';

const AdminBookRequests = () => {
  const [bookRequests, setBookRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchBookRequests();
  }, []);

  const fetchBookRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/book-requests');
      setBookRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching book requests:', error);
      toast.error('Failed to load book requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId, status) => {
    if (processingIds.has(requestId)) return;

    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const response = await api.put(`/admin/book-requests/${requestId}/status`, { status });
      
      toast.success(response.data.message || 'Status updated successfully');
      
      // Update the local state
      setBookRequests(prev => 
        prev.map(request => 
          request.id === requestId 
            ? { 
                ...request, 
                status, 
                updatedAt: new Date().toISOString(),
                ...(response.data.request || {})
              }
            : request
        )
      );
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Calculate overdue days for picked up books
  const getOverdueDays = (dueDate) => {
    if (!dueDate) return 0;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = bookRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const getStatusBadge = (status, dueDate) => {
    const overdueDays = status === 'PICKED_UP' ? getOverdueDays(dueDate) : 0;
    
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      ACCEPTED: { color: 'bg-blue-100 text-blue-800', text: 'Accepted - Wait for call' },
      REJECTED: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      PICKED_UP: { 
        color: overdueDays > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800', 
        text: overdueDays > 0 ? `Overdue (${overdueDays} days)` : 'Picked Up' 
      },
      RETURNED: { color: 'bg-gray-100 text-gray-800', text: 'Returned' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {overdueDays > 0 && <FaExclamationTriangle className="mr-1" />}
        {config.text}
      </span>
    );
  };

  const getAvailableActions = (status) => {
    switch (status) {
      case 'PENDING':
        return ['ACCEPTED', 'REJECTED'];
      case 'ACCEPTED':
        return ['PICKED_UP', 'REJECTED'];
      case 'PICKED_UP':
        return ['RETURNED'];
      default:
        return [];
    }
  };

  const getActionButton = (action, requestId) => {
    const actionConfig = {
      ACCEPTED: { color: 'bg-blue-600 hover:bg-blue-700', text: 'Accept', icon: FaCheck },
      REJECTED: { color: 'bg-red-600 hover:bg-red-700', text: 'Reject', icon: FaTimes },
      PICKED_UP: { color: 'bg-green-600 hover:bg-green-700', text: 'Mark Picked Up', icon: FaArrowUp },
      RETURNED: { color: 'bg-gray-600 hover:bg-gray-700', text: 'Mark Returned', icon: FaArrowDown }
    };
    
    const config = actionConfig[action];
    const Icon = config.icon;
    
    return (
      <button
        key={action}
        onClick={() => handleUpdateRequestStatus(requestId, action)}
        disabled={processingIds.has(requestId)}
        className={`inline-flex items-center px-3 py-1 rounded-md text-white text-sm font-medium ${config.color} disabled:opacity-50 disabled:cursor-not-allowed transition-colors mr-2`}
      >
        <Icon className="mr-1" />
        {config.text}
      </button>
    );
  };

  // Get statistics
  const stats = {
    total: bookRequests.length,
    pending: bookRequests.filter(r => r.status === 'PENDING').length,
    accepted: bookRequests.filter(r => r.status === 'ACCEPTED').length,
    pickedUp: bookRequests.filter(r => r.status === 'PICKED_UP').length,
    overdue: bookRequests.filter(r => r.status === 'PICKED_UP' && getOverdueDays(r.dueDate) > 0).length,
    returned: bookRequests.filter(r => r.status === 'RETURNED').length
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Book Requests</h1>
          <p className="text-gray-600">Review and manage book borrowing requests from users</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaBook className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaClock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-xl font-semibold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCheck className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Accepted</p>
                <p className="text-xl font-semibold text-blue-600">{stats.accepted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaArrowUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Picked Up</p>
                <p className="text-xl font-semibold text-green-600">{stats.pickedUp}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-xl font-semibold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaArrowDown className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Returned</p>
                <p className="text-xl font-semibold text-gray-600">{stats.returned}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center space-x-4">
            <FaFilter className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="RETURNED">Returned</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Book & User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => {
                  const overdueDays = request.status === 'PICKED_UP' ? getOverdueDays(request.dueDate) : 0;
                  
                  return (
                    <tr key={request.id} className={overdueDays > 0 ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-10">
                            {request.bookData?.imageData ? (
                              <ImageWithFallback
                                src={request.bookData.imageData}
                                alt={request.bookData?.title || 'Book cover'}
                                className="h-12 w-10 rounded-lg object-cover"
                                fallbackSrc="/placeholder.jpg"
                              />
                            ) : (
                              <div className="h-12 w-10 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                                <FaBook className="h-5 w-5 text-primary-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.bookData?.title || request.bookTitle || 'Unknown Book'}
                            </div>
                            <div className="text-sm text-gray-500">
                              <FaUser className="inline mr-1" />
                              {request.userData?.name || request.userName || request.userEmail}
                            </div>
                            {(request.userPhone || request.userData?.phoneNumber) && (
                              <div className="mt-0.5">
                                <PhoneLink phone={request.userPhone || request.userData?.phoneNumber} className="text-sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {getStatusBadge(request.status, request.dueDate)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-1">
                          <div>
                            <span className="font-medium">Requested:</span> {formatDate(request.createdAt || request.requestDate)}
                          </div>
                          {request.dueDate && (
                            <div className={overdueDays > 0 ? 'text-red-600 font-medium' : ''}>
                              <span className="font-medium">Due:</span> {formatDate(request.dueDate)}
                            </div>
                          )}
                          {request.pickedUpAt && (
                            <div>
                              <span className="font-medium">Picked:</span> {formatDate(request.pickedUpAt)}
                            </div>
                          )}
                          {request.returnedAt && (
                            <div>
                              <span className="font-medium">Returned:</span> {formatDate(request.returnedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {getAvailableActions(request.status).map(action => 
                            getActionButton(action, request.id)
                          )}
                          {overdueDays > 0 && (
                            <span className="text-red-600 text-xs font-medium">
                              {overdueDays} days overdue
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="text-center py-8">
              <FaBook className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No book requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterStatus === 'all' 
                  ? 'No book requests have been made yet.' 
                  : `No book requests with status "${filterStatus}" found.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBookRequests;