import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaShare } from 'react-icons/fa';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookDetail();
  }, [id]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/books/${id}`);
      setBook(response.data);
    } catch (error) {
      console.error('Error fetching book:', error);
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    try {
      const response = await api.post('/api/books/borrow', { bookId: id });
      alert('Book borrowed successfully! Check your shelf.');
      navigate('/myshelf');
    } catch (error) {
      console.error('Error borrowing book:', error);
      alert(error.response?.data?.message || 'Failed to borrow book');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!book) return <div className="text-center py-8">Book not found</div>;

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
          {/* Book Image */}
          <div className="md:w-1/3">
            <img
              src={book.imageData || '/placeholder-book.jpg'}
              alt={book.title}
              className="w-full h-96 md:h-full object-cover"
            />
          </div>

          {/* Book Details */}
          <div className="md:w-2/3 p-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-red-500">
                  <FaHeart />
                </button>
                <button className="p-2 text-gray-500 hover:text-blue-500">
                  <FaShare />
                </button>
              </div>
            </div>

            <p className="text-xl text-gray-700 mb-2">by {book.author}</p>
            <p className="text-lg text-gray-600 mb-4">Category: {book.category}</p>

            {/* Availability Status */}
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  book.available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {book.available ? 'Available' : 'Not Available'}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">
                {book.description || 'No description available for this book.'}
              </p>
            </div>

            {/* Book Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="font-semibold text-gray-700">ISBN:</span>
                <p className="text-gray-600">{book.isbn || 'Not available'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Pages:</span>
                <p className="text-gray-600">{book.pages || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Language:</span>
                <p className="text-gray-600">{book.language || 'English'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Publisher:</span>
                <p className="text-gray-600">{book.publisher || 'Not specified'}</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8">
              {book.available ? (
                <button
                  onClick={handleBorrow}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-200 text-lg font-semibold"
                >
                  Borrow Book
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-400 text-white px-8 py-3 rounded-lg cursor-not-allowed text-lg font-semibold"
                >
                  Currently Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookDetail;