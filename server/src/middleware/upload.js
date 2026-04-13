const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { getUploadsDir } = require("../utils/uploads");

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let storage;
const uploadDir = getUploadsDir();

// Magic bytes for real file type validation
const MAGIC_BYTES = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  "image/gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
  "image/webp": [Buffer.from("RIFF")], // RIFF header, WebP follows at offset 8
  "application/pdf": [Buffer.from("%PDF")],
};

/**
 * Validate file content against magic bytes to prevent mimetype spoofing.
 * @param {Buffer} buffer - First bytes of the file
 * @param {string} claimedMime - The mimetype reported by the client
 * @returns {boolean}
 */
function validateMagicBytes(buffer, claimedMime) {
  if (!buffer || buffer.length < 4) return false;
  const normalizedMime = claimedMime.toLowerCase();

  // Audio files: allow any declared audio mime through (magic bytes vary widely)
  if (normalizedMime.startsWith("audio/")) return true;

  const signatures = MAGIC_BYTES[normalizedMime];
  if (!signatures) {
    // For image subtypes without explicit signatures, check common image headers
    if (normalizedMime.startsWith("image/")) {
      return Object.values(MAGIC_BYTES).some((sigs) =>
        sigs.some((sig) => buffer.subarray(0, sig.length).equals(sig))
      );
    }
    return false;
  }
  return signatures.some((sig) => buffer.subarray(0, sig.length).equals(sig));
}

/**
 * Strip EXIF/metadata from image buffers to protect user privacy (GPS, device info).
 * Uses a lightweight approach — for JPEG, strips APP1 (EXIF) segments.
 * For other formats, we rely on re-encoding via imageOptimizer middleware if available.
 * @param {string} filePath - Path to the uploaded file
 * @param {string} mimeType - Detected mime type
 */
async function stripExifData(filePath, mimeType) {
  if (!filePath || !mimeType) return;
  const normalizedMime = mimeType.toLowerCase();

  // Only process local JPEG files (most common EXIF carrier)
  if (normalizedMime !== "image/jpeg" && normalizedMime !== "image/jpg") return;

  try {
    const data = await fs.promises.readFile(filePath);
    const stripped = stripJpegExif(data);
    if (stripped && stripped.length > 0 && stripped.length !== data.length) {
      await fs.promises.writeFile(filePath, stripped);
    }
  } catch (_err) {
    // Non-fatal: if stripping fails, the file is still usable
  }
}

/**
 * Remove EXIF APP1 markers from JPEG buffer.
 * @param {Buffer} jpeg
 * @returns {Buffer}
 */
function stripJpegExif(jpeg) {
  if (!jpeg || jpeg.length < 4) return jpeg;
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg; // Not a JPEG

  const chunks = [Buffer.from([0xff, 0xd8])];
  let offset = 2;

  while (offset < jpeg.length - 1) {
    if (jpeg[offset] !== 0xff) break;
    const marker = jpeg[offset + 1];

    // SOS (Start of Scan) — rest is image data
    if (marker === 0xda) {
      chunks.push(jpeg.subarray(offset));
      break;
    }

    // APP1 (EXIF) = 0xE1 — skip this marker
    if (marker === 0xe1) {
      if (offset + 3 < jpeg.length) {
        const segmentLength = jpeg.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
        continue;
      }
    }

    // Keep all other markers
    if (offset + 3 < jpeg.length) {
      const segmentLength = jpeg.readUInt16BE(offset + 2);
      chunks.push(jpeg.subarray(offset, offset + 2 + segmentLength));
      offset += 2 + segmentLength;
    } else {
      chunks.push(jpeg.subarray(offset));
      break;
    }
  }

  return Buffer.concat(chunks);
}

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
  "application/pdf": ".pdf",
};

const resolveFileExtension = (file) => {
  const normalizedMime = String(file?.mimetype || "").toLowerCase();
  if (MIME_EXTENSION_MAP[normalizedMime]) {
    return MIME_EXTENSION_MAP[normalizedMime];
  }

  const ext = path.extname(String(file?.originalname || "")).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(ext)) {
    return ext;
  }

  if (normalizedMime.startsWith("image/")) return ".img";
  if (normalizedMime.startsWith("audio/")) return ".audio";
  return ".bin";
};

if (isCloudinaryConfigured) {
  const { createCloudinaryStorage } = require("../config/cloudinary");
  storage = createCloudinaryStorage();
  if (process.env.NODE_ENV !== "production") console.log("[Upload] Cloudinary storage enabled");
} else {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const uniqueSuffix = crypto.randomBytes(8).toString("hex");
      const extension = resolveFileExtension(file);
      cb(null, `${Date.now()}-${uniqueSuffix}${extension}`);
    },
  });

  if (process.env.NODE_ENV !== "production") console.log("[Upload] Local disk storage enabled");
}

const fileFilter = (req, file, cb) => {
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (mimeType === "image/svg+xml") {
    cb(new Error("SVG files are not allowed due to security risks."));
  } else if (mimeType.startsWith("image/")) {
    cb(null, true);
  } else if (mimeType.startsWith("audio/")) {
    cb(null, true);
  } else if (mimeType === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, audio, and PDF are allowed."));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter,
});

const getImageUrl = (file) => {
  if (!file || typeof file !== "object") {
    return null;
  }

  if (typeof file.path === "string" && file.path.startsWith("http")) {
    return file.path;
  }

  if (typeof file.url === "string" && file.url.length > 0) {
    return file.url;
  }

  if (typeof file.location === "string" && file.location.length > 0) {
    return file.location;
  }

  if (typeof file.filename !== "string" || file.filename.length === 0) {
    return null;
  }

  return `/uploads/${file.filename}`;
};

module.exports = upload;
module.exports.getImageUrl = getImageUrl;
module.exports.validateMagicBytes = validateMagicBytes;
module.exports.stripExifData = stripExifData;

/**
 * Validate image dimensions — reject extreme aspect ratios (e.g. 1x10000px).
 * @param {string} filePath - Path to image file on disk
 * @returns {Promise<{valid: boolean, width?: number, height?: number, reason?: string}>}
 */
async function validateImageDimensions(filePath) {
  try {
    const data = await fs.promises.readFile(filePath);
    let width = 0, height = 0;

    // JPEG: scan SOF markers for dimensions
    const mimeGuess = data[0] === 0xff && data[1] === 0xd8 ? "jpeg" : data[1] === 0x50 ? "png" : null;
    if (mimeGuess === "jpeg") {
      let off = 2;
      while (off < data.length - 8) {
        if (data[off] !== 0xff) break;
        const marker = data[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
          height = data.readUInt16BE(off + 5);
          width = data.readUInt16BE(off + 7);
          break;
        }
        const segLen = data.readUInt16BE(off + 2);
        off += 2 + segLen;
      }
    } else if (mimeGuess === "png" && data.length > 24) {
      width = data.readUInt32BE(16);
      height = data.readUInt32BE(20);
    }

    if (width === 0 || height === 0) return { valid: true }; // Can't determine, allow

    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    if (aspectRatio > 10) {
      return { valid: false, width, height, reason: "Extreme aspect ratio (max 10:1)" };
    }
    if (width > 8192 || height > 8192) {
      return { valid: false, width, height, reason: "Image dimensions too large (max 8192px)" };
    }
    return { valid: true, width, height };
  } catch (_err) {
    return { valid: true }; // If we can't read, allow through
  }
}
module.exports.validateImageDimensions = validateImageDimensions;

/**
 * Post-upload middleware: validates magic bytes and strips EXIF for all uploaded files.
 * Use after multer middleware in the route chain.
 */
module.exports.postUploadSecurity = async (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      Object.values(req.files).forEach((arr) => files.push(...arr));
    }
  }

  for (const file of files) {
    // Magic byte validation for local disk files
    if (file.path && !file.path.startsWith("http")) {
      try {
        const fd = await fs.promises.open(file.path, "r");
        const headerBuf = Buffer.alloc(12);
        await fd.read(headerBuf, 0, 12, 0);
        await fd.close();

        const mimeType = String(file.mimetype || "").toLowerCase();
        if (!validateMagicBytes(headerBuf, mimeType)) {
          // Clean up the suspicious file
          fs.promises.unlink(file.path).catch(() => {});
          return res.status(400).json({
            error: "File content does not match its declared type. Upload rejected.",
          });
        }
      } catch (_readErr) {
        // If we can't read the file, let it through — multer already validated
      }
    }

    // Strip EXIF/GPS metadata from images
    if (file.path && !file.path.startsWith("http")) {
      const mimeType = String(file.mimetype || "").toLowerCase();
      if (mimeType.startsWith("image/")) {
        await stripExifData(file.path, mimeType);

        // Validate dimensions / aspect ratio (#46)
        const dimResult = await validateImageDimensions(file.path);
        if (!dimResult.valid) {
          fs.promises.unlink(file.path).catch(() => {});
          return res.status(400).json({
            error: dimResult.reason || "Invalid image dimensions.",
          });
        }
      }
    }
  }

  next();
};
