
import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

// Hardcoded default matching backend .env file.
// In a real production build, this would be injected via react-native-config or similar.
const SECRET_KEY = 'super_secure_mobile_encrypt_key_32_chars';

const getDerivedKey = () => {
  return CryptoJS.SHA256(SECRET_KEY);
};

/**
 * Generate cryptographically secure random bytes if available, or fall back to Math.random
 */
const generateRandomBytes = (size) => {
  try {
    const cryptoObj = (typeof global !== 'undefined' && global.crypto) || (typeof window !== 'undefined' && window.crypto);
    if (cryptoObj && cryptoObj.getRandomValues) {
      const array = new Uint8Array(size);
      cryptoObj.getRandomValues(array);
      const words = [];
      for (let i = 0; i < size; i += 4) {
        words.push(
          (array[i] << 24) |
          (array[i + 1] << 16) |
          (array[i + 2] << 8) |
          array[i + 3]
        );
      }
      return CryptoJS.lib.WordArray.create(words, size);
    }
  } catch (err) {
    console.warn('[Encryption] Failed to use secure random generator:', err.message);
  }

  // Fallback to Math.random (failsafe)
  console.warn('[Encryption] Secure random values not available. Falling back to Math.random.');
  const words = [];
  for (let i = 0; i < size; i += 4) {
    words.push((Math.random() * 0x100000000) | 0);
  }
  return CryptoJS.lib.WordArray.create(words, size);
};

/**
 * Encrypt cleartext string using AES-256-CBC
 * @param {string} text - Cleartext string
 * @returns {string} - "iv_hex:encrypted_hex"
 */
export function encrypt(text) {
  try {
    const key = getDerivedKey();
    const iv = generateRandomBytes(16);
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const ivHex = iv.toString(CryptoJS.enc.Hex);
    const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    return `${ivHex}:${encryptedHex}`;
  } catch (error) {
    console.error('[Encryption] Mobile encryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt cipher text of format "iv_hex:encrypted_hex"
 * @param {string} encryptedText - Encrypted string
 * @returns {string|null} - Decrypted cleartext or null
 */
export function decrypt(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    const parts = encryptedText.split(':');
    const ivHex = parts.shift();
    const encryptedHex = parts.join(':');

    const key = getDerivedKey();
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedHex);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('[Encryption] Mobile decryption failed:', error.message);
    return null;
  }
}
