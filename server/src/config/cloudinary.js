const cloudinary = require("cloudinary").v2;
const path = require("path");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_FOLDER = process.env.CLOUDINARY_FOLDER || "mhub_uploads";
const DEFAULT_IMAGE_TRANSFORMATION = [
  { width: 1920, crop: "limit" },
  { quality: "auto", fetch_format: "auto" },
];

const resolveResourceType = (mimeType = "") => {
  const normalizedMime = String(mimeType).toLowerCase();
  if (normalizedMime.startsWith("image/")) return "image";
  if (normalizedMime.startsWith("audio/") || normalizedMime.startsWith("video/")) return "video";
  return "raw";
};

const resolveUploadFormat = (file = {}) => {
  const ext = path.extname(String(file.originalname || "")).toLowerCase().replace(/^\./, "");
  return ext || undefined;
};

const createCloudinaryStorage = () => ({
  _handleFile(req, file, cb) {
    const resourceType = resolveResourceType(file?.mimetype);
    const uploadOptions = {
      folder: DEFAULT_FOLDER,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
    };

    if (resourceType === "image") {
      uploadOptions.transformation = DEFAULT_IMAGE_TRANSFORMATION;
      const format = resolveUploadFormat(file);
      if (format) {
        uploadOptions.format = format;
      }
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        cb(error);
        return;
      }

      cb(null, {
        path: result.secure_url || result.url,
        url: result.secure_url || result.url,
        filename: result.public_id,
        public_id: result.public_id,
        size: result.bytes,
        format: result.format,
        resource_type: result.resource_type,
      });
    });

    file.stream.pipe(uploadStream);
  },

  _removeFile(req, file, cb) {
    const publicId = file?.public_id;
    if (!publicId) {
      cb(null);
      return;
    }

    const resourceType = file?.resource_type || resolveResourceType(file?.mimetype);
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error) => {
      cb(error || null);
    });
  },
});

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("[Cloudinary] Image deleted:", publicId);
    return result;
  } catch (error) {
    console.error("[Cloudinary] Delete failed:", error);
    throw error;
  }
};

const getOptimizedUrl = (publicId, options = {}) =>
  cloudinary.url(publicId, {
    fetch_format: "auto",
    quality: "auto",
    ...options,
  });

module.exports = {
  cloudinary,
  cloudinaryStorage: createCloudinaryStorage(),
  createCloudinaryStorage,
  deleteImage,
  getOptimizedUrl,
};
