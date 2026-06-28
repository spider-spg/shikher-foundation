import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaBook, 
  FaPlus,
  FaClipboardList, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter,
  FaEye,
  FaUser,
  FaCalendarAlt,
  FaTag,
  FaSort
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmationModal from '../../components/ConfirmationModal';
import api from '../../utils/api';

const AdminBooks = () => {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  
  const { isAdmin, user } = useAuth();

  const categories = [
    'Fiction',
    'Non-Fiction',
    'Science',
    'Technology',
    'History',
    'Biography',
    'Self-Help',
    'Business',
    'Health',
    'Education',
    'Children',
    'Romance',
    'Mystery',
    'Fantasy',
    'Other'
  ];

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBooks();
    }
  }, [user?.role]); // Use user.role instead of isAdmin() function

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, selectedCategory, sortBy]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/books?limit=1000'); // Get up to 1000 books
      setBooks(response.data.books || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load books');
      setBooks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(book => (book.genre || book.category) === selectedCategory);
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
        case 'totalQuantity':
          return (b.totalQuantity || 0) - (a.totalQuantity || 0);
        case 'availableQuantity':
          return (b.quantity || 0) - (a.quantity || 0);
        case 'createdAt':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    setFilteredBooks(filtered);
  };

  const handleDeleteClick = (book) => {
    setBookToDelete(book);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;

    try {
      await api.delete(`/admin/books/${bookToDelete.id}`);
      toast.success('Book deleted successfully');
      
      // Remove book from state
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookToDelete.id));
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error(error.response?.data?.message || 'Failed to delete book');
    } finally {
      setShowDeleteModal(false);
      setBookToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Books</h1>
            <p className="text-gray-600">Add, edit, and manage your book library</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/admin/book-requests"
              className="btn-outline inline-flex items-center space-x-2"
            >
              <FaClipboardList />
              <span>Manage Requests</span>
            </Link>
            <Link
              to="/admin/books/add"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <FaPlus />
              <span>Add New Book</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaBook className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Books</p>
                <p className="text-2xl font-bold text-gray-900">{books.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaTag className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available</p>
                <p className="text-2xl font-bold text-gray-900">
                  {books.reduce((sum, book) => sum + (parseInt(book.quantity, 10) || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaUser className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Borrowed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {books.reduce((sum, book) => sum + Math.max(0, (parseInt(book.totalQuantity, 10) || 0) - (parseInt(book.quantity, 10) || 0)), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaFilter className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(books.map(book => book.genre || book.category || 'Uncategorized')).size}
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

            {/* Category Filter */}
            <div>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <div className="relative">
                <FaSort className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="title">Sort by Title</option>
                  <option value="author">Sort by Author</option>
                  <option value="publishedYear">Sort by Year</option>
                  <option value="totalQuantity">Sort by Total Quantity</option>
                  <option value="availableQuantity">Sort by Available</option>
                  <option value="createdAt">Sort by Date Added</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredBooks.length} of {books.length} books
          </p>
        </div>

        {/* Books Table */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <FaBook className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Books Found</h3>
            <p className="text-gray-500 mb-6">
              {books.length === 0 
                ? 'Start building your library by adding some books'
                : 'Try adjusting your search filters'
              }
            </p>
            {books.length === 0 && (
              <Link to="/admin/books/add" className="btn-primary">
                Add First Book
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden mr-4">
                            {book.imageData ? (
                              <img
                                src={book.imageData}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                                <FaBook className="text-primary-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{book.title || 'N/A'}</div>
                            <div className="text-sm text-gray-500">by {book.author || 'Unknown Author'}</div>
                            <div className="text-xs text-gray-400">{book.genre || book.category || 'Uncategorized'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {book.genre || book.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>Total: {Number(book.totalQuantity) || 0}</div>
                          <div className="text-green-600">Available: {Number(book.quantity) || 0}</div>
                          {book.pendingApproval > 0 && (
                            <div className="text-orange-600">Pending Review: {book.pendingApproval}</div>
                          )}
                          {book.awaitingPickup > 0 && (
                            <div className="text-blue-600">Awaiting Pickup: {book.awaitingPickup}</div>
                          )}
                          <div className="text-yellow-600">Currently Borrowed: {book.currentlyBorrowed || 0}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/admin/books/${book.id}`}
                            className="text-blue-600 hover:text-blue-700"
                            title="View Details"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/admin/books/${book.id}/edit`}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="Edit Book"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(book)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Book"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setBookToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Book"
          message={bookToDelete ? `Are you sure you want to delete "${bookToDelete.title}"? This action cannot be undone and will permanently remove the book from your library.` : ''}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default AdminBooks;