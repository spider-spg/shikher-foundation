import React, { useState, useEffect } from 'react';
import { 
  FaUser, 
  FaEnvelope, 
  FaEdit,
  FaSave,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaPhone,
  FaBook,
  FaShoppingBag,
  FaDonate
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [stats, setStats] = useState({
    borrowedBooks: 0,
    totalOrders: 0,
    totalDonations: 0,
    totalSpent: 0
  });

  const { user: authUser, syncUser } = useAuth();

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      setUser(userData);
      setProfileData({
        name:  userData.name  || '',
        email: userData.email || '',
        phone: userData.phone || userData.phoneNumber || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('We\'re having trouble loading your profile information. Please refresh the page');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/auth/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!profileData.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (!profileData.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!profileData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setUpdating(true);
    
    try {
      const response = await api.put('/auth/profile', profileData);
      
      if (response.data.success) {
        toast.success('Profile updated successfully');
        const updatedUser = response.data.user;
        setUser(updatedUser);
        // Sync global AuthContext so navbar/header reflect new name/email immediately
        if (syncUser) syncUser(updatedUser);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    
    if (!passwordData.newPassword) {
      toast.error('New password is required');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setUpdating(true);
    
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangingPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const cancelEditing = () => {
    setProfileData({
      name:  user?.name  || '',
      email: user?.email || '',
      phone: user?.phone || user?.phoneNumber || ''
    });
    setEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Personal Information
                </h2>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-outline inline-flex items-center space-x-2"
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {editing ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <p className="mt-1 text-xs text-amber-600">⚠️ Changing your email will also update your login email.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={updating}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                      >
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <FaSave />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="btn-outline inline-flex items-center space-x-2"
                      >
                        <FaTimes />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <FaUser className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Name</div>
                        <div className="font-semibold text-gray-900">{user?.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaEnvelope className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-semibold text-gray-900">{user?.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <FaPhone className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Phone Number</div>
                        <div className="font-semibold text-gray-900">{user?.phone || user?.phoneNumber || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg shadow-sm mt-8">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Security Settings
                </h2>
                {!changingPassword && (
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="btn-outline inline-flex items-center space-x-2"
                  >
                    <FaShieldAlt />
                    <span>Change Password</span>
                  </button>
                )}
              </div>
              
              {changingPassword && (
                <div className="p-6">
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={updating}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                      >
                        {updating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <FaShieldAlt />
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPassword(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                        }}
                        className="btn-outline inline-flex items-center space-x-2"
                      >
                        <FaTimes />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar with Stats */}
          <div className="space-y-6">
            {/* Account Type */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Account Type</h3>
              <div className="flex items-center space-x-2">
                <FaUser />
                <span className="capitalize">{user?.role} Account</span>
              </div>
              <p className="text-sm text-gray-100 mt-2">
                {user?.role === 'admin' 
                  ? 'You have full administrative access to the platform.'
                  : 'You can borrow books, donate books and purchase handbags.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;