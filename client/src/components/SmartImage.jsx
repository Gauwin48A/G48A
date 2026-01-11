/**
 * SmartImage Component
 * Protocol: UX Perfection - Phase 3
 * 
 * - Skeleton loading placeholder
 * - Smooth fade-in transition
 * - Error fallback
 * - Native lazy loading
 */

import { useState, memo } from 'react';

const SmartImage = memo(({
    src,
    alt = '',
    className = '',
    aspectRatio = 'aspect-square',
    fallbackText = 'Image N/A',
    objectFit = 'cover',
    priority = false,
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset state when src changes
    const handleLoad = () => {
        setIsLoaded(true);
        setHasError(false);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    return (
        <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${aspectRatio} ${className}`}>
            {/* Skeleton Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 animate-pulse">
                    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer" />
                </div>
            )}

            {/* Actual Image */}
            {!hasError && src && (
                <img
                    src={src}
                    alt={alt}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
            w-full h-full transition-opacity duration-500 ease-out
            ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
                />
            )}

            {/* Error Fallback */}
            {(hasError || !src) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <div className="text-center text-gray-400 dark:text-gray-500">
                        <svg
                            className="w-10 h-10 mx-auto mb-2 opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <span className="text-xs">{fallbackText}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

SmartImage.displayName = 'SmartImage';

export default SmartImage;
