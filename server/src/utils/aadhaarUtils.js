const crypto = require('crypto');
const AES_SECRET = process.env.AADHAAR_AES_SECRET || 'change_this_secret';

function maskAadhaar(aadhaar) {
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
}

function encryptAadhaar(aadhaar) {
  const cipher = crypto.createCipher('aes-256-cbc', AES_SECRET);
  let encrypted = cipher.update(aadhaar, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptAadhaar(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', AES_SECRET);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { maskAadhaar, encryptAadhaar, decryptAadhaar };
