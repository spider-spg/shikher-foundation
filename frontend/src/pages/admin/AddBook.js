import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaArrowLeft, FaUpload, FaImage } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';

const AddBook = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) { toast.error('Please log in to access this page.'); navigate('/login'); return; }
      if (!user || !isAdmin()) { toast.error('Access denied. Admin privileges required.'); navigate('/login'); return; }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
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
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'History',
    'Biography', 'Self-Help', 'Business', 'Health', 'Education',
    'Children', 'Romance', 'Mystery', 'Fantasy', 'Poetry', 'Religious', 'Other'
  ];

  const languages = [
    'English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil',
    'Telugu', 'Bengali', 'Malayalam', 'Kannada', 'Punjabi', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size must be less than 5MB'); return; }
    setFormData(prev => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim())         newErrors.title         = 'Title is required';
    if (!formData.author.trim())        newErrors.author        = 'Author is required';
    if (!formData.category)             newErrors.category      = 'Category is required';
    if (!formData.totalQuantity)        newErrors.totalQuantity = 'Total quantity is required';
    else if (parseInt(formData.totalQuantity) < 1) newErrors.totalQuantity = 'Quantity must be at least 1';
    if (formData.pages && parseInt(formData.pages) < 1) newErrors.pages = 'Pages must be at least 1';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      if (!formData.title.trim())              toast.error('Please enter the book title');
      else if (!formData.author.trim())        toast.error('Please enter the author name');
      else if (!formData.category)             toast.error('Please select a category');
      else if (!formData.totalQuantity)        toast.error('Please enter the total quantity');
      else                                     toast.error('Please fix the highlighted errors');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.addBook(formData);
      toast.success('Book added successfully!');
      navigate('/admin/books');
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error(error.response?.data?.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
      errors[field] ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center mb-8">
          <button onClick={() => navigate('/admin/books')} className="flex items-center text-gray-600 hover:text-gray-800 mr-4">
            <FaArrowLeft className="mr-2" /> Back to Books
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Add New Book</h1>
            <p className="text-gray-600">Add a new book to the library</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FaBook className="mr-2" /> Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange}
                    className={inputClass('title')} placeholder="Enter book title" />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author *</label>
                  <input type="text" name="author" value={formData.author} onChange={handleChange}
                    className={inputClass('author')} placeholder="Enter author name" />
                  {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select name="category" value={formData.category} onChange={handleChange} className={inputClass('category')}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select name="language" value={formData.language} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publisher <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="text" name="publisher" value={formData.publisher} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter publisher name" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Pages <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="number" name="pages" value={formData.pages} onChange={handleChange}
                    className={inputClass('pages')} placeholder="Enter number of pages" min="1" />
                  {errors.pages && <p className="mt-1 text-sm text-red-600">{errors.pages}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Quantity *</label>
                  <input type="number" name="totalQuantity" value={formData.totalQuantity} onChange={handleChange}
                    className={inputClass('totalQuantity')} placeholder="Enter total quantity" min="1" />
                  {errors.totalQuantity && <p className="mt-1 text-sm text-red-600">{errors.totalQuantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shelf Location </label>
                  <input type="text" name="shelfLocation" value={formData.shelfLocation} onChange={handleChange}
                    className={inputClass('shelfLocation')} placeholder="e.g., A1-B3, Fiction-201" />
                  {errors.shelfLocation && <p className="mt-1 text-sm text-red-600">{errors.shelfLocation}</p>}
                </div>

              </div>
            </div>

            {/* Description — optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter book description (optional)" />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Book Cover Image <span className="text-gray-400 font-normal">(Optional)</span></label>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <FaImage className="mx-auto text-3xl text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No image</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <input type="file" id="image" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <label htmlFor="image"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <FaUpload className="mr-2" /> Upload Image
                  </label>
                  <p className="mt-2 text-sm text-gray-500">Max 5MB · JPG, PNG, GIF</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button type="button" onClick={() => navigate('/admin/books')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Adding Book...' : 'Add Book'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBook;