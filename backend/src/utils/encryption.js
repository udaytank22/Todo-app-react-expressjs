const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.MOBILE_ENCRYPTION_KEY || 'default-mobile-secret-key-32-chars-long'; // Fallback for dev

// Generate a 32-byte key from the secret key using SHA-256
const getDerivedKey = () => {
  return crypto.createHash('sha256').update(String(SECRET_KEY)).digest();
};

/**
 * Encrypt cleartext string using AES-256-CBC
 * @param {string} text - Cleartext to encrypt
 * @returns {string} - Combined string "iv_hex:encrypted_hex"
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const key = getDerivedKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt cipher text of format "iv_hex:encrypted_hex"
 * @param {string} encryptedText - Encrypted string to decrypt
 * @returns {string|null} - Decrypted cleartext or null if failed
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const content = Buffer.from(parts.join(':'), 'hex');
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
