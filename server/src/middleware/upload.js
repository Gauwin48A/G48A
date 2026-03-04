const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let storage;
const uploadDir = path.join(__dirname, "../../uploads/");

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
  "application/xml": ".xml",
  "text/xml": ".xml",
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
  console.log("[Upload] Cloudinary storage enabled");
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

  console.log("[Upload] Local disk storage enabled");
}

const fileFilter = (req, file, cb) => {
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (mimeType.startsWith("image/")) {
    cb(null, true);
  } else if (mimeType.startsWith("audio/")) {
    cb(null, true);
  } else if (mimeType === "application/xml" || mimeType === "text/xml" || mimeType === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, audio, XML, and PDF are allowed."));
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
