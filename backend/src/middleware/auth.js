const jwt = require('jsonwebtoken');
const prisma = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';

// In-memory user cache: { [userId]: { user, expiresAt } }
const userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Expecting: "Bearer <token>"

  // Fallback to query parameter token (useful for standard HTML <a> link downloads)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check cache first
    const cached = userCache.get(decoded.id);
    let user;
    if (cached && cached.expiresAt > Date.now()) {
      user = cached.user;
    } else {
      // Verify user still exists in the database
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true }
      });
      if (user) {
        userCache.set(decoded.id, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
      }
    }

    if (!user) {
      userCache.delete(decoded.id);
      return res.status(403).json({ error: 'User account not found or has been disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT Verification error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
};

/**
 * Middleware to authorize requests based on user roles
 * @param {string[]} allowedRoles - List of roles that are allowed access (e.g., ['ADMIN', 'MANAGER'])
 */
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase());

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: Your role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};
