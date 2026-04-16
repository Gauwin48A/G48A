const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits for CBC

function getKey() {
  const secret = process.env.AADHAAR_AES_SECRET;
  if (!secret || secret === 'change_this_secret') {
    throw new Error('AADHAAR_AES_SECRET must be set to a strong secret in environment variables');
  }
  // Derive a fixed-length key from the secret
  const salt = process.env.AADHAAR_SCRYPT_SALT || 'mhub-aadhaar-salt';
  return crypto.scryptSync(secret, salt, KEY_LENGTH);
}

function maskAadhaar(aadhaar) {
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
}

function encryptAadhaar(aadhaar) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(aadhaar, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Prepend IV so we can decrypt later
  return iv.toString('hex') + ':' + encrypted;
}

function decryptAadhaar(encryptedWithIv) {
  const key = getKey();
  const parts = encryptedWithIv.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted Aadhaar format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { maskAadhaar, encryptAadhaar, decryptAadhaar };
