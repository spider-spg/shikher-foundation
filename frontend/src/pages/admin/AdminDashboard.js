import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUsers, 
  FaBook, 
  FaHandPaper, 
  FaShoppingCart,
  FaDonate,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaPlus,
  FaChartLine,
  FaChartBar,
  FaClock,
  FaHeart
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: { total: 0, change: 0 },
    books: { total: 0, borrowed: 0, available: 0 },
    handbags: { total: 0, sold: 0, inStock: 0 },
    orders: { total: 0, pending: 0, completed: 0 },
    bookDonations: { total: 0, approved: 0, pending: 0 }
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [topHandbags, setTopHandbags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user?.role]); // Use user.role instead of isAdmin() function

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel with proper error handling
      const [
        dashboardResponse,
        activitiesResponse,
        topBooksResponse,
        topHandbagsResponse
      ] = await Promise.allSettled([
        api.get('/admin/dashboard'),
        api.get('/admin/recent-activities'),
        api.get('/admin/top-books'),
        api.get('/admin/top-handbags')
      ]);

      // Handle dashboard response
      if (dashboardResponse.status === 'fulfilled') {
        setStats(dashboardResponse.value.data.dashboard || stats);
      } else {
        console.warn('Dashboard data fetch failed:', dashboardResponse.reason);
        // Keep default stats
      }

      // Handle activities response
      if (activitiesResponse.status === 'fulfilled') {
        setRecentActivities(activitiesResponse.value.data.activities || []);
      } else {
        console.warn('Activities data fetch failed:', activitiesResponse.reason);
        setRecentActivities([]);
      }

      // Handle top books response
      if (topBooksResponse.status === 'fulfilled') {
        setTopBooks(topBooksResponse.value.data.books || []);
      } else {
        console.warn('Top books data fetch failed:', topBooksResponse.reason);
        setTopBooks([]);
      }

      // Handle top handbags response
      if (topHandbagsResponse.status === 'fulfilled') {
        setTopHandbags(topHandbagsResponse.value.data.handbags || []);
      } else {
        console.warn('Top handbags data fetch failed:', topHandbagsResponse.reason);
        setTopHandbags([]);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Some dashboard data could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  // BUSINESS RULE: NO money/currency formatting - removed formatPrice function

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, change, color, link }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-xl text-white" />
        </div>
      </div>
      {link && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            to={link}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
          >
            <span>View Details</span>
            <FaEye className="ml-1" />
          </Link>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your Shikher Foundation performance and activities</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/admin/books/add" className="btn-primary text-center inline-flex items-center justify-center space-x-2">
            <FaPlus />
            <span>Add Book</span>
          </Link>
          <Link to="/admin/handbags/add" className="btn-outline text-center inline-flex items-center justify-center space-x-2">
            <FaPlus />
            <span>Add Handbag</span>
          </Link>
          <Link to="/admin/orders" className="btn-outline text-center inline-flex items-center justify-center space-x-2">
            <FaShoppingCart />
            <span>Manage Orders</span>
          </Link>
          <Link to="/admin/book-requests" className="btn-outline text-center inline-flex items-center justify-center space-x-2">
            <FaBook />
            <span>Book Requests</span>
          </Link>
          <Link to="/admin/donations" className="btn-outline text-center inline-flex items-center justify-center space-x-2">
            <FaHeart />
            <span>Manage Donations</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            subtitle="Registered users"
            icon={FaUsers}
            change={stats.users.change}
            color="bg-blue-500"
          />
          
          <StatCard
            title="Books"
            value={stats.books.total}
            subtitle={`${stats.books.borrowed} borrowed, ${stats.books.available} available`}
            icon={FaBook}
            color="bg-green-500"
          />
          
          <StatCard
            title="Handbags"
            value={stats.handbags.total}
            subtitle={`${stats.handbags.sold} sold, ${stats.handbags.available} in stock`}
            icon={FaHandPaper}
            color="bg-purple-500"
          />
          
          
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Orders Status</h3>
              <FaShoppingCart className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-semibold text-yellow-600">{stats.orders.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-semibold text-green-600">{stats.orders.delivered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-sm font-semibold text-gray-900">{stats.orders.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Books */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Most Borrowed Books</h3>
              <Link to="/admin/books" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
            <div className="p-6">
              {topBooks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                <div className="space-y-4">
                  {topBooks.map((book, index) => (
                    <div key={book.id || book._id || `book-${index}`} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{book.title}</h4>
                        <p className="text-sm text-gray-600">by {book.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{book.borrowCount} borrows</p>
                        <p className="text-xs text-gray-500">{book.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Handbags */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Best Selling Handbags</h3>
              <Link to="/admin/handbags" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
            <div className="p-6">
              {topHandbags.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No data available</p>
              ) : (
                <div className="space-y-4">
                  {topHandbags.map((handbag, index) => (
                    <div key={handbag.id || handbag._id || `handbag-${index}`} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{handbag.name || handbag.title || handbag.handbagName || 'Unknown Handbag'}</h4>
                        <p className="text-sm text-gray-600">{handbag.category || 'Uncategorized'} • {handbag.color || 'No color specified'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{handbag.salesCount} sold</p>
                        <p className="text-xs text-gray-500">Stock: {handbag.quantity || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <FaClock className="text-gray-400" />
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activities</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id || activity._id || `activity-${index}-${activity.type}`} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'order' ? 'bg-blue-100' :
                      activity.type === 'book_donation' ? 'bg-green-100' :
                      activity.type === 'book_borrow' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {activity.type === 'order' && <FaShoppingCart className="text-blue-600" />}
                      {activity.type === 'book_donation' && <FaBook className="text-green-600" />}
                      {activity.type === 'book_borrow' && <FaBook className="text-yellow-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</p>
                    </div>
                    {activity.quantity && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          Qty: {activity.quantity}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;