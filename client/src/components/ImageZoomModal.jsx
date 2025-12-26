import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

const ImageZoomModal = ({ isOpen, onClose, imageUrl, alt = 'Image' }) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (isOpen) {
            // Disable body scroll when modal is open
            document.body.style.overflow = 'hidden';
            // Reset scale when opening
            setScale(1);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.5, 0.5));
    };

    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-50"
            >
                <X className="w-8 h-8 text-white" />
            </button>

            {/* Zoom Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/20 backdrop-blur-md rounded-full px-6 py-3 z-50">
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                    <ZoomOut className="w-6 h-6 text-white" />
                </button>
                <span className="text-white font-medium min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                    <ZoomIn className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* Image Container */}
            <div
                className="relative overflow-auto max-w-[90vw] max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
            >
                <img
                    src={imageUrl}
                    alt={alt}
                    className="transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
                    style={{ transform: `scale(${scale})` }}
                    onError={(e) => { e.target.src = '/placeholder.svg'; }}
                    draggable={false}
                />
            </div>

            {/* Instructions */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-4 py-2 rounded-full">
                Scroll to zoom • Click outside to close
            </div>
        </div>
    );
};

export default ImageZoomModal;
