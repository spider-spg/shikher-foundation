import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaEdit, 
  FaTrash, 
  FaBook, 
  FaUser, 
  FaCalendarAlt,
  FaTag,
  FaGlobe,
  FaBuilding,
  FaFileAlt,
  FaHashtag,
  FaEye,
  FaClock
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import ImageWithFallback from '../../components/ImageWithFallback';
import api from '../../utils/api';

const BookDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchBook();
    fetchBorrowHistory();
  }, [id]);

  const fetchBook = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/books/${id}`);
      setBook(response.data.book);
    } catch (error) {
      console.error('Error fetching book:', error);
      toast.error('Failed to load book details');
      navigate('/admin/books');
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/admin/books/${id}/borrow-history`);
      setBorrowHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching borrow history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/books/${id}`);
      toast.success('Book deleted successfully');
      navigate('/admin/books');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error(error.response?.data?.message || 'Failed to delete book');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBorrowStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return <LoadingSpinner />;
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaBook className="mx-auto text-6xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Book Not Found</h3>
          <p className="text-gray-500 mb-6">The book you're looking for doesn't exist.</p>
          <Link to="/admin/books" className="btn-primary">
            Back to Books
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
              onClick={() => navigate('/admin/books')}
              className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
            >
              <FaArrowLeft className="mr-2" />
              Back to Books
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Details</h1>
              <p className="text-gray-600">View and manage book information</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link
              to={`/admin/books/${id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <FaEdit className="mr-2" />
              Edit Book
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FaTrash className="mr-2" />
              Delete Book
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 bg-gray-200 rounded-lg overflow-hidden">
                    {book.imageData ? (
                      <ImageWithFallback
                        src={book.imageData}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        fallbackSrc="/placeholder.jpg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                        <FaBook className="text-4xl text-primary-600" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h2>
                  <p className="text-lg text-gray-600 mb-4">by {book.author}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center text-gray-600">
                      <FaHashtag className="mr-2" />
                      <span className="text-sm font-medium">ISBN:</span>
                      <span className="ml-2">{book.isbn}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FaTag className="mr-2" />
                      <span className="text-sm font-medium">Category:</span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {book.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FaCalendarAlt className="mr-2" />
                      <span className="text-sm font-medium">Published:</span>
                      <span className="ml-2">{book.publishedYear}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FaGlobe className="mr-2" />
                      <span className="text-sm font-medium">Language:</span>
                      <span className="ml-2">{book.language}</span>
                    </div>
                    
                    {book.publisher && (
                      <div className="flex items-center text-gray-600">
                        <FaBuilding className="mr-2" />
                        <span className="text-sm font-medium">Publisher:</span>
                        <span className="ml-2">{book.publisher}</span>
                      </div>
                    )}
                    
                    {book.pages && (
                      <div className="flex items-center text-gray-600">
                        <FaFileAlt className="mr-2" />
                        <span className="text-sm font-medium">Pages:</span>
                        <span className="ml-2">{book.pages}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-gray-600">
                    <span className="text-sm font-medium">Added on:</span>
                    <span className="ml-2">{formatDate(book.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-gray-600 leading-relaxed">{book.description}</p>
            </div>

            {/* Borrow History */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Borrow History</h3>
              
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading history...</p>
                </div>
              ) : borrowHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FaClock className="mx-auto text-4xl text-gray-300 mb-4" />
                  <p className="text-gray-500">No borrow history yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {borrowHistory.map((record, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <FaUser className="text-gray-400" />
                            <span className="font-medium text-gray-900">{record.userName}</span>
                            <span className="text-gray-500">({record.userEmail})</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Borrowed: {formatDate(record.borrowDate)}</p>
                            {record.returnDate && (
                              <p>Returned: {formatDate(record.returnDate)}</p>
                            )}
                            {record.dueDate && (
                              <p>Due: {formatDate(record.dueDate)}</p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBorrowStatusColor(record.status)}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Stats */}
          <div className="space-y-6">
            {/* Quantity Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Information</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Quantity</span>
                  <span className="text-xl font-bold text-gray-900">{book.totalQuantity}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available</span>
                  <span className="text-xl font-bold text-green-600">{book.availableQuantity}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Borrowed</span>
                  <span className="text-xl font-bold text-yellow-600">
                    {book.totalQuantity - book.availableQuantity}
                  </span>
                </div>
              </div>
              
              {/* Availability Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Availability</span>
                  <span>{Math.round((book.availableQuantity / book.totalQuantity) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(book.availableQuantity / book.totalQuantity) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Link
                  to={`/admin/books/${id}/edit`}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                >
                  <FaEdit className="mr-2" />
                  Edit Book
                </Link>
                
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                >
                  <FaTrash className="mr-2" />
                  Delete Book
                </button>
              </div>
            </div>

            {/* Book Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    book.availableQuantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {book.availableQuantity > 0 ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Popularity</span>
                  <span className="text-sm text-gray-900">
                    {borrowHistory.length} {borrowHistory.length === 1 ? 'borrow' : 'borrows'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {formatDate(book.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Book"
          message={book ? `Are you sure you want to delete "${book.title}"? This action cannot be undone and will affect all borrow records.` : ''}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default BookDetails;