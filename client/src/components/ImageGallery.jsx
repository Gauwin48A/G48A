import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import LazyImage from './LazyImage';
import { useTranslation } from 'react-i18next';

import './ImageGallery.css';

const ImageGallery = ({ images = [], alt = 'Product image' }) => {
  const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showLightbox, setShowLightbox] = useState(false);

    // Handle single image or array
    const imageArray = Array.isArray(images) ? images : [images];

    if (imageArray.length === 0) {
        return (
            <div className="gallery-placeholder">
                <span>📷</span>
                <p>{t("no_images_available")}</p>
            </div>
        );
    }

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
        if (e.key === 'Escape') setShowLightbox(false);
    };

    return (
        <>
            <div className="image-gallery">
                {/* Main Image */}
                <div className="gallery-main" onClick={() => setShowLightbox(true)}>
                    <LazyImage
                        src={imageArray[currentIndex]}
                        alt={`${alt} ${currentIndex + 1}`}
                        aspectRatio="4/3"
                    />
                    <div className="gallery-zoom-hint">
                        <ZoomIn size={20} />
                    </div>
                    {imageArray.length > 1 && (
                        <div className="gallery-counter">
                            {currentIndex + 1} / {imageArray.length}
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {imageArray.length > 1 && (
                    <div className="gallery-thumbnails">
                        {imageArray.map((img, index) => (
                            <button
                                key={index}
                                className={`gallery-thumb ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => setCurrentIndex(index)}
                                type="button"
                                aria-label={`${t("view_image") || "View image"} ${index + 1}`}
                            >
                                <img src={img} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Navigation Arrows */}
                {imageArray.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="gallery-nav gallery-prev"
                            onClick={goToPrevious}
                            aria-label={t("previous_image") || "Previous image"}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            type="button"
                            className="gallery-nav gallery-next"
                            onClick={goToNext}
                            aria-label={t("next_image") || "Next image"}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
            </div>

            {/* Lightbox */}
            {showLightbox && (
                <div
                    className="gallery-lightbox"
                    onClick={() => setShowLightbox(false)}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("image_gallery") || "Image gallery"}
                >
                    <button
                        type="button"
                        className="lightbox-close"
                        onClick={() => setShowLightbox(false)}
                        aria-label={t("close") || "Close"}
                    >
                        <X size={28} />
                    </button>
                    <img
                        src={imageArray[currentIndex]}
                        alt={`${alt} ${currentIndex + 1}`}
                        onClick={(e) => e.stopPropagation()}
                    />
                    {imageArray.length > 1 && (
                        <>
                            <button
                                className="lightbox-nav lightbox-prev"
                                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                                type="button"
                                aria-label={t("previous_image") || "Previous image"}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button
                                className="lightbox-nav lightbox-next"
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                type="button"
                                aria-label={t("next_image") || "Next image"}
                            >
                                <ChevronRight size={32} />
                            </button>
                            <div className="lightbox-counter">
                                {currentIndex + 1} / {imageArray.length}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ImageGallery;
