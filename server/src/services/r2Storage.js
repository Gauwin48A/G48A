/**
 * Cloudflare R2 Object Storage Service
 * 
 * Provides S3-compatible operations for uploading, downloading, and deleting
 * media files (listing photos, avatars, audio notes) and KYC documents.
 * 
 * Uses AWS SDK v3 S3Client compatible with Cloudflare R2.
 * 
 * Environment Variables Required:
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_KYC_BUCKET_NAME, R2_PUBLIC_URL
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const crypto = require('crypto');

// ── R2 Client Configuration ──────────────────────────────────
const r2Config = {
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
};

const s3Client = new S3Client(r2Config);

const MEDIA_BUCKET = process.env.R2_BUCKET_NAME || 'zaruda-media';
const KYC_BUCKET = process.env.R2_KYC_BUCKET_NAME || 'zaruda-kyc-docs';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// ── Allowed MIME Types ────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);
const ALLOWED_AUDIO_TYPES = new Set([
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
]);
const ALLOWED_KYC_TYPES = new Set([
    'image/jpeg', 'image/png', 'application/pdf',
]);

// ── Helper: Generate unique key ───────────────────────────────
function generateKey(prefix, originalFilename, userId) {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalFilename).toLowerCase();
    return `${prefix}/${userId}/${timestamp}_${randomId}${ext}`;
}

// ── Upload Media (Listing Photos, Avatars, Audio) ─────────────
async function uploadMedia(file, userId, folder = 'posts') {
    const key = generateKey(folder, file.originalname || 'upload.jpg', userId);
    
    const command = new PutObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: key,
        Body: file.buffer || file,
        ContentType: file.mimetype || 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3Client.send(command);
    
    return {
        key,
        url: `${PUBLIC_URL}/${key}`,
        bucket: MEDIA_BUCKET,
    };
}

// ── Upload KYC Document (Aadhaar/PAN) ────────────────────────
async function uploadKycDocument(file, userId, docType = 'aadhaar') {
    const key = generateKey(`kyc/${docType}`, file.originalname || 'doc.pdf', userId);
    
    const command = new PutObjectCommand({
        Bucket: KYC_BUCKET,
        Key: key,
        Body: file.buffer || file,
        ContentType: file.mimetype || 'application/pdf',
        // Private bucket — no public access
    });

    await s3Client.send(command);
    
    return {
        key,
        bucket: KYC_BUCKET,
    };
}

// ── Generate Presigned URL (for secure downloads) ─────────────
async function getSignedDownloadUrl(key, bucket = MEDIA_BUCKET, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

// ── Generate Presigned Upload URL (for client-side uploads) ────
async function getSignedUploadUrl(key, contentType, bucket = MEDIA_BUCKET, expiresIn = 300) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

// ── Delete Object ─────────────────────────────────────────────
async function deleteObject(key, bucket = MEDIA_BUCKET) {
    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    await s3Client.send(command);
    return { deleted: true, key, bucket };
}

// ── Check if Object Exists ────────────────────────────────────
async function objectExists(key, bucket = MEDIA_BUCKET) {
    try {
        const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            return false;
        }
        throw err;
    }
}

// ── Get Public URL ────────────────────────────────────────────
function getPublicUrl(key) {
    return `${PUBLIC_URL}/${key}`;
}

// ── Validate File Type ────────────────────────────────────────
function validateFileType(mimetype, category = 'image') {
    switch (category) {
        case 'image':
            return ALLOWED_IMAGE_TYPES.has(mimetype);
        case 'audio':
            return ALLOWED_AUDIO_TYPES.has(mimetype);
        case 'kyc':
            return ALLOWED_KYC_TYPES.has(mimetype);
        default:
            return false;
    }
}

module.exports = {
    uploadMedia,
    uploadKycDocument,
    getSignedDownloadUrl,
    getSignedUploadUrl,
    deleteObject,
    objectExists,
    getPublicUrl,
    validateFileType,
    MEDIA_BUCKET,
    KYC_BUCKET,
    PUBLIC_URL,
};
