/**
 * Image Optimization Pipeline
 * Auto-compress and convert uploads to WebP for 80% bandwidth savings
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const OUTPUT_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/optimized');
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;
const THUMBNAIL_SIZE = 300;

/**
 * Ensure output directory exists
 */
const ensureOutputDir = async () => {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        await fs.mkdir(path.join(OUTPUT_DIR, 'thumbnails'), { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
};

/**
 * Optimize a single image
 * @param {Buffer|string} input - Image buffer or path
 * @param {string} filename - Original filename
 * @returns {Promise<{optimized: string, thumbnail: string, savings: number}>}
 */
const optimizeImage = async (input, filename) => {
    await ensureOutputDir();

    const baseName = path.parse(filename).name;
    const optimizedName = `${baseName}_${Date.now()}.webp`;
    const thumbnailName = `${baseName}_${Date.now()}_thumb.webp`;

    const optimizedPath = path.join(OUTPUT_DIR, optimizedName);
    const thumbnailPath = path.join(OUTPUT_DIR, 'thumbnails', thumbnailName);

    // Get original size
    const originalBuffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
    const originalSize = originalBuffer.length;

    // Optimize main image
    await sharp(originalBuffer)
        .resize(MAX_WIDTH, MAX_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: QUALITY })
        .toFile(optimizedPath);

    // Generate thumbnail
    await sharp(originalBuffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            position: 'center'
        })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);

    // Calculate savings
    const optimizedStats = await fs.stat(optimizedPath);
    const savings = Math.round((1 - optimizedStats.size / originalSize) * 100);

    console.log(`[IMAGE] ✅ Optimized ${filename}: ${savings}% smaller`);

    return {
        optimized: `/uploads/optimized/${optimizedName}`,
        thumbnail: `/uploads/optimized/thumbnails/${thumbnailName}`,
        originalSize,
        optimizedSize: optimizedStats.size,
        savings
    };
};

/**
 * Process multiple images
 */
const optimizeImages = async (files) => {
    const results = await Promise.all(
        files.map(file => optimizeImage(file.buffer || file.path, file.originalname || file.filename))
    );
    return results;
};

/**
 * Middleware for Express/Multer integration
 */
const imageOptimizationMiddleware = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        const images = req.files.images || req.files;
        const optimized = await optimizeImages(images);
        req.optimizedImages = optimized;
        next();
    } catch (err) {
        console.error('[IMAGE] Optimization failed:', err);
        next(); // Continue without optimization
    }
};

/**
 * Get image metadata
 */
const getImageMetadata = async (input) => {
    const buffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
    return sharp(buffer).metadata();
};

module.exports = {
    optimizeImage,
    optimizeImages,
    imageOptimizationMiddleware,
    getImageMetadata,
    OUTPUT_DIR
};
