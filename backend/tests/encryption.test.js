// Set environment variables before importing target modules
process.env.MOBILE_ENCRYPTION_KEY = 'test-mobile-secret-key-32-chars-long';

const { encrypt, decrypt } = require('../src/utils/encryption');

// Helper to tamper with a hex string without changing its length
const tamperHex = (hex) => {
  if (!hex || hex.length === 0) return hex;
  const firstChar = hex[0];
  // Replace first character with a different hex character
  const replacement = firstChar === 'a' ? 'b' : 'a';
  return replacement + hex.substring(1);
};

describe('Encryption Utils (AES-256-GCM)', () => {
  test('should successfully encrypt and decrypt a message (round-trip)', () => {
    const originalText = 'hello security phase 4';
    const encrypted = encrypt(originalText);
    
    // Encrypted string format should be: iv_hex:authTag_hex:encrypted_hex
    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  test('should return null when decrypting empty or malformed input', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt('')).toBeNull();
    expect(decrypt('no-colons-here')).toBeNull();
    expect(decrypt('short:input')).toBeNull(); // less than 3 parts
  });

  test('should fail decryption (return null) if ciphertext is tampered', () => {
    const originalText = 'confidential information';
    const encrypted = encrypt(originalText);
    const parts = encrypted.split(':');
    
    // Modify one byte in the ciphertext part (third part) without changing length
    const tamperedCiphertext = tamperHex(parts[2]);
    const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
    
    const decrypted = decrypt(tamperedEncrypted);
    expect(decrypted).toBeNull();
  });

  test('should fail decryption (return null) if auth tag is tampered', () => {
    const originalText = 'confidential information';
    const encrypted = encrypt(originalText);
    const parts = encrypted.split(':');
    
    // Modify one byte in the auth tag part (second part) without changing length
    const tamperedAuthTag = tamperHex(parts[1]);
    const tamperedEncrypted = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;
    
    const decrypted = decrypt(tamperedEncrypted);
    expect(decrypted).toBeNull();
  });

  test('should fail decryption (return null) if IV is tampered', () => {
    const originalText = 'confidential information';
    const encrypted = encrypt(originalText);
    const parts = encrypted.split(':');
    
    // Modify one byte in the IV part (first part) without changing length
    const tamperedIv = tamperHex(parts[0]);
    const tamperedEncrypted = `${tamperedIv}:${parts[1]}:${parts[2]}`;
    
    const decrypted = decrypt(tamperedEncrypted);
    expect(decrypted).toBeNull();
  });
});
