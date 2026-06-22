const CryptoJS = require('crypto-js');

const SECRET_KEY = 'default-mobile-secret-key-32-chars-long';

const getDerivedKey = () => {
  return CryptoJS.SHA256(SECRET_KEY);
};

const encrypt = (text) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = getDerivedKey();
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
};

const data = JSON.stringify({ email: "admin@manager.com", password: "password123" });
console.log(encrypt(data));
