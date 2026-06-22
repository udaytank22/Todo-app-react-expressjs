const crypto = require('crypto');
const CryptoJS = require('crypto-js');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = 'default-mobile-secret-key-32-chars-long';

// Backend logic
const getDerivedKeyBackend = () => {
  return crypto.createHash('sha256').update(String(SECRET_KEY)).digest();
};

function decryptBackend(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const content = Buffer.from(parts.join(':'), 'hex');
    const key = getDerivedKeyBackend();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Frontend logic
const getDerivedKeyFrontend = () => {
  return CryptoJS.SHA256(SECRET_KEY);
};

const encryptFrontend = (text) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = getDerivedKeyFrontend();
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
};

const text = "hello world";
const encrypted = encryptFrontend(text);
const decrypted = decryptBackend(encrypted);
console.log("Encrypted:", encrypted);
console.log("Decrypted:", decrypted);
