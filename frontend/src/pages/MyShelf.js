import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, 
  FaCalendarAlt, 
  FaUndo, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaFilter,
  FaUser,
  FaTag,
  FaPhoneAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageWithFallback from '../components/ImageWithFallback';
import api from '../utils/api';

const MyShelf = () => {
  const [bookRequests, setBookRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('requestDate');
  
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyBookRequests();
    }
  }, [isAuthenticated]);

  const fetchMyBookRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/book-requests/my-requests');
      setBookRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching book requests:', error);
      toast.error('Failed to load book requests');
    } finally {
      setLoading(false);
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
      day: 'numeric'
    });
  };

  const getStatusBadge = (status, dueDate) => {
    const overdueDays = status === 'PICKED_UP' ? getOverdueDays(dueDate) : 0;
    
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review', icon: FaClock },
      ACCEPTED: { color: 'bg-blue-100 text-blue-800', text: 'Accepted - Call NGO', icon: FaPhoneAlt },
      REJECTED: { color: 'bg-red-100 text-red-800', text: 'Rejected', icon: FaExclamationTriangle },
      PICKED_UP: { 
        color: overdueDays > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800', 
        text: overdueDays > 0 ? `Overdue (${overdueDays} days)` : 'Picked Up',
        icon: overdueDays > 0 ? FaExclamationTriangle : FaBook
      },
      RETURNED: { color: 'bg-gray-100 text-gray-800', text: 'Returned', icon: FaCheckCircle }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: FaClock };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="mr-1" />
        {config.text}
      </span>
    );
  };

  const filteredAndSortedRequests = bookRequests
    .filter(request => {
      const matchesSearch = request.bookData?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.bookData?.author?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === '' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'requestDate':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'dueDate':
          return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
        case 'title':
          return (a.bookData?.title || '').localeCompare(b.bookData?.title || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Shelf</h1>
          <p className="text-lg text-gray-600">
            Track your book requests and manage your borrowed books
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaBook className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{bookRequests.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookRequests.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaPhoneAlt className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookRequests.filter(r => r.status === 'ACCEPTED').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaBook className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Picked Up</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookRequests.filter(r => r.status === 'PICKED_UP').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-full">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookRequests.filter(r => r.status === 'PICKED_UP' && getOverdueDays(r.dueDate) > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search books by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="RETURNED">Returned</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="requestDate">Sort by Request Date</option>
                <option value="dueDate">Sort by Due Date</option>
                <option value="title">Sort by Title</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-12">
            <FaBook className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {bookRequests.length === 0 ? 'No Book Requests' : 'No Requests Found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {bookRequests.length === 0 
                ? "You haven't requested any books yet. Start exploring our library!"
                : 'Try adjusting your search filters'
              }
            </p>
            {bookRequests.length === 0 && (
              <Link to="/books" className="btn-primary">
                Browse Books
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 gap-1">
              {filteredAndSortedRequests.map((request) => {
                const overdueDays = request.status === 'PICKED_UP' ? getOverdueDays(request.dueDate) : 0;
                
                return (
                  <div key={request.id} className={`p-6 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${overdueDays > 0 ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start space-x-4">
                      {/* Book Image */}
                      <div className="flex-shrink-0 w-16 h-20 bg-gray-200 rounded-lg overflow-hidden">
                        {request.bookData?.imageData ? (
                          <ImageWithFallback
                            src={request.bookData.imageData}
                            alt={request.bookData?.title || 'Book cover'}
                            className="w-full h-full object-cover"
                            fallbackSrc="/placeholder.jpg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                            <FaBook className="text-primary-600" />
                          </div>
                        )}
                      </div>

                      {/* Request Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {request.bookData?.title || 'Unknown Book'}
                            </h3>
                            
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <FaUser className="mr-1" />
                              <span>{request.bookData?.author || 'Unknown Author'}</span>
                              {request.bookData?.category && (
                                <>
                                  <span className="mx-2">•</span>
                                  <FaTag className="mr-1" />
                                  <span>{request.bookData.category}</span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <FaCalendarAlt className="mr-1" />
                                <span>Requested: {formatDate(request.createdAt)}</span>
                              </div>
                              {request.dueDate && (
                                <div className={`flex items-center ${overdueDays > 0 ? 'text-red-600 font-medium' : ''}`}>
                                  <FaClock className="mr-1" />
                                  <span>Due: {formatDate(request.dueDate)}</span>
                                </div>
                              )}
                              {request.pickedUpAt && (
                                <div className="flex items-center">
                                  <FaCheckCircle className="mr-1" />
                                  <span>Picked: {formatDate(request.pickedUpAt)}</span>
                                </div>
                              )}
                              {request.returnedAt && (
                                <div className="flex items-center">
                                  <FaCheckCircle className="mr-1" />
                                  <span>Returned: {formatDate(request.returnedAt)}</span>
                                </div>
                              )}
                            </div>
                            
                            {overdueDays > 0 && (
                              <div className="mt-2 text-sm text-red-600 font-semibold">
                                {overdueDays} days overdue - please contact NGO
                              </div>
                            )}

                            {request.status === 'ACCEPTED' && (
                              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <FaPhoneAlt className="inline mr-2" />
                                  Your request has been accepted! Please call the NGO at +91-9324335478 to arrange pickup.
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(request.status, request.dueDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShelf;