import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaShare, FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import api, { getImageUrl } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

function HandbagDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [handbag, setHandbag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    fetchHandbagDetail();
  }, [id]);

  const fetchHandbagDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/handbags/${id}`);
      setHandbag(response.data);
      // Set default selections
      if (response.data.sizes && response.data.sizes.length > 0) {
        setSelectedSize(response.data.sizes[0]);
      }
      if (response.data.colors && response.data.colors.length > 0) {
        setSelectedColor(response.data.colors[0]);
      }
    } catch (error) {
      console.error('Error fetching handbag:', error);
      setError('Failed to load handbag details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (handbag.sizes && handbag.sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }
    if (handbag.colors && handbag.colors.length > 0 && !selectedColor) {
      alert('Please select a color');
      return;
    }

    const cartItem = {
      ...handbag,
      selectedSize,
      selectedColor,
      type: 'handbag'
    };

    addToCart(cartItem);
    alert('Handbag added to cart!');
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!handbag) return <div className="text-center py-8">Handbag not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          {/* Product Images */}
          <div className="md:w-1/2">
            <div className="aspect-square">
              <img
                src={handbag.imageData || '/placeholder-handbag.jpg'}
                alt={handbag.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Additional images could go here */}
          </div>

          {/* Product Details */}
          <div className="md:w-1/2 p-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{handbag.name}</h1>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-red-500">
                  <FaHeart />
                </button>
                <button className="p-2 text-gray-500 hover:text-blue-500">
                  <FaShare />
                </button>
              </div>
            </div>

            <p className="text-2xl font-bold text-blue-600 mb-4">${handbag.price}</p>

            {/* Category and Stock */}
            <div className="mb-6">
              <p className="text-lg text-gray-600 mb-2">Category: {handbag.category}</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  handbag.inStock
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {handbag.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {handbag.description || 'No description available for this handbag.'}
              </p>
            </div>

            {/* Size Selection */}
            {handbag.sizes && handbag.sizes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Size</h3>
                <div className="flex space-x-2">
                  {handbag.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border rounded-lg ${
                        selectedSize === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {handbag.colors && handbag.colors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Color</h3>
                <div className="flex space-x-2">
                  {handbag.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border rounded-lg capitalize ${
                        selectedColor === color
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Material and Features */}
            {(handbag.material || handbag.features) && (
              <div className="mb-6">
                {handbag.material && (
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Material:</span>
                    <span className="text-gray-600 ml-2">{handbag.material}</span>
                  </div>
                )}
                {handbag.features && (
                  <div>
                    <span className="font-semibold text-gray-700">Features:</span>
                    <span className="text-gray-600 ml-2">{handbag.features}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8">
              {handbag.inStock ? (
                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200 text-lg font-semibold flex items-center justify-center"
                  >
                    <FaShoppingCart className="mr-2" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => {
                      handleAddToCart();
                      navigate('/checkout');
                    }}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-200 text-lg font-semibold"
                  >
                    Buy Now
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed text-lg font-semibold"
                >
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HandbagDetail;