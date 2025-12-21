import React, { useState } from 'react';
import { getImageUrl } from '../utils/api';

const ImageWithFallback = ({ 
  src, 
  fallbackSrc = '/placeholder.jpg', 
  alt = 'Image', 
  className = '', 
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Get the proper image URL - supports base64, Firebase URLs and local paths
  const getImageSource = (imageSrc) => {
    if (!imageSrc) return fallbackSrc;
    
    // If it's a base64 data URL, return as-is
    if (imageSrc.startsWith('data:image/')) {
      return imageSrc;
    }
    
    // If it's already a complete URL (Firebase Storage URL), return as-is
    if (imageSrc.startsWith('http')) {
      return imageSrc;
    }
    
    // Use our API utility to construct the URL (for backwards compatibility)
    return getImageUrl(imageSrc) || fallbackSrc;
  };

  const imageSrc = hasError ? fallbackSrc : getImageSource(src);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};

export default ImageWithFallback;
