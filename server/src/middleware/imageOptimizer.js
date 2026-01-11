const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Image Optimizer Middleware
 * 
 * Automatically compresses and resizes images uploaded to local disk.
 * (Cloudinary handles this automatically via config/cloudinary.js)
 */
const optimizeLocalImages = async (req, res, next) => {
    // 1. Skip if Cloudinary is active (files are already URLs)
    // We check if file.path starts with 'http' or verify config
    if (!req.files && !req.file) return next();

    const files = req.files || [req.file];
    const isCloudinary = files[0].path && files[0].path.startsWith('http');

    if (isCloudinary) {
        // Already handled by Cloudinary transformation
        return next();
    }

    // 2. Process Local Files
    console.log(`🖼️ [ImageOptimizer] Processing ${files.length} local images...`);

    const processPromises = files.map(async (file) => {
        // Only process images
        if (!file.mimetype.startsWith('image/')) return;

        try {
            const originalPath = file.path;
            const tempPath = originalPath + '.tmp';

            // Get Metadata
            const metadata = await sharp(originalPath).metadata();

            // Optimization Pipeline
            // Resize to HD (1920x1080 fit inside), Convert to JPEG/WebP (Auto), Quality 80
            await sharp(originalPath)
                .rotate() // Auto-rotate based on EXIF
                .resize({
                    width: 1920,
                    height: 1920,
                    fit: sharp.fit.inside,
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80, mozjpeg: true }) // Balanced compression
                .toFile(tempPath);

            // Overwrite original file
            fs.unlinkSync(originalPath);
            fs.renameSync(tempPath, originalPath);

            // Update file metadata for controller
            const newStats = fs.statSync(originalPath);
            file.size = newStats.size;

            console.log(`   ✅ Optimized: ${file.originalname} (${Math.round(newStats.size / 1024)}KB)`);

        } catch (err) {
            console.error(`   ❌ Failed to optimize ${file.originalname}:`, err.message);
            // Don't fail request, just keep original
        }
    });

    await Promise.all(processPromises);
    next();
};

module.exports = optimizeLocalImages;
