import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaShoppingBag, FaArrowLeft, FaUpload, FaImage, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const EditHandbag = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    size: '',
    quantity: '',
    images: []
  });

  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});

  const sizeOptions = [
    { value: 'Small', price: 20 },
    { value: 'Medium', price: 30 },
    { value: 'Large', price: 100 },
    { value: 'Extra Large', price: 150 }
  ];

  useEffect(() => {
    fetchHandbag();
  }, [id]);

  const fetchHandbag = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/handbags/${id}`);
      const handbag = response.data.handbag;
      
      const handbagData = {
        name: handbag.title || handbag.name || '',
        price: handbag.price || '',
        size: handbag.size || '',
        quantity: handbag.quantity || '',
        images: []
      };
      
      setFormData(handbagData);
      setOriginalData(handbagData);
      
      if (handbag.images && handbag.images.length > 0) {
        setExistingImages(handbag.images);
        setImagePreviews(handbag.images);
      }
    } catch (error) {
      console.error('Error fetching handbag:', error);
      toast.error('Failed to load handbag details');
      navigate('/admin/handbags');
    } finally {
      setLoading(false);
    }
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
  const handleSizeChange = (e) => {
    const selectedSize = e.target.value;
    const sizeOption = sizeOptions.find(option => option.value === selectedSize);
    
    setFormData(prev => ({
      ...prev,
      size: selectedSize,
      price: sizeOption ? sizeOption.price.toString() : ''
    }));
    
    // Clear errors
    if (errors.size || errors.price) {
      setErrors(prev => ({
        ...prev,
        size: '',
        price: ''
      }));
    }
  };
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Validate number of images
    const totalImages = existingImages.length + formData.images.length + files.length;
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Validate each file
    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size: 5MB`);
        continue;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === validFiles.length) {
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (validFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles]
      }));
    }

    // Clear the input
    e.target.value = '';
  };

  const removeExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    
    // Update previews
    const newPreviews = imagePreviews.filter(preview => preview !== imageToRemove);
    setImagePreviews(newPreviews);
  };

  const removeNewImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    
    // Remove from previews (skip existing images)
    const newImageIndex = index + existingImages.length;
    setImagePreviews(prev => prev.filter((_, i) => i !== newImageIndex));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.size) {
      newErrors.size = 'Size is required';
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (parseInt(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    if (existingImages.length === 0 && formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show specific error message for the most critical missing field
      if (!formData.name.trim()) {
        toast.error('Please enter the handbag name');
      } else if (!formData.price) {
        toast.error('Please enter the price');
      } else if (!formData.size) {
        toast.error('Please select a size');
      } else if (!formData.quantity) {
        toast.error('Please enter the quantity');
      } else if (existingImages.length === 0 && formData.images.length === 0) {
        toast.error('Please add at least one image');
      } else {
        toast.error('Please check the highlighted fields and fix any errors');
      }
      return;
    }

    setSaving(true);

    try {
      const submitData = new FormData();
      
      // Always send all fields to ensure proper update
      submitData.append('title', formData.name);
      submitData.append('price', formData.price);
      submitData.append('size', formData.size);
      submitData.append('quantity', formData.quantity);

      // Handle images - if no new images but existing images, keep existing
      if (formData.images.length > 0) {
        formData.images.forEach((image) => {
          submitData.append('image', image);
        });
      } else if (existingImages.length > 0) {
        // If keeping existing images, send the imageData
        submitData.append('imageData', existingImages[0]);
      }

      const response = await api.put(`/admin/handbags/${id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Handbag updated successfully!');
      navigate('/admin/handbags');
    } catch (error) {
      console.error('Error updating handbag:', error);
      toast.error(error.response?.data?.message || 'Failed to update handbag');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/admin/handbags')}
            className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Handbags
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Handbag</h1>
            <p className="text-gray-600">Update handbag information</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FaShoppingBag className="mr-2" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter handbag name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Auto-set based on size)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="Price will be set based on size"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size *
                  </label>
                  <select
                    name="size"
                    value={formData.size}
                    onChange={handleSizeChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.size ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select size</option>
                    {sizeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.value} - ₹{option.price}
                      </option>
                    ))}
                  </select>
                  {errors.size && <p className="mt-1 text-sm text-red-600">{errors.size}</p>}
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
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.quantity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter stock quantity"
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images * (Maximum 5 images)
              </label>
              
              {/* Current Images */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (index < existingImages.length) {
                            removeExistingImage(index);
                          } else {
                            removeNewImage(index - existingImages.length);
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                      {index < existingImages.length && (
                        <div className="absolute bottom-1 left-1">
                          <span className="text-xs bg-blue-600 text-white px-1 rounded">Existing</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {imagePreviews.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FaUpload className="text-4xl text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {imagePreviews.length > 0 ? 'Add More Images' : 'Upload Product Images'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Drag and drop or click to select images
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Maximum 5 images, 5MB each. JPG, PNG, GIF supported.
                    </p>
                  </label>
                </div>
              )}
              
              {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/admin/handbags')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Handbag'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditHandbag;