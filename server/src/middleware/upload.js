/**
 * Upload Middleware
 * Protocol: Ironclad - Immortal Storage
 * 
 * Supports both Cloudinary (production) and local disk (development)
 */

const multer = require('multer');
const path = require('path');

// Check if Cloudinary is configured
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (isCloudinaryConfigured) {
  // CLOUDINARY STORAGE (Production - Persistent)
  const { cloudinaryStorage } = require('../config/cloudinary');
  storage = cloudinaryStorage;
  console.log('☁️ Upload: Cloudinary storage enabled (persistent)');
} else {
  // LOCAL DISK STORAGE (Development - Ephemeral)
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  console.log('📁 Upload: Local disk storage (development mode)');
}

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  // Accept images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Accept audio files for Voice-First Commerce
  else if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  }
  // Accept documents for certain endpoints
  else if (file.mimetype === 'application/xml' || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, XML, and PDF are allowed.'));
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10 // Max 10 files per upload
  },
  fileFilter
});

/**
 * Helper to get image URL from multer file
 * Works with both Cloudinary and local storage
 */
const getImageUrl = (file) => {
  if (file.path && file.path.startsWith('http')) {
    // Cloudinary returns full URL in path
    return file.path;
  }
  if (file.url) {
    // CloudinaryStorage also provides .url
    return file.url;
  }
  if (file.location) {
    // S3 compatibility
    return file.location;
  }
  // Local storage - construct URL
  return `/uploads/${file.filename}`;
};

module.exports = upload;
module.exports.getImageUrl = getImageUrl;
