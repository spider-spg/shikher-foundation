import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FaBook, 
  FaUpload, 
  FaPlus, 
  FaArrowLeft,
  FaHeart,
  FaGift,
  FaHandsHelping,
  FaTshirt,
  FaTimes,
  FaGamepad,
  FaPen
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const Donate = () => {
  const [selectedItemType, setSelectedItemType] = useState('books');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [donorMessage, setDonorMessage] = useState('');
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const itemTypes = [
    { value: 'books', label: 'Books', icon: FaBook },
    { value: 'clothes', label: 'Clothes', icon: FaTshirt },
    { value: 'toys', label: 'Toys', icon: FaGamepad },
    { value: 'blankets', label: 'Blankets', icon: FaGift },
    { value: 'stationary', label: 'Stationary', icon: FaPen }
  ];

  const conditions = [
    { value: 'Excellent', description: 'Like new, no visible wear' },
    { value: 'Good', description: 'Minor wear, good condition' },
    { value: 'Fair', description: 'Noticeable wear but usable' },
    { value: 'Poor', description: 'Significant wear, some damage' }
  ];

  const createEmptyItem = (type) => {
    switch (type) {
      case 'books':
        return {
          name: '',
          quantity: 1,
          condition: 'Good',
          image: null,
          imagePreview: null
        };
      case 'clothes':
        return {
          name: '',
          quantity: 1,
          condition: 'Good',
          image: null,
          imagePreview: null
        };
      case 'toys':
        return {
          name: '',
          quantity: 1,
          condition: 'Good',
          image: null,
          imagePreview: null
        };
      case 'blankets':
        return {
          quantity: 1,
          condition: 'Good',
          image: null,
          imagePreview: null
        };
      case 'stationary':
        return {
          name: '',
          quantity: 1,
          condition: 'Good'
        };
      default:
        return {};
    }
  };

  const addNewItem = () => {
    const newItem = createEmptyItem(selectedItemType);
    setItems([...items, newItem]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    console.log(`Updating item ${index}, field: ${field}, value type: ${typeof value}, value:`, value);
    setItems(prevItems => {
      const newItems = prevItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      );
      console.log(`Updated items state for ${field}:`, newItems);
      return newItems;
    });
  };

  const handleImageChange = (index, file) => {
    console.log(`Image change for item ${index}:`, file ? file.name : 'No file selected');
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateItem(index, 'image', file);
        updateItem(index, 'imagePreview', e.target.result);
        console.log(`Image ${index} processed:`, { name: file.name, size: file.size, type: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to donate');
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      toast.error(`Please add at least one ${selectedItemType.slice(0, -1)} to donate`);
      return;
    }

    setLoading(true);

    // Add a small delay to ensure state updates are complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get the current items state using a promise-based approach
    const getCurrentItems = () => {
      return new Promise((resolve) => {
        setItems(currentItems => {
          resolve(currentItems);
          return currentItems; // Don't modify state, just return current
        });
      });
    };
    
    const currentItems = await getCurrentItems();
    
    console.log('Current items after state sync:', currentItems);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('itemType', selectedItemType);
      formDataToSend.append('donorMessage', donorMessage);
      formDataToSend.append('items', JSON.stringify(currentItems.map(item => {
        const { imagePreview, image, ...itemData } = item;
        return itemData;
      })));

      // Add images
      currentItems.forEach((item, index) => {
        console.log(`Checking item ${index} for image:`, {
          hasImage: !!item.image,
          imageType: typeof item.image,
          imageName: item.image ? item.image.name : 'no name',
          imageSize: item.image ? item.image.size : 'no size'
        });
        
        if (item.image) {
          console.log(`Adding image ${index}:`, item.image.name, item.image.size);
          formDataToSend.append(`image_${index}`, item.image);
        } else {
          console.log(`No image for item ${index}`);
        }
      });

      console.log('Items to submit:', currentItems);
      
      // Check each item for image data
      currentItems.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          name: item.name,
          hasImage: !!item.image,
          hasImagePreview: !!item.imagePreview,
          imageFile: item.image
        });
      });
      
      console.log('FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }
      
      // Check each item for image data
      items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          name: item.name,
          hasImage: !!item.image,
          hasImagePreview: !!item.imagePreview,
          imageFile: item.image
        });
      });
      
      console.log('FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }

      const response = await api.post('/donations/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Thank you for your donation! It will be reviewed by our admin.');
        navigate('/');
      }
    } catch (error) {
      console.error('Donation error:', error);
      const message = error.response?.data?.message || 'Failed to submit donation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <FaHeart className="mx-auto text-6xl text-primary-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">Please login to make a donation to Shikher Foundations</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full"
          >
            Login to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-800 transition-colors duration-200"
            >
              <FaArrowLeft className="text-lg" />
              <span className="font-medium">Back to Home</span>
            </button>
            <Link to="/my-donations" className="btn-outline inline-flex items-center gap-2">
              <FaHeart /> My Donations
            </Link>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FaGift className="mr-3 text-primary-600" />
              Make a Donation
            </h1>
            <p className="text-gray-600 mt-2">
              Share your items to help those in need through Shikher Foundations
            </p>
          </div>
        </div>

        {/* Impact Section */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <FaHeart className="mx-auto text-4xl mb-3" />
              <h3 className="text-xl font-semibold mb-2">Help Families</h3>
              <p className="text-primary-100">Your donations directly support families in need</p>
            </div>
            <div className="text-center">
              <FaHandsHelping className="mx-auto text-4xl mb-3" />
              <h3 className="text-xl font-semibold mb-2">Build Community</h3>
              <p className="text-primary-100">Strengthen our community through shared resources</p>
            </div>
            <div className="text-center">
              <FaGift className="mx-auto text-4xl mb-3" />
              <h3 className="text-xl font-semibold mb-2">Make Impact</h3>
              <p className="text-primary-100">Every item donated creates lasting positive change</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Item Type Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              What would you like to donate?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {itemTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedItemType(value);
                    setItems([]);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                    selectedItemType === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 text-gray-700'
                  }`}
                >
                  <Icon className="mx-auto text-2xl mb-2" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedItemType.charAt(0).toUpperCase() + selectedItemType.slice(1)} to Donate
              </h2>
              <button
                type="button"
                onClick={addNewItem}
                className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FaPlus />
                <span>Add {selectedItemType.slice(0, -1)}</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No {selectedItemType} added yet</p>
                <p className="text-sm mt-1">Click "Add {selectedItemType.slice(0, -1)}" to start</p>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                    >
                      <FaTimes />
                    </button>

                    {/* Dynamic Form Fields Based on Item Type */}
                    {selectedItemType === 'books' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Book Name *
                          </label>
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter book name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condition *
                          </label>
                          <select
                            value={item.condition || 'Good'}
                            onChange={(e) => updateItem(index, 'condition', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {conditions.map(condition => (
                              <option key={condition.value} value={condition.value}>
                                {condition.value} - {condition.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image (Optional)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e.target.files[0])}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {item.imagePreview && (
                              <img
                                src={item.imagePreview}
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload a photo of the book (JPG, PNG, max 5MB)</p>
                        </div>
                      </div>
                    )}

                    {selectedItemType === 'clothes' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Clothes Name *
                          </label>
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="e.g., Men's T-shirt, Women's Jeans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image (Optional)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e.target.files[0])}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {item.imagePreview && (
                              <img
                                src={item.imagePreview}
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload a photo of the clothing item (JPG, PNG, max 5MB)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condition *
                          </label>
                          <select
                            value={item.condition || 'Good'}
                            onChange={(e) => updateItem(index, 'condition', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {conditions.map(condition => (
                              <option key={condition.value} value={condition.value}>
                                {condition.value} - {condition.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedItemType === 'blankets' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image (Optional)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e.target.files[0])}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {item.imagePreview && (
                              <img
                                src={item.imagePreview}
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload a photo of the blanket (JPG, PNG, max 5MB)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condition *
                          </label>
                          <select
                            value={item.condition || 'Good'}
                            onChange={(e) => updateItem(index, 'condition', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {conditions.map(condition => (
                              <option key={condition.value} value={condition.value}>
                                {condition.value} - {condition.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedItemType === 'toys' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Toy Name *
                          </label>
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="e.g., Teddy Bear, Building Blocks"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image (Optional)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e.target.files[0])}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {item.imagePreview && (
                              <img
                                src={item.imagePreview}
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload a photo of the toy (JPG, PNG, max 5MB)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condition *
                          </label>
                          <select
                            value={item.condition || 'Good'}
                            onChange={(e) => updateItem(index, 'condition', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {conditions.map(condition => (
                              <option key={condition.value} value={condition.value}>
                                {condition.value} - {condition.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {selectedItemType === 'stationary' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stationary Name *
                          </label>
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="e.g., Notebooks, Pens, Pencils"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image (Optional)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(index, e.target.files[0])}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {item.imagePreview && (
                              <img
                                src={item.imagePreview}
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Upload a photo of the stationary items (JPG, PNG, max 5MB)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Condition *
                          </label>
                          <select
                            value={item.condition || 'Good'}
                            onChange={(e) => updateItem(index, 'condition', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {conditions.map(condition => (
                              <option key={condition.value} value={condition.value}>
                                {condition.value} - {condition.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Donor Message */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Message (Optional)
            </h2>
            <textarea
              value={donorMessage}
              onChange={(e) => setDonorMessage(e.target.value)}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Share a message about your donation or any special instructions..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allow transition-colors duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FaHeart />
                  <span>Submit Donation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Donate;