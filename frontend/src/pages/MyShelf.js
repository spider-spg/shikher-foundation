import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { Link } from 'react-router-dom';
import {
  FaBook,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaFilter,
  FaUser,
  FaTag,
  FaPhoneAlt,
  FaTimesCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageWithFallback from '../components/ImageWithFallback';
import api from '../utils/api';

const NGO_PHONE = '+91-9324335478';

const MyShelf = () => {
  const [bookRequests, setBookRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('requestDate');

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) fetchMyBookRequests();
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

  const getOverdueDays = (dueDate) => {
    if (!dueDate) return 0;
    const diffTime = new Date() - new Date(dueDate);
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadge = (status, dueDate) => {
    const overdueDays = status === 'PICKED_UP' ? getOverdueDays(dueDate) : 0;
    const statusConfig = {
      PENDING:  { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review',      icon: FaClock },
      ACCEPTED: { color: 'bg-blue-100 text-blue-800',    text: 'Accepted – Call NGO',  icon: FaPhoneAlt },
      REJECTED: { color: 'bg-red-100 text-red-800',      text: 'Rejected',             icon: FaTimesCircle },
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
    .filter(r => {
      const matchesSearch =
        r.bookData?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.bookData?.author?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'requestDate') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'dueDate')     return new Date(a.dueDate || 0)  - new Date(b.dueDate || 0);
      if (sortBy === 'title')       return (a.bookData?.title || '').localeCompare(b.bookData?.title || '');
      if (sortBy === 'status')      return (a.status || '').localeCompare(b.status || '');
      return 0;
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Shelf</h1>
          <p className="text-gray-600">Track your book borrowing requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total',     value: bookRequests.length,                                                                  color: 'blue',  icon: FaBook },
            { label: 'Pending',   value: bookRequests.filter(r => r.status === 'PENDING').length,                              color: 'yellow', icon: FaClock },
            { label: 'Accepted',  value: bookRequests.filter(r => r.status === 'ACCEPTED').length,                             color: 'blue',  icon: FaPhoneAlt },
            { label: 'Picked Up', value: bookRequests.filter(r => r.status === 'PICKED_UP').length,                            color: 'green', icon: FaBook },
            { label: 'Overdue',   value: bookRequests.filter(r => r.status === 'PICKED_UP' && getOverdueDays(r.dueDate) > 0).length, color: 'red', icon: FaExclamationTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2 bg-${color}-100 rounded-full`}>
                <Icon className={`text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="RETURNED">Returned</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="requestDate">Sort by Request Date</option>
              <option value="dueDate">Sort by Due Date</option>
              <option value="title">Sort by Title</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {filteredAndSortedRequests.length === 0 ? (
          <div className="text-center py-16">
            <FaBook className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {bookRequests.length === 0 ? 'No Book Requests' : 'No Requests Found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {bookRequests.length === 0
                ? "You haven't requested any books yet."
                : 'Try adjusting your search filters'}
            </p>
            {bookRequests.length === 0 && (
              <Link to="/books" className="btn-primary">Browse Books</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200">
            {filteredAndSortedRequests.map(request => {
              const overdueDays = request.status === 'PICKED_UP' ? getOverdueDays(request.dueDate) : 0;
              return (
                <div
                  key={request.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${overdueDays > 0 ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Book Image */}
                    <div className="flex-shrink-0 w-14 h-20 bg-gray-200 rounded-lg overflow-hidden">
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

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {request.bookData?.title || 'Unknown Book'}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mb-2 gap-2">
                            <FaUser className="flex-shrink-0" />
                            <span>{request.bookData?.author || 'Unknown Author'}</span>
                            {request.bookData?.category && (
                              <>
                                <span>•</span>
                                <FaTag className="flex-shrink-0" />
                                <span>{request.bookData.category}</span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt />
                              Requested: {formatDate(request.createdAt)}
                            </span>
                            {request.dueDate && (
                              <span className={`flex items-center gap-1 ${overdueDays > 0 ? 'text-red-600 font-medium' : ''}`}>
                                <FaClock />
                                Due: {formatDate(request.dueDate)}
                              </span>
                            )}
                            {request.pickedUpAt && (
                              <span className="flex items-center gap-1">
                                <FaCheckCircle className="text-green-500" />
                                Picked up: {formatDate(request.pickedUpAt)}
                              </span>
                            )}
                            {request.returnedAt && (
                              <span className="flex items-center gap-1">
                                <FaCheckCircle className="text-gray-500" />
                                Returned: {formatDate(request.returnedAt)}
                              </span>
                            )}
                          </div>

                          {/* Status-specific messages */}
                          {request.status === 'ACCEPTED' && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800 flex items-center gap-2">
                                <FaPhoneAlt className="flex-shrink-0" />
                                <span>
                                  Your request has been approved! Please coordinate with the NGO at{' '}
                                  <PhoneLink phone={NGO_PHONE} showIcon={false} className="text-blue-700" /> to schedule your book pickup.
                                </span>
                              </p>
                            </div>
                          )}

                          {request.status === 'PICKED_UP' && overdueDays > 0 && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700 flex items-center gap-2">
                                <FaExclamationTriangle className="flex-shrink-0" />
                                <span>
                                  This book is <strong>{overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue</strong>.
                                  Please return it and contact the NGO at <PhoneLink phone={NGO_PHONE} showIcon={false} className="text-red-700" />.
                                </span>
                              </p>
                            </div>
                          )}

                          {request.status === 'PICKED_UP' && overdueDays === 0 && request.dueDate && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-800">
                                📚 Enjoying the book! Please return it by <strong>{formatDate(request.dueDate)}</strong>.
                              </p>
                            </div>
                          )}

                          {request.status === 'RETURNED' && (
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-600">
                                ✅ Thank you for returning this book on time!
                              </p>
                            </div>
                          )}

                          {request.status === 'REJECTED' && request.adminNote && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700">
                                <strong>Note:</strong> {request.adminNote}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {getStatusBadge(request.status, request.dueDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShelf;