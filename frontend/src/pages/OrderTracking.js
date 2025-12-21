import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaTruck, FaBox, FaMapMarkerAlt, FaCalendar } from 'react-icons/fa';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

function OrderTracking() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrackingData();
  }, [trackingNumber]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/orders/track/${trackingNumber}`);
      setTrackingData(response.data);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'order_placed':
      case 'pending':
        return <FaBox className="text-blue-500" />;
      case 'processing':
      case 'preparing':
        return <FaBox className="text-yellow-500" />;
      case 'shipped':
      case 'in_transit':
        return <FaTruck className="text-purple-500" />;
      case 'out_for_delivery':
        return <FaTruck className="text-orange-500" />;
      case 'delivered':
        return <FaMapMarkerAlt className="text-green-500" />;
      default:
        return <FaBox className="text-gray-500" />;
    }
  };

  const formatStatusText = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!trackingData) return <div className="text-center py-8">Tracking information not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <FaArrowLeft className="mr-2" />
        Back
      </button>

      {/* Tracking Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Package Tracking</h1>
            <p className="text-gray-600">Tracking Number: {trackingNumber}</p>
            {trackingData.order && (
              <p className="text-sm text-gray-500">
                Order #{trackingData.order.orderNumber || trackingData.order._id}
              </p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center space-x-2">
              {getStatusIcon(trackingData.currentStatus)}
              <span className="font-semibold text-lg">
                {formatStatusText(trackingData.currentStatus)}
              </span>
            </div>
            {trackingData.estimatedDelivery && (
              <p className="text-sm text-gray-600 mt-1">
                Estimated Delivery: {new Date(trackingData.estimatedDelivery).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracking Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Tracking History</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {trackingData.trackingHistory?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {getStatusIcon(event.status)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          {formatStatusText(event.status)}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <FaMapMarkerAlt className="mr-1" />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                )) || (
                  // Default tracking events if no history is available
                  <>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaBox className="text-blue-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">Order Placed</h3>
                          <span className="text-sm text-gray-500">
                            {trackingData.order ? new Date(trackingData.order.createdAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Your order has been received and is being processed.</p>
                      </div>
                    </div>
                    
                    {['processing', 'shipped', 'delivered'].includes(trackingData.currentStatus?.toLowerCase()) && (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <FaBox className="text-yellow-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Processing</h3>
                            <span className="text-sm text-gray-500">
                              {new Date().toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Your order is being prepared for shipment.</p>
                        </div>
                      </div>
                    )}

                    {['shipped', 'delivered'].includes(trackingData.currentStatus?.toLowerCase()) && (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <FaTruck className="text-purple-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Shipped</h3>
                            <span className="text-sm text-gray-500">
                              {new Date().toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Your package is on its way!</p>
                        </div>
                      </div>
                    )}

                    {trackingData.currentStatus?.toLowerCase() === 'delivered' && (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <FaMapMarkerAlt className="text-green-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Delivered</h3>
                            <span className="text-sm text-gray-500">
                              {new Date().toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">Package has been delivered successfully!</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="space-y-6">
          {/* Package Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Package Details</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {trackingData.carrier && (
                  <div>
                    <span className="font-medium text-gray-700">Carrier:</span>
                    <p className="text-gray-600">{trackingData.carrier}</p>
                  </div>
                )}
                {trackingData.service && (
                  <div>
                    <span className="font-medium text-gray-700">Service:</span>
                    <p className="text-gray-600">{trackingData.service}</p>
                  </div>
                )}
                {trackingData.weight && (
                  <div>
                    <span className="font-medium text-gray-700">Weight:</span>
                    <p className="text-gray-600">{trackingData.weight}</p>
                  </div>
                )}
                {trackingData.dimensions && (
                  <div>
                    <span className="font-medium text-gray-700">Dimensions:</span>
                    <p className="text-gray-600">{trackingData.dimensions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          {trackingData.order?.shippingInfo && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>
              <div className="p-6">
                <div className="text-sm">
                  <p className="font-medium">{trackingData.order.shippingInfo.fullName}</p>
                  <p>{trackingData.order.shippingInfo.address}</p>
                  <p>
                    {trackingData.order.shippingInfo.city}, {trackingData.order.shippingInfo.state} {trackingData.order.shippingInfo.zipCode}
                  </p>
                  <p>{trackingData.order.shippingInfo.country}</p>
                </div>
              </div>
            </div>
          )}

          {/* Need Help */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you have questions about your shipment, contact our customer service.
            </p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderTracking;