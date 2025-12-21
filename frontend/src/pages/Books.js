import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaFilter, 
  FaBook, 
  FaUser, 
  FaCalendarAlt,
  FaTag,
  FaPlus,
  FaMinus,
  FaHeart
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api, { getImageUrl } from '../utils/api';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [requestingStates, setRequestingStates] = useState({});
  const [userBookRequests, setUserBookRequests] = useState([]);
  
  const { isAuthenticated, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
    if (isAuthenticated) {
      fetchUserBookRequests();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, sortBy]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/books');
      const booksData = response.data.books || [];
      setBooks(booksData);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookRequests = async () => {
    try {
      const response = await api.get('/book-requests/my-requests');
      setUserBookRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching user book requests:', error);
    }
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'publishedYear':
          return (b.publishedYear || 0) - (a.publishedYear || 0);
        case 'available':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    setFilteredBooks(filtered);
  };

  // BUSINESS RULE: Books are request-based, not direct borrowing
  const handleRequestBook = async (bookId) => {
    if (!isAuthenticated) {
      toast.error('Please login to request books');
      navigate('/login');
      return;
    }

    if (isAdmin()) {
      toast.error('Admins cannot request books');
      return;
    }

    // Find the book to request
    const book = books.find(b => b.id === bookId);
    if (!book || !isBookRequestable(book)) {
      toast.error('This book is not available for request');
      return;
    }

    setRequestingStates(prev => ({ ...prev, [bookId]: true }));

    try {
      await api.post('/book-requests', {
        bookId: bookId
      });
      
      toast.success('Book request submitted successfully! It will appear in your MyShelf once processed.');
      fetchUserBookRequests(); // Refresh user requests
    } catch (error) {
      console.error('Error requesting book:', error);
      toast.error(error.response?.data?.message || 'Failed to submit book request');
    } finally {
      setRequestingStates(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const isBookRequestable = (book) => {
    return (book.quantity || 0) > 0;
  };

  const isBookAlreadyRequested = (book) => {
    if (!isAuthenticated || !userBookRequests.length) return false;
    return userBookRequests.some(request => 
      request.bookId === book.id && 
      ['pending', 'approved'].includes(request.status)
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Book Library
              </h1>
              <p className="text-lg text-gray-600">
                Discover and borrow from our collection of books
              </p>
            </div>
            {isAuthenticated && !isAdmin() && (
              <div className="mt-4 sm:mt-0">
                <Link
                  to="/donate"
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <FaHeart className="mr-2" />
                  Donate Books
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="title">Sort by Title</option>
                <option value="author">Sort by Author</option>
                <option value="available">Sort by Availability</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredBooks.length} of {books.length} books
          </p>
          
          {isAdmin() && (
            <Link
              to="/admin/books/add"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add Book</span>
            </Link>
          )}
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <FaBook className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Books Found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'Try adjusting your search filters'
                : 'No books available at the moment'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book, index) => (
              <div key={book.id || `book-${index}`} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
                {/* Book Image */}
                <div className="relative h-64 bg-gray-200 flex-shrink-0">
                  {book.imageData ? (
                    <img
                      src={book.imageData}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center" style={{ display: book.imageData ? 'none' : 'flex' }}>
                    <FaBook className="text-4xl text-primary-600" />
                  </div>
                </div>

                {/* Book Details */}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <div className="mb-2">
                      <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                        {book.genre}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {book.title}
                    </h3>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <FaUser className="mr-1" />
                      <span className="line-clamp-1">{book.author}</span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {book.description}
                    </p>

                    {/* Availability */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-600">Available:</span>
                      <span className={`font-semibold ${
                        (book.quantity || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {book.quantity || 0} 
                      </span>
                    </div>
                  </div>

                  {/* Action Button - Always at bottom */}
                  <div className="mt-auto">
                    {!isAuthenticated ? (
                      <Link
                        to="/login"
                        className="w-full btn-outline text-center"
                      >
                        Login to Request
                      </Link>
                    ) : isAdmin() ? (
                      <Link
                        to={`/admin/books/${book.id}/edit`}
                        className="w-full btn-outline text-center"
                      >
                        Edit Book
                      </Link>
                    ) : isBookAlreadyRequested(book) ? (
                      <button
                        disabled
                        className="w-full bg-yellow-100 text-yellow-800 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Request Pending
                      </button>
                    ) : !isBookRequestable(book) ? (
                      <button
                        disabled
                        className="w-full bg-red-100 text-red-800 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Not Available
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestBook(book.id)}
                        disabled={requestingStates[book.id]}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingStates[book.id] ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Requesting...</span>
                          </div>
                        ) : (
                          'Request Book'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Books;