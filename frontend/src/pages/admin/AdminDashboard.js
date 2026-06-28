import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUsers, FaBook, FaHandPaper, FaShoppingCart,
  FaHeart, FaPlus, FaEye, FaSpinner,
  FaTshirt, FaGamepad, FaPen, FaGift, FaRupeeSign,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

// ── Single coloured stat box ───────────────────────────────────────────────────
const StatBox = ({ label, value, bg, text }) => (
  <div className={`${bg} rounded-lg p-4 text-center`}>
    <p className={`text-2xl font-bold ${text}`}>{value ?? 0}</p>
    <p className="text-xs text-gray-600 mt-1">{label}</p>
  </div>
);

// ── Sub-section header inside a card ──────────────────────────────────────────
const SubHeader = ({ label }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-3 border-t border-gray-100 pt-4">
    {label}
  </p>
);

const AdminDashboard = () => {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') fetchDashboardData();
  }, [user?.role]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setStats(res.data.dashboard || null);
    } catch {
      toast.error('Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  };


  const fmt = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  const donationIcon = (type) => {
    const map = { books: <FaBook />, clothes: <FaTshirt />, toys: <FaGamepad />, stationary: <FaPen /> };
    return map[type] || <FaGift />;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FaSpinner className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600 mr-4">Failed to load.</p>
      <button onClick={fetchDashboardData} className="btn-primary">Retry</button>
    </div>
  );

  const cancelledOrders = Math.max(0,
    (stats.orders?.total ?? 0) - (stats.orders?.pending ?? 0) - (stats.orders?.delivered ?? 0)
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Shikher Foundation overview</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDashboardData} className="btn-outline flex items-center gap-2 text-sm">
              <FaSpinner /> Refresh
            </button>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { to: '/admin/books/add',     icon: FaPlus,         label: 'Add Book',      style: 'btn-primary' },
            { to: '/admin/handbags/add',  icon: FaPlus,         label: 'Add Handbag',   style: 'btn-outline' },
            { to: '/admin/orders',        icon: FaShoppingCart, label: 'Orders',        style: 'btn-outline' },
            { to: '/admin/book-requests', icon: FaBook,         label: 'Book Requests', style: 'btn-outline' },
            { to: '/admin/donations',     icon: FaHeart,        label: 'Donations',     style: 'btn-outline' },
          ].map(({ to, icon: Icon, label, style }) => (
            <Link key={to} to={to} className={`${style} text-center inline-flex items-center justify-center gap-2 text-sm`}>
              <Icon /> {label}
            </Link>
          ))}
        </div>

        {/* ── Users ── */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5 flex items-center gap-4">
          <div className="p-3 bg-blue-200 rounded-full">
            <FaUsers className="text-xl text-blue-700" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.users?.total ?? 0}</p>
            <p className="text-sm text-gray-500">Registered Users</p>
          </div>
        </div>

        {/* ── Books + Book Requests (merged) ── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
          {/* header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-full"><FaBook className="text-green-700" /></div>
              <h3 className="font-semibold text-gray-900">Books & Borrow Requests</h3>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/books" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <FaEye className="text-xs" /> View Books
              </Link>
              <Link to="/admin/book-requests" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <FaEye className="text-xs" /> View Requests
              </Link>
            </div>
          </div>

          {/* Book inventory boxes */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Library Inventory</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatBox label="Total Titles"       value={stats.books?.total}     bg="bg-gray-200"   text="text-gray-900" />
            <StatBox label="Available Copies"   value={stats.books?.available} bg="bg-green-200"  text="text-green-800" />
            <StatBox label="Currently Borrowed" value={stats.books?.borrowed}  bg="bg-yellow-200" text="text-yellow-800" />
          </div>

          {/* Borrow request boxes */}
          <SubHeader label="Borrow Requests" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatBox label="Total"           value={stats.bookRequests?.total}          bg="bg-gray-200"   text="text-gray-900" />
            <StatBox label="Pending"         value={stats.bookRequests?.pending}         bg="bg-yellow-200" text="text-yellow-800" />
            <StatBox label="Awaiting Pickup" value={stats.bookRequests?.awaitingPickup} bg="bg-orange-200" text="text-orange-800" />
            <StatBox label="Active Borrows"  value={stats.bookRequests?.active}          bg="bg-green-200"  text="text-green-800" />
            <StatBox label="Overdue"         value={stats.bookRequests?.overdue}         bg="bg-red-200"    text="text-red-800" />
          </div>
        </div>

        {/* ── Handbags + Orders (merged) ── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
          {/* header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-full"><FaHandPaper className="text-purple-700" /></div>
              <h3 className="font-semibold text-gray-900">Handbags & Orders</h3>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/handbags" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <FaEye className="text-xs" /> View Handbags
              </Link>
              <Link to="/admin/orders" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <FaEye className="text-xs" /> Manage Orders
              </Link>
            </div>
          </div>

          {/* Inventory boxes */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Inventory</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Total Products"      value={stats.handbags?.total}      bg="bg-gray-200"   text="text-gray-900" />
            <StatBox label="In Stock"            value={stats.handbags?.available}  bg="bg-green-200"  text="text-green-800" />
            <StatBox label="In Carts (reserved)" value={stats.handbags?.inCarts}    bg="bg-orange-200" text="text-orange-800" />
            <StatBox label="Out of Stock"        value={stats.handbags?.outOfStock} bg="bg-red-200"    text="text-red-800" />
          </div>

          {/* Sales boxes */}
          <SubHeader label="Sales" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatBox label="Units Sold (picked up)" value={stats.handbags?.sold} bg="bg-purple-200" text="text-purple-800" />
            <div className="bg-green-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-800">{fmt(stats.handbags?.revenue)}</p>
              <p className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                <FaRupeeSign className="text-green-700 text-xs" /> Revenue Generated
              </p>
            </div>
          </div>

          {/* Orders boxes */}
          <SubHeader label="Orders" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Total Orders"        value={stats.orders?.total}     bg="bg-gray-200"   text="text-gray-900" />
            <StatBox label="Awaiting Pickup"     value={stats.orders?.pending}   bg="bg-orange-200" text="text-orange-800" />
            <StatBox label="Picked Up"           value={stats.orders?.delivered} bg="bg-green-200"  text="text-green-800" />
            <StatBox label="Cancelled / Expired" value={cancelledOrders}         bg="bg-red-200"    text="text-red-800" />
          </div>
        </div>

        {/* ── Donations ── */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-200 rounded-full"><FaHeart className="text-pink-600" /></div>
              <h3 className="font-semibold text-gray-900">Donations</h3>
            </div>
            <Link to="/admin/donations" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <FaEye className="text-xs" /> Manage Donations
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatBox label="Total (excl. rejected)" value={stats.donations?.total}    bg="bg-gray-200"   text="text-gray-900" />
            <StatBox label="Pending Review"         value={stats.donations?.pending}  bg="bg-yellow-200" text="text-yellow-800" />
            <StatBox label="Approved"               value={stats.donations?.approved} bg="bg-blue-200"   text="text-blue-800" />
            <StatBox label="Received"               value={stats.donations?.received} bg="bg-green-200"  text="text-green-800" />
            <StatBox label="Rejected"               value={stats.donations?.rejected} bg="bg-red-200"    text="text-red-800" />
          </div>

          {/* By Category — accepted in green, rejected in red */}
          {(stats.donations?.byTypeAccepted || stats.donations?.byTypeRejected) && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">By Category</p>

              {stats.donations?.byTypeAccepted && Object.keys(stats.donations.byTypeAccepted).length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-green-700 font-medium mb-1">✅ Accepted</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.donations.byTypeAccepted).map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1.5 bg-green-100 border border-green-300 text-green-800 text-xs px-3 py-2 rounded-lg font-medium">
                        {donationIcon(type)}
                        <span className="capitalize">{type}</span>
                        <span className="font-bold ml-1">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.donations?.byTypeRejected && Object.keys(stats.donations.byTypeRejected).length > 0 && (
                <div>
                  <p className="text-xs text-red-600 font-medium mb-1">❌ Rejected</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.donations.byTypeRejected).map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1.5 bg-red-100 border border-red-300 text-red-800 text-xs px-3 py-2 rounded-lg font-medium">
                        {donationIcon(type)}
                        <span className="capitalize">{type}</span>
                        <span className="font-bold ml-1">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Stock Alerts ── */}
        {((stats.alerts?.lowStockBooks?.length > 0) ||
          (stats.alerts?.outOfStockBooks?.length > 0) ||
          (stats.alerts?.lowStockHandbags?.length > 0) ||
          (stats.alerts?.outOfStockHandbags?.length > 0)) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-200 rounded-full"><FaExclamationTriangle className="text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Stock Alerts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { items: stats.alerts?.outOfStockBooks,    label: 'Books — Out of Stock',    color: 'red',    showQty: false },
                { items: stats.alerts?.lowStockBooks,      label: 'Books — Low Stock',        color: 'yellow', showQty: true },
                { items: stats.alerts?.outOfStockHandbags, label: 'Handbags — Out of Stock', color: 'red',    showQty: false },
                { items: stats.alerts?.lowStockHandbags,   label: 'Handbags — Low Stock',    color: 'yellow', showQty: true },
              ].map(({ items, label, color, showQty }) =>
                items?.length > 0 ? (
                  <div key={label}>
                    <p className={`text-xs font-semibold text-${color}-600 uppercase mb-2`}>{label}</p>
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className={`text-sm text-gray-700 bg-${color}-50 px-3 py-2 rounded-lg flex justify-between`}>
                          <span>{item.title}</span>
                          {showQty && <span className={`font-bold text-${color}-700`}>{item.quantity} left</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;