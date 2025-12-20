import React, { useState, useEffect, useRef } from 'react';
import './LazyImage.css';

const LazyImage = ({
    src,
    alt = '',
    className = '',
    placeholder = null,
    fallback = '/placeholder.jpg',
    aspectRatio = '4/3',
    ...props
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [inView, setInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px', threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setLoaded(true);
    };

    const handleError = () => {
        setError(true);
        setLoaded(true);
    };

    return (
        <div
            ref={imgRef}
            className={`lazy-image-wrapper ${className}`}
            style={{ aspectRatio }}
        >
            {!loaded && (
                <div className="lazy-image-placeholder shimmer">
                    {placeholder || <div className="lazy-image-icon">📷</div>}
                </div>
            )}
            {inView && (
                <img
                    src={error ? fallback : src}
                    alt={alt}
                    className={`lazy-image ${loaded ? 'loaded' : ''}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                    {...props}
                />
            )}
        </div>
    );
};

export default LazyImage;
