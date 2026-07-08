const crypto = require('crypto');

// ── Fail-fast: MOBILE_ENCRYPTION_KEY must be set in every environment ────────
if (!process.env.MOBILE_ENCRYPTION_KEY) {
  console.error('FATAL ERROR: MOBILE_ENCRYPTION_KEY environment variable is not set.');
  process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.MOBILE_ENCRYPTION_KEY;

// Generate a 32-byte key from the secret key using SHA-256
const getDerivedKey = () => {
  return crypto.createHash('sha256').update(String(SECRET_KEY)).digest();
};

/**
 * Encrypt cleartext string using AES-256-GCM (authenticated encryption).
 * @param {string} text - Cleartext to encrypt
 * @returns {string} - Combined string "iv_hex:authTag_hex:encrypted_hex"
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const key = getDerivedKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt cipher text of format "iv_hex:authTag_hex:encrypted_hex"
 * @param {string} encryptedText - Encrypted string to decrypt
 * @returns {string|null} - Decrypted cleartext or null if failed
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    const parts = encryptedText.split(':');
    if (parts.length < 3) {
      console.error('[Encryption] Invalid ciphertext format: expected iv:authTag:ciphertext');
      return null;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const content = Buffer.from(parts.slice(2).join(':'), 'hex');
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
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
