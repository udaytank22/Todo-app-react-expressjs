const crypto = require('crypto');
const http = require('http');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = 'default-mobile-secret-key-32-chars-long';

const getDerivedKey = () => {
  return crypto.createHash('sha256').update(String(SECRET_KEY)).digest();
};

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const content = Buffer.from(parts.join(':'), 'hex');
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

const payload = JSON.stringify({ email: "admin@manager.com", password: "admin123" });
const reqData = JSON.stringify({ encryptedData: encrypt(payload) });

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-device': 'mobile',
    'x-client-encrypted': 'true',
    'Content-Length': Buffer.byteLength(reqData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Raw body:', body);
    try {
      const parsed = JSON.parse(body);
      if (parsed.encryptedData) {
        console.log('Decrypted:', decrypt(parsed.encryptedData));
      } else {
        console.log('Plaintext:', parsed);
      }
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(reqData);
req.end();
