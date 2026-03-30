import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageZoomModal = ({
    isOpen,
    onClose,
    imageUrl,
    alt = 'Image',
    onNext,
    onPrev,
    currentIndex = 0,
    totalCount = 0,
}) => {
    const [scale, setScale] = useState(1);
    const showNav = (typeof onNext === 'function' || typeof onPrev === 'function') && totalCount > 1;
    const swipeState = useRef({ startX: 0, startY: 0, active: false });

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

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowRight' && typeof onNext === 'function') {
                onNext();
            } else if (event.key === 'ArrowLeft' && typeof onPrev === 'function') {
                onPrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onNext, onPrev]);

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

    const handleTouchStart = (event) => {
        const touch = event?.touches?.[0];
        if (!touch) return;
        swipeState.current = { startX: touch.clientX, startY: touch.clientY, active: true };
    };

    const handleTouchEnd = (event) => {
        if (!swipeState.current.active) return;
        const touch = event?.changedTouches?.[0];
        swipeState.current.active = false;
        if (!touch) return;
        const deltaX = touch.clientX - swipeState.current.startX;
        const deltaY = touch.clientY - swipeState.current.startY;
        if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        if (deltaX < 0 && typeof onNext === 'function') {
            onNext();
        } else if (deltaX > 0 && typeof onPrev === 'function') {
            onPrev();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={onClose}
        >
            {totalCount > 1 && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold">
                    {Math.max(0, Number(currentIndex) + 1)} / {totalCount}
                </div>
            )}
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
            {showNav && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (typeof onPrev === 'function') onPrev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-50"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-7 h-7 text-white" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (typeof onNext === 'function') onNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-50"
                        aria-label="Next image"
                    >
                        <ChevronRight className="w-7 h-7 text-white" />
                    </button>
                </>
            )}

            {/* Image Container */}
            <div
                className="relative overflow-auto max-w-[90vw] max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={() => { swipeState.current.active = false; }}
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
                Scroll to zoom - click outside to close
            </div>
        </div>
    );
};

export default ImageZoomModal;

