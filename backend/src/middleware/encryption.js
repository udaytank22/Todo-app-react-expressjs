const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Express middleware to handle end-to-end request body decryption
 * and response body encryption for mobile clients.
 */
const encryptionMiddleware = (req, res, next) => {
  const isMobile = req.headers['x-client-device'] === 'mobile';

  // 1. Decrypt incoming requests from mobile clients if there is an encrypted body
  if (isMobile && req.body && req.body.encryptedData) {
    const decrypted = decrypt(req.body.encryptedData);
    if (decrypted) {
      try {
        req.body = JSON.parse(decrypted);
      } catch (err) {
        console.error('[Encryption Middleware] Failed to parse decrypted JSON:', err.message);
        return res.status(400).json({ error: 'Malformed encrypted JSON payload.' });
      }
    } else {
      console.error('[Encryption Middleware] Request body decryption failed.');
      return res.status(400).json({ error: 'Failed to decrypt request payload.' });
    }
  }

  // 2. Intercept res.json to automatically encrypt responses for mobile clients
  if (isMobile) {
    const originalJson = res.json;

    res.json = function (body) {
      // Don't double encrypt
      if (body && body.encryptedData) {
        return originalJson.call(this, body);
      }

      try {
        const payloadStr = JSON.stringify(body);
        const encryptedData = encrypt(payloadStr);
        return originalJson.call(this, { encryptedData });
      } catch (err) {
        console.error('[Encryption Middleware] Response encryption failed:', err.message);
        // Fall back to sending error in plaintext/JSON or fail closed?
        // Failing closed is more secure for an encrypted communications requirement.
        return originalJson.call(this, { error: 'Failed to encrypt response payload.' });
      }
    };
  }

  next();
};

module.exports = encryptionMiddleware;
