const SECRET_KEY = import.meta.env.VITE_MOBILE_ENCRYPTION_KEY || 'default-mobile-secret-key-32-chars-long';

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

// Derive key using SHA-256
const getDerivedKey = async () => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const hash = await window.crypto.subtle.digest('SHA-256', keyData);
  return await window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt cleartext string using AES-256-GCM
 * @param {string} text - Cleartext to encrypt
 * @returns {Promise<string>} - Combined string "iv_hex:authTag_hex:ciphertext_hex"
 */
export const encrypt = async (text) => {
  try {
    const key = await getDerivedKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    
    // encrypt returns ciphertext concatenated with auth tag (16 bytes) at the end
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      encodedText
    );
    
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const ciphertextBytes = encryptedBytes.slice(0, -16);
    const authTagBytes = encryptedBytes.slice(-16);
    
    return `${bytesToHex(iv)}:${bytesToHex(authTagBytes)}:${bytesToHex(ciphertextBytes)}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error.message);
    throw error;
  }
};

/**
 * Decrypt cipher text of format "iv_hex:authTag_hex:ciphertext_hex"
 * @param {string} encryptedText - Encrypted string to decrypt
 * @returns {Promise<string|null>} - Decrypted cleartext or null if failed
 */
export const decrypt = async (encryptedText) => {
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
    
    const key = await getDerivedKey();
    
    // Concatenate ciphertext and auth tag for Web Crypto API
    const combinedBytes = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
    combinedBytes.set(ciphertextBytes, 0);
    combinedBytes.set(authTagBytes, ciphertextBytes.length);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
        tagLength: 128
      },
      key,
      combinedBytes
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error.message);
    return null;
  }
};
