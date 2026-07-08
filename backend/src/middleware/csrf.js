const { doubleCsrf } = require('csrf-csrf');

if (!process.env.CSRF_SECRET) {
  console.error('FATAL ERROR: CSRF_SECRET environment variable is not set.');
  process.exit(1);
}

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
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
