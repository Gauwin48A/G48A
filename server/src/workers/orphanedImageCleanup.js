/**
 * Orphaned Image Cleanup Worker
 * Removes uploaded images that are no longer referenced by any post.
 * Designed to run as a periodic cron job (weekly).
 */
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const fs = require("fs").promises;
const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const MIN_AGE_HOURS = 24; // Only clean files older than 24h

async function cleanOrphanedImages() {
  let cleaned = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Get all image paths referenced in active posts
    const result = await runQuery(
      `SELECT DISTINCT unnest(images) AS image_path
       FROM posts WHERE status IN ('active', 'sold', 'undone')`
    );
    const referencedImages = new Set(
      result.rows.map(r => {
        const p = r.image_path || '';
        return p.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
      }).filter(Boolean)
    );

    // List files in uploads directory
    let files;
    try {
      files = await fs.readdir(UPLOADS_DIR);
    } catch {
      logger.warn("[OrphanedCleanup] Uploads directory not found:", UPLOADS_DIR);
      return { cleaned: 0, skipped: 0, errors: 0 };
    }

    const cutoff = Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000;

    for (const file of files) {
      // Skip directories and non-image files
      if (!/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file)) {
        skipped++;
        continue;
      }

      if (referencedImages.has(file)) {
        skipped++;
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs > cutoff) {
          skipped++;
          continue; // Too recent — might still be in use
        }
        await fs.unlink(filePath);
        cleaned++;
      } catch (err) {
        errors++;
        logger.warn(`[OrphanedCleanup] Failed to remove ${file}:`, err.message);
      }
    }

    logger.info(`[OrphanedCleanup] Cleaned ${cleaned} files, skipped ${skipped}, errors ${errors}`);
  } catch (error) {
    logger.error("[OrphanedCleanup] Error:", error.message);
  }

  return { cleaned, skipped, errors };
}

module.exports = { cleanOrphanedImages };
