const jwt = require('jsonwebtoken');
const { prisma } = require('../services/db');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory fallback if Redis is unavailable
const fallbackCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const USER_CACHE_TTL_SEC = 5 * 60; // 5 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * Add user session to fallbackCache with proactive pruning and FIFO eviction.
 */
const setInFallbackCache = (key, value) => {
  const now = Date.now();
  // Proactively prune expired entries
  for (const [k, val] of fallbackCache.entries()) {
    if (val.expiresAt <= now) {
      fallbackCache.delete(k);
    }
  }

  // Evict oldest entry if size is exceeded
  if (fallbackCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = fallbackCache.keys().next().value;
    if (oldestKey !== undefined) {
      fallbackCache.delete(oldestKey);
    }
  }

  fallbackCache.set(key, { user: value, expiresAt: now + USER_CACHE_TTL_MS });
};

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
    const { getPubClient, getIsRedisAvailable } = require('../services/redis');
    const redisClient = getPubClient();

    let user;

    if (redisClient && getIsRedisAvailable()) {
      // Use Redis
      const cached = await redisClient.get(`user:${decoded.id}`);
      if (cached) {
        user = JSON.parse(cached);
      } else {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, name: true, role: true, teams: true }
        });
        if (user) {
          await redisClient.setEx(`user:${decoded.id}`, USER_CACHE_TTL_SEC, JSON.stringify(user));
        }
      }
    } else {
      // Fallback to in-memory
      const cached = fallbackCache.get(decoded.id);
      if (cached && cached.expiresAt > Date.now()) {
        user = cached.user;
      } else {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, name: true, role: true, teams: true }
        });
        if (user) {
          setInFallbackCache(decoded.id, user);
        }
      }
    }

    if (!user) {
      if (redisClient && getIsRedisAvailable()) await redisClient.del(`user:${decoded.id}`);
      else fallbackCache.delete(decoded.id);
      
      return res.status(403).json({ error: 'User account not found or has been disabled.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT Verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token_expired', message: 'Access token has expired.' });
    }
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
  _fallbackCache: fallbackCache,
};
