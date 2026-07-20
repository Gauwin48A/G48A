/**
 * Cloudflare R2 client service using S3 Client SDK
 * 
 * Supports:
 * - Production Mode: Uploads to configured R2 bucket via S3 API.
 * - Mock Mode: Bypasses uploading and keeps the local path if keys are absent.
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const isR2Configured = () => {
  return Boolean(
    R2_ENDPOINT.trim() &&
    R2_ACCESS_KEY_ID.trim() &&
    R2_SECRET_ACCESS_KEY.trim() &&
    R2_BUCKET_NAME.trim()
  );
};

let s3Client = null;

if (isR2Configured()) {
  s3Client = new S3Client({
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    region: "auto",
    signatureVersion: "v4",
  });
  logger.info("[Storage] Cloudflare R2 client initialized successfully");
} else {
  logger.info("[Storage] R2 keys are not configured. Running in Mock Storage mode (local file system)");
}

/**
 * Upload a local file to Cloudflare R2
 * @param {string} localFilePath - Path to the file on local disk
 * @param {string} fileName - Destination filename
 * @param {string} mimeType - The mimetype of the file
 * @returns {Promise<string>} The public URL of the uploaded asset
 */
async function uploadFile(localFilePath, fileName, mimeType) {
  if (!s3Client) {
    logger.info(`[Storage Mock] Bypassing R2 upload for ${fileName}. Returning local path.`);
    // In mock/development mode, we assume files remain in the local uploads directory.
    return `/uploads/optimized/${fileName}`;
  }

  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const key = `uploads/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);
    logger.info(`[Storage] Successfully uploaded ${fileName} to R2 bucket: ${R2_BUCKET_NAME}`);

    // If a custom CDN/Public URL is defined (e.g. https://cdn.mhub.in), use it.
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
    }

    // Fallback to direct R2 endpoint URL
    const cleanEndpoint = R2_ENDPOINT.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${R2_BUCKET_NAME}.${cleanEndpoint}/${key}`;
  } catch (error) {
    logger.error("[Storage R2 Error]", error);
    throw new Error(`Cloudflare R2 upload failed: ${error.message}`);
  }
}

module.exports = {
  uploadFile,
  isR2Configured,
};
