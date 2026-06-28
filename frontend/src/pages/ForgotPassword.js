import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setEmailSent(true);
    } catch (error) {
      console.error('Password reset error:', error);

      switch (error.code) {
        case 'auth/user-not-found':
          // Don't reveal if email exists — security best practice
          // Show success anyway so attackers can't enumerate emails
          setEmailSent(true);
          break;
        case 'auth/invalid-email':
          toast.error('Please enter a valid email address');
          break;
        case 'auth/too-many-requests':
          toast.error('Too many requests. Please wait a few minutes and try again');
          break;
        case 'auth/network-request-failed':
          toast.error('Network error. Please check your internet and try again');
          break;
        default:
          toast.error('Something went wrong. Please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-gradient">
            Shikher Foundations
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">

          {/* Success State */}
          {emailSent ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <FaCheckCircle className="text-green-500 text-5xl" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Check your inbox!</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  If an account exists for <span className="font-semibold text-gray-900">{email}</span>,
                  you'll receive a password reset link shortly.
                </p>
                <p className="text-gray-500 text-xs mt-3">
                  Didn't receive it? Check your spam folder or try again in a few minutes.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setEmailSent(false); setEmail(''); }}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Try a different email
                </button>
                <Link
                  to="/login"
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 transition-all duration-200"
                >
                  Back to Login
                </Link>
              </div>
            </div>

          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Enter your registered email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  <FaArrowLeft className="text-xs" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;