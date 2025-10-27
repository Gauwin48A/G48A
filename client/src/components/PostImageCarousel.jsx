import React, { useState, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * Renders a clickable image carousel for a post.
 * It's crucial that carousel navigation stops event propagation 
 * to prevent accidental navigation when viewing the next/prev image.
 */
const PostImageCarousel = ({ imageUrls = [], title, postId, handleViewDetails }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const totalImages = imageUrls.length;

  const goToPrevious = useCallback((e) => {
    // 🛑 STOP propagation so clicking the button doesn't trigger View Details
    e.stopPropagation(); 
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? totalImages - 1 : prevIndex - 1
    );
  }, [totalImages]);

  const goToNext = useCallback((e) => {
    // 🛑 STOP propagation
    e.stopPropagation(); 
    setCurrentImageIndex((prevIndex) => 
      prevIndex === totalImages - 1 ? 0 : prevIndex + 1
    );
  }, [totalImages]);
  
  // Placeholder image if no URLs are available
  const currentImageUrl = imageUrls[currentImageIndex];

  return (
    // Wrap with an onClick for easy navigation to details
    <div 
      className="relative w-full h-full cursor-pointer" 
      onClick={() => handleViewDetails(postId)}
    >
      {currentImageUrl ? (
        <img
          src={currentImageUrl}
          alt={`${title} image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          // Add a simple error fallback if image fails to load
          onError={(e) => { e.target.src = '/placeholder-fallback.svg'; }}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400">No Image Available</span>
        </div>
      )}

      {/* Navigation Arrows (Only show if more than one image) */}
      {totalImages > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition z-10 focus:outline-none"
            aria-label="Previous Image"
          >
            <FaChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition z-10 focus:outline-none"
            aria-label="Next Image"
          >
            <FaChevronRight className="w-3 h-3" />
          </button>
          
          {/* Indicator Dots */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 bg-black bg-opacity-20 rounded-full p-1">
            {imageUrls.map((_, index) => (
              <span
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-gray-400'} opacity-80 transition-colors`}
                aria-label={`Image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PostImageCarousel;