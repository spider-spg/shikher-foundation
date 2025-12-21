import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaArrowLeft, FaUpload, FaImage, FaSearch, FaTimes, FaPlus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';

const AddBook = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Google Books API search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      const idToken = localStorage.getItem('idToken');
      
      if (!idToken) {
        toast.error('Please log in to access this page.');
        navigate('/login');
        return;
      }
      
      if (!user || !isAdmin()) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/login');
        return;
      }
    }
  }, [user, isAdmin, authLoading, navigate]);
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    description: '',
    publishedYear: '',
    language: 'English',
    totalQuantity: '',
    publisher: '',
    pages: '',
    shelfLocation: '',
    image: null
  });

  const [errors, setErrors] = useState({});

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
    'Poetry',
    'Religious',
    'Other'
  ];

  const languages = [
    'English',
    'Hindi',
    'Marathi',
    'Gujarati',
    'Tamil',
    'Telugu',
    'Bengali',
    'Malayalam',
    'Kannada',
    'Punjabi',
    'Other'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1800 + 1 }, (_, i) => currentYear - i);

  // Google Books API search function
  const searchGoogleBooks = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=10`
      );
      const data = await response.json();
      
      if (data.items) {
        setSearchResults(data.items);
      } else {
        setSearchResults([]);
        toast.info('No books found for your search');
      }
    } catch (error) {
      console.error('Google Books search error:', error);
      toast.error('Failed to search books');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Function to select a book from search results
  const selectBookFromSearch = (book) => {
    const volumeInfo = book?.volumeInfo || {};
    setSelectedBook(book);
    
    // Safely extract ISBN with fallback
    const getISBN = (identifiers) => {
      if (!identifiers || !Array.isArray(identifiers)) return '';
      const isbn13 = identifiers.find(id => id?.type === 'ISBN_13')?.identifier;
      const isbn10 = identifiers.find(id => id?.type === 'ISBN_10')?.identifier;
      return isbn13 || isbn10 || '';
    };

    // Safely extract authors
    const getAuthors = (authors) => {
      if (!authors || !Array.isArray(authors)) return '';
      return authors.join(', ');
    };

    // Safely extract categories and map to system categories
    const getCategory = (categories) => {
      if (!categories || !Array.isArray(categories)) return '';
      
      const googleCategory = categories[0] || '';
      
      // Map Google Books categories to system categories
      const categoryMap = {
        'Fiction': 'Fiction',
        'Literary Fiction': 'Fiction',
        'Science Fiction': 'Fiction',
        'Historical Fiction': 'Fiction',
        'Contemporary Fiction': 'Fiction',
        'General Fiction': 'Fiction',
        'Non-fiction': 'Non-Fiction',
        'Biography & Autobiography': 'Biography',
        'Biography': 'Biography',
        'Autobiography': 'Biography',
        'History': 'History',
        'Science': 'Science',
        'Technology': 'Technology',
        'Computers': 'Technology',
        'Technology & Engineering': 'Technology',
        'Self-Help': 'Self-Help',
        'Business & Economics': 'Business',
        'Business': 'Business',
        'Health & Fitness': 'Health',
        'Medical': 'Health',
        'Education': 'Education',
        'Juvenile Fiction': 'Children',
        'Juvenile Nonfiction': 'Children',
        'Children': 'Children',
        'Young Adult Fiction': 'Children',
        'Romance': 'Romance',
        'Mystery': 'Mystery',
        'Fantasy': 'Fantasy',
        'Poetry': 'Poetry',
        'Religion': 'Religious',
        'Religious': 'Religious'
      };
      
      // Try exact match first
      if (categoryMap[googleCategory]) {
        return categoryMap[googleCategory];
      }
      
      // Try partial matches
      const lowerCategory = googleCategory.toLowerCase();
      for (const [key, value] of Object.entries(categoryMap)) {
        if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
          return value;
        }
      }
      
      // Default fallback
      return 'Other';
    };

    // Safely extract publication year
    const getPublicationYear = (publishedDate) => {
      if (!publishedDate) return '';
      try {
        const year = new Date(publishedDate).getFullYear();
        return isNaN(year) ? '' : year.toString();
      } catch {
        return '';
      }
    };

    // Pre-fill form with book data (safely)
    setFormData(prev => ({
      ...prev,
      title: volumeInfo.title?.trim() || '',
      author: getAuthors(volumeInfo.authors),
      isbn: getISBN(volumeInfo.industryIdentifiers),
      category: getCategory(volumeInfo.categories),
      description: volumeInfo.description?.trim() || '',
      publisher: volumeInfo.publisher?.trim() || '',
      pages: volumeInfo.pageCount ? volumeInfo.pageCount.toString() : '',
      language: volumeInfo.language === 'en' ? 'English' : (volumeInfo.language || 'English')
    }));

    // Set image preview if available
    const imageUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
    if (imageUrl) {
      setImagePreview(imageUrl);
    }

    setShowModal(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAddFromGoogleBooks = async () => {
    if (!selectedBook) return;

    // Validate required fields
    if (!formData.totalQuantity || !formData.shelfLocation) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Check if book with this ISBN already exists
      const volumeInfo = selectedBook.volumeInfo;
      const isbn = volumeInfo.industryIdentifiers ? 
        (volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier || 
         volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier || '') : '';

      if (isbn) {
        try {
          const existingBookResponse = await adminAPI.getBookByISBN(isbn);
          if (existingBookResponse.data.book) {
            // Book exists, ask user if they want to update quantity
            const confirmUpdate = window.confirm(
              `A book with ISBN ${isbn} already exists in the library. Do you want to add ${formData.totalQuantity} more copies to the existing stock?`
            );
            
            if (confirmUpdate) {
              const updateResponse = await adminAPI.addBookStock(existingBookResponse.data.book._id, {
                quantity: parseInt(formData.totalQuantity)
              });
              
              toast.success(`Added ${formData.totalQuantity} copies to existing book!`);
              setShowModal(false);
              setSelectedBook(null);
              resetForm();
              setLoading(false);
              return;
            } else {
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          // Book doesn't exist, continue with creation
        }
      }

      // Create new book entry
      const bookDataForAPI = { ...formData };
      
      // Add the Google Books image URL directly instead of downloading
      if (volumeInfo.imageLinks?.thumbnail) {
        bookDataForAPI.googleBooksImageUrl = volumeInfo.imageLinks.thumbnail;
      }

      const response = await adminAPI.addBook(bookDataForAPI);

      toast.success('Book added successfully from Google Books!');
      
      // Reset form and close modal
      setShowModal(false);
      setSelectedBook(null);
      resetForm();

    } catch (error) {
      console.error('Error adding book from Google Books:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        toast.error(error.response?.data?.message || 'Failed to add book from Google Books');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      description: '',
      publisher: '',
      pages: '',
      language: 'English',
      totalQuantity: '',
      shelfLocation: '',
      condition: 'New',
      availability: 'Available',
      image: null
    });
    setImagePreview(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    // ISBN is optional but validate format if provided
    if (formData.isbn.trim() && !/^[\d-]+$/.test(formData.isbn.replace(/-/g, ''))) {
      newErrors.isbn = 'Please enter a valid ISBN';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }



    if (!formData.totalQuantity) {
      newErrors.totalQuantity = 'Total quantity is required';
    } else if (parseInt(formData.totalQuantity) < 1) {
      newErrors.totalQuantity = 'Quantity must be at least 1';
    }

    if (!formData.shelfLocation.trim()) {
      newErrors.shelfLocation = 'Shelf location is required';
    }

    if (formData.pages && parseInt(formData.pages) < 1) {
      newErrors.pages = 'Pages must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show specific error message for the most critical missing field
      if (!formData.title.trim()) {
        toast.error('Please enter the book title');
      } else if (!formData.author.trim()) {
        toast.error('Please enter the author name');
      } else if (!formData.category) {
        toast.error('Please select a category for the book');
      } else if (!formData.description.trim()) {
        toast.error('Please enter a description for the book');
      } else if (!formData.totalQuantity) {
        toast.error('Please enter the total quantity');
      } else if (!formData.shelfLocation.trim()) {
        toast.error('Please enter the shelf location');
      } else {
        toast.error('Please check the highlighted fields and fix any errors');
      }
      return;
    }

    setLoading(true);

    try {
      // Use the adminAPI.addBook function which properly handles field mapping
      const response = await adminAPI.addBook(formData);

      toast.success('Book added successfully!');
      navigate('/admin/books');
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error(error.response?.data?.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/admin/books')}
            className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Books
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Book</h1>
            <p className="text-gray-600">Add a new book to your library</p>
          </div>
        </div>

        {/* Google Books Search */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FaSearch className="mr-2" />
              Search Google Books
            </h2>
            <p className="text-gray-600 mb-4">Search for books using Google Books API to auto-fill details</p>
            
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by title, author, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchGoogleBooks())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button
                type="button"
                onClick={searchGoogleBooks}
                disabled={searching}
                className="btn-primary flex items-center space-x-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FaSearch />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Search Results</h3>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((book, index) => {
                    const volumeInfo = book.volumeInfo;
                    return (
                      <div key={book.id || index} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                        <div className="flex space-x-4">
                          {volumeInfo.imageLinks?.thumbnail && (
                            <img
                              src={volumeInfo.imageLinks.thumbnail}
                              alt={volumeInfo.title}
                              className="w-16 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{volumeInfo.title}</h4>
                            <p className="text-sm text-gray-600 mb-1">
                              by {volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author'}
                            </p>
                            <p className="text-xs text-gray-500 mb-2">
                              {volumeInfo.publishedDate && `Published: ${volumeInfo.publishedDate}`}
                              {volumeInfo.publisher && ` • ${volumeInfo.publisher}`}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {volumeInfo.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectBookFromSearch(book)}
                            className="btn-outline flex items-center space-x-1 px-4 py-2"
                          >
                            <FaPlus />
                            <span>Add to Library</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FaBook className="mr-2" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter book title"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.author ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter author name"
                  />
                  {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ISBN (Optional)
                  </label>
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.isbn ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter ISBN (optional)"
                  />
                  {errors.isbn && <p className="mt-1 text-sm text-red-600">{errors.isbn}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {languages.map(language => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Additional Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher
                  </label>
                  <input
                    type="text"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter publisher name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Pages
                  </label>
                  <input
                    type="number"
                    name="pages"
                    value={formData.pages}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.pages ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter number of pages"
                    min="1"
                  />
                  {errors.pages && <p className="mt-1 text-sm text-red-600">{errors.pages}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Quantity *
                  </label>
                  <input
                    type="number"
                    name="totalQuantity"
                    value={formData.totalQuantity}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.totalQuantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter total quantity"
                    min="1"
                  />
                  {errors.totalQuantity && <p className="mt-1 text-sm text-red-600">{errors.totalQuantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shelf Location *
                  </label>
                  <input
                    type="text"
                    name="shelfLocation"
                    value={formData.shelfLocation}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.shelfLocation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., A1-B3, Fiction-201"
                  />
                  {errors.shelfLocation && <p className="mt-1 text-sm text-red-600">{errors.shelfLocation}</p>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter book description"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Cover Image
              </label>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <FaImage className="mx-auto text-3xl text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No image</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="image"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <FaUpload className="mr-2" />
                    Upload Image
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload a book cover image. Maximum file size: 5MB. Supported formats: JPG, PNG, GIF.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/books')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding Book...' : 'Add Book'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Google Books Search Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Add Book from Google Books</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedBook(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              {selectedBook && (
                <div className="space-y-6">
                  {/* Selected Book Preview */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Selected Book</h3>
                    <div className="flex space-x-4">
                      {selectedBook.imageLinks?.thumbnail && (
                        <img
                          src={selectedBook.imageLinks.thumbnail}
                          alt={selectedBook.title}
                          className="w-20 h-28 object-cover rounded"
                        />
                      )}
                      <div>
                        <h4 className="font-medium">{selectedBook.title}</h4>
                        <p className="text-gray-600">{selectedBook.authors?.join(', ')}</p>
                        <p className="text-sm text-gray-500">ISBN: {selectedBook.industryIdentifiers?.[0]?.identifier}</p>
                        <p className="text-sm text-gray-500">Published: {selectedBook.publishedDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Fields for Library */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Quantity *
                      </label>
                      <input
                        type="number"
                        value={formData.totalQuantity}
                        onChange={(e) => setFormData(prev => ({...prev, totalQuantity: e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter quantity"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shelf Location *
                      </label>
                      <input
                        type="text"
                        value={formData.shelfLocation}
                        onChange={(e) => setFormData(prev => ({...prev, shelfLocation: e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., A1-B3, Fiction-201"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Condition
                      </label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData(prev => ({...prev, condition: e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="New">New</option>
                        <option value="Like New">Like New</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Availability
                      </label>
                      <select
                        value={formData.availability}
                        onChange={(e) => setFormData(prev => ({...prev, availability: e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="Available">Available</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedBook(null);
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFromGoogleBooks}
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading ? 'Adding Book...' : 'Add to Library'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBook;