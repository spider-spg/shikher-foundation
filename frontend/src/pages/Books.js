import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaBook, 
  FaUser, 
  FaTag,
  FaPlus,
  FaHeart,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUndo
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api, { getImageUrl } from '../utils/api';

const Books = () => {
  const [books, setBooks]                     = useState([]);
  const [filteredBooks, setFilteredBooks]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchTerm, setSearchTerm]           = useState('');
  const [sortBy, setSortBy]                   = useState('title');
  const [requestingStates, setRequestingStates] = useState({});
  const [userBookRequests, setUserBookRequests] = useState([]);
  const [confirmBook, setConfirmBook]         = useState(null); // book to confirm
  
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

  // ── Step 1: show modal ────────────────────────────────────────────────────
  const handleRequestBook = (bookId) => {
    if (!isAuthenticated) {
      toast.error('Please login to request books');
      navigate('/login');
      return;
    }
    if (isAdmin()) {
      toast.error('Admins cannot request books');
      return;
    }
    const book = books.find(b => b.id === bookId);
    if (!book || !isBookRequestable(book)) {
      toast.error('This book is not available for request');
      return;
    }
    setConfirmBook(book); // open modal
  };

  // ── Step 2: user confirmed in modal ──────────────────────────────────────
  const confirmRequest = async () => {
    if (!confirmBook) return;
    const bookId = confirmBook.id;
    setConfirmBook(null);
    setRequestingStates(prev => ({ ...prev, [bookId]: true }));

    try {
      await api.post('/book-requests', { bookId });

      // Optimistically reduce quantity shown
      setBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, quantity: Math.max(0, (b.quantity || 1) - 1) } : b
      ));

      toast.success('Book requested! Check My Shelf for updates.');
      fetchUserBookRequests();
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
                  to="/shelf"
                  className="btn-outline inline-flex items-center gap-2"
                >
                  <FaBook /> My Shelf
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

      {/* ── Book Request Confirm Modal ─────────────────────────────────────── */}
      {confirmBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">

            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                  <FaBook className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">Confirm Book Request</h3>
                  <p className="text-primary-100 text-sm">Please read before confirming</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmBook(null)}
                className="text-white text-opacity-70 hover:text-opacity-100 hover:bg-white hover:bg-opacity-20 p-1.5 rounded-full transition-all"
              >
                <FaTimes />
              </button>
            </div>

            {/* Book info */}
            <div className="px-6 py-4 flex gap-4 border-b border-gray-100">
              <div className="w-16 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                {confirmBook.imageData
                  ? <img src={confirmBook.imageData} alt={confirmBook.title} className="w-full h-full object-cover" />
                  : <FaBook className="text-primary-400 text-2xl" />
                }
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 leading-tight line-clamp-2">{confirmBook.title}</h4>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <FaUser className="flex-shrink-0" /> {confirmBook.author}
                </p>
                {confirmBook.genre && (
                  <span className="inline-block mt-1 bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                    {confirmBook.genre}
                  </span>
                )}
              </div>
            </div>

            {/* Rules */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">By confirming, you agree that:</p>
              {[
                { icon: FaClock,             color: 'text-blue-500',   text: 'Admin will review and approve your request' },
                { icon: FaExclamationTriangle, color: 'text-amber-500', text: 'You must pick up the book within the agreed window' },
                { icon: FaUndo,              color: 'text-purple-500', text: 'Book must be returned within 30 days of pickup' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-start gap-3 text-sm text-gray-600">
                  <Icon className={`${color} flex-shrink-0 mt-0.5`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmBook(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRequest}
                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FaBook /> Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;