import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import { gcm } from '@noble/ciphers/aes';

const SECRET_KEY = 'super_secure_mobile_encrypt_key_32_chars';

// Helper to convert hex string to Uint8Array
const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

// Helper to convert Uint8Array to hex string
const bytesToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

const getDerivedKey = () => {
  const keyHash = CryptoJS.SHA256(SECRET_KEY);
  return hexToBytes(CryptoJS.enc.Hex.stringify(keyHash));
};

const stringToBytes = (str) => {
  const parsed = CryptoJS.enc.Utf8.parse(str);
  return hexToBytes(CryptoJS.enc.Hex.stringify(parsed));
};

const bytesToString = (bytes) => {
  const hex = bytesToHex(bytes);
  const parsed = CryptoJS.enc.Hex.parse(hex);
  return CryptoJS.enc.Utf8.stringify(parsed);
};

/**
 * Encrypt cleartext string using AES-256-GCM
 * @param {string} text - Cleartext string
 * @returns {string} - "iv_hex:authTag_hex:encrypted_hex"
 */
export function encrypt(text) {
  try {
    const key = getDerivedKey();
    
    // Generate a secure 12-byte IV (nonce) for GCM
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    
    // Convert plaintext string to Uint8Array
    const plaintextBytes = stringToBytes(text);
    
    // Encrypt
    const aesGcm = gcm(key, iv);
    const encryptedBytes = aesGcm.encrypt(plaintextBytes);
    
    // Extract ciphertext and auth tag (last 16 bytes)
    const ciphertextBytes = encryptedBytes.slice(0, -16);
    const authTagBytes = encryptedBytes.slice(-16);
    
    return `${bytesToHex(iv)}:${bytesToHex(authTagBytes)}:${bytesToHex(ciphertextBytes)}`;
  } catch (error) {
    console.error('[Encryption] Mobile encryption failed:', error.message);
    throw error;
  }
}

/**
 * Decrypt cipher text of format "iv_hex:authTag_hex:encrypted_hex"
 * @param {string} encryptedText - Encrypted string
 * @returns {string|null} - Decrypted cleartext or null
 */
export function decrypt(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return null;
    }
    const parts = encryptedText.split(':');
    if (parts.length < 3) {
      console.error('[Encryption] Invalid ciphertext format: expected iv:authTag:ciphertext');
      return null;
    }

    const ivBytes = hexToBytes(parts[0]);
    const authTagBytes = hexToBytes(parts[1]);
    const ciphertextBytes = hexToBytes(parts[2]);

    const key = getDerivedKey();

    // Concatenate ciphertext and auth tag for decryption
    const combinedBytes = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
    combinedBytes.set(ciphertextBytes, 0);
    combinedBytes.set(authTagBytes, ciphertextBytes.length);

    const aesGcm = gcm(key, ivBytes);
    const decryptedBytes = aesGcm.decrypt(combinedBytes);
    
    return bytesToString(decryptedBytes);
  } catch (error) {
    console.error('[Encryption] Mobile decryption failed:', error.message);
    return null;
  }
}
