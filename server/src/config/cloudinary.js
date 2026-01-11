/**
 * Cloudinary Configuration
 * Protocol: Ironclad - Immortal Storage
 * 
 * Images persist in the cloud, surviving server restarts
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage for Multer
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mhub_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
        transformation: [
            { width: 1920, crop: 'limit' }, // Limit max width to HD (1920px)
            { quality: 'auto', fetch_format: 'auto' } // Auto format (WebP/AVIF) & Quality
        ]
    },
});

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('[Cloudinary] Image deleted:', publicId);
        return result;
    } catch (error) {
        console.error('[Cloudinary] Delete failed:', error);
        throw error;
    }
};

/**
 * Get image URL with transformations
 * @param {string} publicId - The public ID of the image
 * @param {object} options - Transformation options
 */
const getOptimizedUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto',
        ...options
    });
};

module.exports = {
    cloudinary,
    cloudinaryStorage,
    deleteImage,
    getOptimizedUrl
};
