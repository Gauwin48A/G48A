const logger = require("../utils/logger");
const sharp = require("sharp");
const fs = require("fs");
const fsp = fs.promises;

/**
 * Normalize the various file attachment shapes from multer into a flat array.
 * Handles req.files (array or field-keyed object) and req.file (single upload).
 * @param {import('express').Request} req - The Express request object.
 * @returns {Object[]} Array of multer file objects.
 */
function normalizeFiles(req) {
  if (Array.isArray(req.files)) {
    return req.files;
  }
  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat().filter(Boolean);
  }
  if (req.file) {
    return [req.file];
  }
  return [];
}

/**
 * Express middleware that optimizes locally-stored uploaded images.
 * Skips Cloudinary-hosted files (paths starting with "http").
 * For local files, resizes to fit within 1920x1920, applies JPEG compression
 * at quality 80 with mozjpeg, and overwrites the original file in place.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const optimizeLocalImages = async (req, res, next) => {
  const files = normalizeFiles(req);
  if (!files.length) return next();

  const isCloudinary = Boolean(files[0]?.path && files[0].path.startsWith("http"));
  if (isCloudinary) {
    return next();
  }

  logger.info(`🖼️ [ImageOptimizer] Processing ${files.length} local images...`);

  const processPromises = files.map(async (file) => {
    if (!file.mimetype.startsWith("image/")) return;

    try {
      const originalPath = file.path;
      const tempPath = originalPath + ".tmp";

      const metadata = await sharp(originalPath).metadata();

      await sharp(originalPath)
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(tempPath);

      await fsp.unlink(originalPath);
      await fsp.rename(tempPath, originalPath);

      const newStats = await fsp.stat(originalPath);
      file.size = newStats.size;

      logger.info(`   ✅ Optimized: ${file.originalname} (${Math.round(newStats.size / 1024)}KB)`);
    } catch (err) {
      console.error(`   ❌ Failed to optimize ${file.originalname}:`, err.message);
    }
  });

  await Promise.all(processPromises);
  next();
};

module.exports = optimizeLocalImages;
