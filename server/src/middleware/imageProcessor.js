/**
 * Image Processor Middleware
 * 
 * Uses sharp to automatically compress and resize uploaded images.
 * Reduces 10MB photos to ~100KB while maintaining quality.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fsp = fs.promises;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Compress and resize a single image
 * @param {Buffer} buffer - Image buffer from multer
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Path to saved image
 */
async function processImage(buffer, filename) {
    const outputPath = path.join(uploadsDir, filename);

    await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: 80,
            progressive: true
        })
        .toFile(outputPath);

    return `/uploads/${filename}`;
}

function createImageFilename(index = null) {
    const suffix = crypto.randomBytes(6).toString('hex');
    const indexPart = index === null ? '' : `-${index}`;
    return `post-${Date.now()}${indexPart}-${suffix}.jpg`;
}

/**
 * Middleware to process single image upload
 * Expects multer to have already parsed the file
 */
async function processSingleImage(req, res, next) {
    if (!req.file) {
        return next();
    }

    try {
        const filename = createImageFilename();
        const imagePath = await processImage(req.file.buffer, filename);
        req.body.imagePath = imagePath;

        // Log compression stats
        const originalSize = req.file.size;
        const stats = await fsp.stat(path.join(uploadsDir, filename));
        const compressedSize = stats.size;
        const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(`[Image] Compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB (${reduction}% reduction)`);

        next();
    } catch (error) {
        console.error('[Image] Processing error:', error);
        next(error);
    }
}

/**
 * Middleware to process multiple image uploads
 * Expects multer to have already parsed the files
 */
async function processMultipleImages(req, res, next) {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const imagePaths = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const filename = createImageFilename(i);
            const imagePath = await processImage(file.buffer, filename);
            imagePaths.push(imagePath);

            // Log compression stats
            const originalSize = file.size;
            const stats = await fsp.stat(path.join(uploadsDir, filename));
            console.log(`[Image ${i + 1}] ${(originalSize / 1024).toFixed(0)}KB → ${(stats.size / 1024).toFixed(0)}KB`);
        }

        req.body.imagePaths = imagePaths;
        next();
    } catch (error) {
        console.error('[Image] Processing error:', error);
        next(error);
    }
}

/**
 * Process base64 images (for posts that send images as base64 strings)
 */
async function processBase64Images(req, res, next) {
    if (!req.body.images || !Array.isArray(req.body.images)) {
        return next();
    }

    try {
        const processedPaths = [];

        for (let i = 0; i < req.body.images.length; i++) {
            const imageData = req.body.images[i];

            // Skip if already a URL path
            if (typeof imageData === 'string' && imageData.startsWith('/uploads')) {
                processedPaths.push(imageData);
                continue;
            }

            // Process base64 image
            if (typeof imageData === 'string' && imageData.includes('base64')) {
                const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = createImageFilename(i);
                const imagePath = await processImage(buffer, filename);
                processedPaths.push(imagePath);
            }
        }

        if (processedPaths.length > 0) {
            req.body.processedImages = processedPaths;
        }
        next();
    } catch (error) {
        console.error('[Image] Base64 processing error:', error);
        next(error);
    }
}

module.exports = {
    processImage,
    processSingleImage,
    processMultipleImages,
    processBase64Images
};
