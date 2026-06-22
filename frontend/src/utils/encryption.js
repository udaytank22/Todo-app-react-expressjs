import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_MOBILE_ENCRYPTION_KEY || 'default-mobile-secret-key-32-chars-long'; // Fallback for dev

// Generate a 32-byte key from the secret key using SHA-256
const getDerivedKey = () => {
  return CryptoJS.SHA256(SECRET_KEY);
};

/**
 * Encrypt cleartext string using AES-256-CBC
 * @param {string} text - Cleartext to encrypt
 * @returns {string} - Combined string "iv_hex:encrypted_hex"
 */
export const encrypt = (text) => {
  try {
    const iv = CryptoJS.lib.WordArray.random(16);
    const key = getDerivedKey();
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error.message);
    throw error;
  }
};

/**
 * Decrypt cipher text of format "iv_hex:encrypted_hex"
 * @param {string} encryptedText - Encrypted string to decrypt
 * @returns {string|null} - Decrypted cleartext or null if failed
 */
export const decrypt = (encryptedText) => {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    const parts = encryptedText.split(':');
    const iv = CryptoJS.enc.Hex.parse(parts[0]);
    const ciphertext = CryptoJS.enc.Hex.parse(parts[1]);
    
    const key = getDerivedKey();
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext
    });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error.message);
    return null;
  }
};
