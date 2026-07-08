const { doubleCsrf } = require('csrf-csrf');

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET || 'fallback-csrf-secret-key-32-chars-long',
  getSessionIdentifier: () => '', // Double submit cookie pattern does not strictly require session IDs
  cookieName: 'csrfToken',
  cookieOptions: {
    httpOnly: false, // Must be false so JS can read it!
    sameSite: process.env.COOKIE_SAME_SITE || 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

module.exports = {
  generateCsrfToken,
  csrfProtection: doubleCsrfProtection,
};
