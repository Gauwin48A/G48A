const sharp = require('sharp');
const fs = require('fs');
const fsp = fs.promises;

function normalizeFiles(req) {
    if (Array.isArray(req.files)) {
        return req.files;
    }

    if (req.files && typeof req.files === 'object') {
        return Object.values(req.files).flat().filter(Boolean);
    }

    if (req.file) {
        return [req.file];
    }

    return [];
}

/**
 * Image Optimizer Middleware
 * 
 * Automatically compresses and resizes images uploaded to local disk.
 * (Cloudinary handles this automatically via config/cloudinary.js)
 */
const optimizeLocalImages = async (req, res, next) => {
    // 1. Skip if nothing uploaded.
    const files = normalizeFiles(req);
    if (!files.length) return next();

    const isCloudinary = Boolean(files[0]?.path && files[0].path.startsWith('http'));

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
            await fsp.unlink(originalPath);
            await fsp.rename(tempPath, originalPath);

            // Update file metadata for controller
            const newStats = await fsp.stat(originalPath);
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
