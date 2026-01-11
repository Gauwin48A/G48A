/**
 * ImageUpload Component
 * Defender Prompt 3: Hyper-Efficient Frontend
 * 
 * Compresses images to max 200KB BEFORE upload
 * This saves bandwidth and storage at scale
 */

import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE_KB = 200;
const MAX_WIDTH_PX = 1000;
const MAX_FILES = 5;

const ImageUpload = ({
    onImagesChange,
    maxFiles = MAX_FILES,
    className = ''
}) => {
    const [images, setImages] = useState([]);
    const [compressing, setCompressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Compression options
    const compressionOptions = {
        maxSizeMB: MAX_FILE_SIZE_KB / 1024, // Convert to MB
        maxWidthOrHeight: MAX_WIDTH_PX,
        useWebWorker: true,
        fileType: 'image/webp', // WebP for better compression
        onProgress: (p) => setProgress(Math.round(p))
    };

    const compressImage = async (file) => {
        try {
            // Skip if already small enough
            if (file.size <= MAX_FILE_SIZE_KB * 1024) {
                return file;
            }

            console.log(`[ImageUpload] Compressing ${file.name}: ${(file.size / 1024).toFixed(0)}KB`);
            const compressed = await imageCompression(file, compressionOptions);
            console.log(`[ImageUpload] Compressed to: ${(compressed.size / 1024).toFixed(0)}KB`);

            return compressed;
        } catch (err) {
            console.error('[ImageUpload] Compression failed:', err);
            return file; // Return original if compression fails
        }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check max files limit
        if (images.length + files.length > maxFiles) {
            setError(`Maximum ${maxFiles} images allowed`);
            return;
        }

        setCompressing(true);
        setError(null);
        setProgress(0);

        try {
            const compressedImages = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Only accept images
                if (!file.type.startsWith('image/')) {
                    continue;
                }

                const compressed = await compressImage(file);
                const preview = URL.createObjectURL(compressed);

                compressedImages.push({
                    file: compressed,
                    preview,
                    originalSize: file.size,
                    compressedSize: compressed.size,
                    name: file.name
                });

                setProgress(((i + 1) / files.length) * 100);
            }

            const newImages = [...images, ...compressedImages];
            setImages(newImages);
            onImagesChange?.(newImages.map(img => img.file));

        } catch (err) {
            setError('Failed to process images');
            console.error('[ImageUpload] Error:', err);
        } finally {
            setCompressing(false);
            setProgress(0);
            // Reset input
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const removeImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        // Revoke URL to free memory
        URL.revokeObjectURL(images[index].preview);
        setImages(newImages);
        onImagesChange?.(newImages.map(img => img.file));
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes}B`;
        return `${(bytes / 1024).toFixed(0)}KB`;
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Upload Button */}
            <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {compressing ? (
                    <div className="space-y-2">
                        <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500">Compressing images...</p>
                        <Progress value={progress} className="w-full max-w-xs mx-auto" />
                    </div>
                ) : (
                    <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload images
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Auto-compressed to {MAX_FILE_SIZE_KB}KB max • {maxFiles} images max
                        </p>
                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Image Previews */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                            <img
                                src={img.preview}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                            />
                            {/* Size badge */}
                            <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
                                {formatSize(img.compressedSize)}
                                {img.compressedSize < img.originalSize && (
                                    <span className="text-green-400 ml-1">
                                        ↓{Math.round((1 - img.compressedSize / img.originalSize) * 100)}%
                                    </span>
                                )}
                            </span>
                            {/* Remove button */}
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
