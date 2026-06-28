import React, { useState } from 'react';
import { FaArrowLeft, FaUpload, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const AddHandbag = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    quantity: '',
    size: '',
    image: null
  });

  const sizeOptions = [
    { value: 'Small', price: 20 },
    { value: 'Medium', price: 30 },
    { value: 'Large', price: 100 },
    { value: 'Extra Large', price: 150 },
    { value: 'Custom', price: null }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSizeChange = (e) => {
    const selectedSize = e.target.value;
    const sizeOption = sizeOptions.find(option => option.value === selectedSize);

    setFormData(prev => ({
      ...prev,
      size: selectedSize,
      // For Custom, clear price so admin can type their own; otherwise auto-fill
      price: sizeOption && sizeOption.price !== null ? sizeOption.price.toString() : ''
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields on frontend
    if (!formData.title || !formData.size || !formData.quantity) {
      alert('Please fill in all required fields: Title, Size, and Quantity');
      setLoading(false);
      return;
    }

    if (formData.size === 'Custom' && (!formData.price || parseFloat(formData.price) <= 0)) {
      alert('Please enter a valid custom price');
      setLoading(false);
      return;
    }

    if (!formData.image) {
      alert('Please select an image for the handbag');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting form data:', formData);
      const response = await adminAPI.addHandbag(formData);
      
      if (response.data) {
        alert('Handbag added successfully!');
        navigate('/admin/handbags');
      }
    } catch (error) {
      console.error('Full error details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 'Failed to add handbag. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/handbags')}
                className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
              >
                <FaArrowLeft className="text-lg" />
                <span className="font-medium">Back to Handbag Management</span>
              </button>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-800">Add New Handbag</h1>
            <p className="text-gray-600 mt-2">Fill in the details below to add a new handbag to your collection</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <FaPlus className="mr-3 text-indigo-600" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Handbag Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter handbag title"
                  />
                </div>

                {/* Size */}
                <div>
                  <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                    Size *
                  </label>
                  <select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleSizeChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select size</option>
                    {sizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.price !== null ? `${option.value} - ₹${option.price}` : `${option.value} (set your own price)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price (Auto-filled based on size, editable for Custom) */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.size === 'Custom' ? 'Price *' : 'Price (Auto-set based on size)'}
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    readOnly={formData.size !== 'Custom'}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${
                      formData.size !== 'Custom' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder={formData.size === 'Custom' ? 'Enter custom price' : 'Price will be set based on size'}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <FaUpload className="mr-3 text-indigo-600" />
                Handbag Image
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors duration-200">
                <input
                  type="file"
                  id="image"
                  name="image"
                  onChange={handleImageChange}
                  accept="image/*"
                  required
                  className="hidden"
                />
                <label htmlFor="image" className="cursor-pointer">
                  <div className="space-y-4">
                    <FaUpload className="mx-auto text-4xl text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        {formData.image ? formData.image.name : 'Click to upload handbag image'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG up to 10MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/handbags')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allow transition-colors duration-200 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <FaPlus />
                    <span>Add Handbag</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddHandbag;