import React, { useState, useEffect } from 'react';
import PhoneLink from '../components/PhoneLink';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHeart,
  FaGift,
  FaSpinner,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaHandshake,
  FaPhoneAlt,
  FaImage,
  FaChevronDown,
  FaChevronUp,
  FaBook,
  FaTshirt,
  FaGamepad,
  FaPen
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const NGO_PHONE = '+91-9324335478';

const itemTypeIcon = (type) => {
  switch (type) {
    case 'books':       return <FaBook className="text-blue-500" />;
    case 'clothes':     return <FaTshirt className="text-purple-500" />;
    case 'toys':        return <FaGamepad className="text-yellow-500" />;
    case 'stationary':  return <FaPen className="text-green-500" />;
    default:            return <FaGift className="text-pink-500" />;
  }
};

const STATUS_CONFIG = {
  pending:  { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review',   icon: FaClock },
  approved: { color: 'bg-green-100 text-green-800',   text: 'Approved',         icon: FaCheckCircle },
  rejected: { color: 'bg-red-100 text-red-800',       text: 'Rejected',         icon: FaTimesCircle },
  received: { color: 'bg-blue-100 text-blue-800',     text: 'Received',         icon: FaHandshake },
};

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState({});

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchDonations();
  }, [isAuthenticated, navigate]);

  const fetchDonations = async () => {
    try {
      const response = await api.get('/donations/my-donations');
      if (response.data.success) {
        setDonations(response.data.donations || []);
      } else {
        setDonations([]);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('Failed to load donations');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: FaClock };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon />
        {cfg.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-3xl text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Donations</h1>
            <p className="text-gray-600">Track your donation submissions</p>
          </div>
          <Link to="/donate" className="btn-primary flex items-center gap-2">
            <FaHeart /> Donate Again
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={status} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
                <div className={`p-2 rounded-full ${cfg.color}`}><Icon /></div>
                <div>
                  <p className="text-xs text-gray-500 capitalize">{cfg.text}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {donations.filter(d => d.status === status).length}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donations List */}
        {donations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <FaGift className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Donations Yet</h3>
            <p className="text-gray-500 mb-6">Your generosity can make a difference!</p>
            <Link to="/donate" className="btn-primary">Make a Donation</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map(donation => (
              <div key={donation.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{itemTypeIcon(donation.itemType)}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 capitalize">
                            {donation.itemType} Donation
                          </h3>
                          {getStatusBadge(donation.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Submitted on {formatDate(donation.createdAt)}
                          {donation.items?.length > 0 && ` · ${donation.items.length} item${donation.items.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(donation.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                    >
                      {expanded[donation.id] ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>

                  {/* Status-specific messages */}
                  {donation.status === 'approved' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 flex items-center gap-2">
                        <FaPhoneAlt className="flex-shrink-0" />
                        <span>
                          Your donation has been approved! Please coordinate with the NGO at{' '}
                          <PhoneLink phone={NGO_PHONE} showIcon={false} /> to schedule your drop-off.
                        </span>
                      </p>
                    </div>
                  )}

                  {donation.status === 'received' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <FaHandshake className="flex-shrink-0 text-lg" />
                        <span>
                          🙏 <strong>Thank you for your generous donation!</strong> The NGO has received
                          your items. Your contribution will make a real difference.
                        </span>
                      </p>
                    </div>
                  )}

                  {donation.status === 'rejected' && donation.adminMessage && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        <strong>Note from NGO:</strong> {donation.adminMessage}
                      </p>
                    </div>
                  )}

                  {donation.status === 'pending' && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Your donation is under review. You'll hear back from the NGO soon.
                      </p>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expanded[donation.id] && donation.items && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Donated Items</h4>
                    <div className="space-y-3">
                      {donation.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                          {item.imageData ? (
                            <img
                              src={item.imageData}
                              alt={item.name || `Item ${idx + 1}`}
                              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FaImage className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {item.name || `Item ${idx + 1}`}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.condition && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {item.condition}
                                </span>
                              )}
                              {item.quantity && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {donation.donorMessage && (
                      <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Your message to the NGO:</p>
                        <p className="text-sm text-gray-700 italic">"{donation.donorMessage}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDonations;