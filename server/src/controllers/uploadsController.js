const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getUploadsDir, getUploadsSubdir } = require("../utils/uploads");
const { validateMagicBytes, stripExifData } = require("../middleware/upload");
const logger = require("../utils/logger");

const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
};

function resolveExtension(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (MIME_EXTENSION_MAP[normalized]) return MIME_EXTENSION_MAP[normalized];
  if (normalized.startsWith("image/")) return ".img";
  if (normalized.startsWith("audio/")) return ".audio";
  return ".bin";
}

/**
 * POST /api/uploads/post-image  (raw image bytes, Content-Type: image/*)
 * POST /api/uploads/audio       (raw audio bytes, Content-Type: audio/*)
 *
 * Android's two-stage listing flow uploads the raw file first and gets back a
 * public URL; createPost then accepts that URL in the JSON body. This endpoint
 * is the missing first stage — it validates magic bytes, strips EXIF, and saves
 * the file into the uploads directory served at /uploads/*.
 */
exports.upload = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id || req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const mimeType = String(req.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  if (!isImage && !isAudio) {
    return res.status(400).json({ error: "Content-Type must be image/* or audio/*" });
  }

  const buffer = req.body;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return res.status(400).json({ error: "Empty upload body" });
  }

  const maxBytes = isAudio ? 12 * 1024 * 1024 : 10 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return res.status(413).json({ error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` });
  }

  // Security: verify the magic bytes match the claimed mime type.
  if (!validateMagicBytes(buffer, mimeType)) {
    return res.status(400).json({ error: "File content does not match its declared type" });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${resolveExtension(mimeType)}`;
  const subdir = isAudio ? "audio" : "posts";
  const dir = getUploadsSubdir(subdir);
  const filePath = path.join(dir, filename);

  try {
    await fs.promises.writeFile(filePath, buffer);
    // Strip EXIF/GPS metadata from JPEG uploads (privacy + size).
    await stripExifData(filePath, mimeType);
    const stat = await fs.promises.stat(filePath);
    const key = `${subdir}/${filename}`;
    res.status(201).json({
      url: `/uploads/${key}`,
      key,
      size: stat.size,
    });
  } catch (err) {
    logger.error("[Uploads] Failed to save upload:", err);
    res.status(500).json({ error: "Failed to save upload" });
  }
};
