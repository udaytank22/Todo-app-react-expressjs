// Set environment variables before importing target modules
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/db';

const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../src/middleware/auth');
const { prisma } = require('../src/services/db');
const { getPubClient, getIsRedisAvailable } = require('../src/services/redis');

// Mock services
jest.mock('../src/services/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../src/services/redis', () => ({
  getPubClient: jest.fn(),
  getIsRedisAvailable: jest.fn(),
}));

describe('Auth Middleware', () => {
  let req, res, next, mockRedisClient;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      query: {},
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    };

    const authMiddleware = require('../src/middleware/auth');
    if (authMiddleware._fallbackCache) {
      authMiddleware._fallbackCache.clear();
    }
  });

  describe('authenticateToken', () => {
    test('should return 401 if authorization header is missing', async () => {
      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required. Please log in.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if token is invalid or malformed', async () => {
      req.headers['authorization'] = 'Bearer invalid-token-value';

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired session token. Please log in again.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token has expired', async () => {
      const expiredToken = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET, { expiresIn: '0s' });
      // Wait briefly to ensure expiration
      await new Promise(r => setTimeout(r, 10));

      req.headers['authorization'] = `Bearer ${expiredToken}`;

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'token_expired',
        message: 'Access token has expired.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should authenticate via cookie token if Authorization header is missing', async () => {
      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
      req.cookies.token = token;

      const cachedUser = { id: 'user-123', email: 'test@example.com', role: 'STAFF' };

      getIsRedisAvailable.mockReturnValue(true);
      getPubClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

      await authenticateToken(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123');
      expect(req.user).toEqual(cachedUser);
      expect(next).toHaveBeenCalled();
    });

    test('should authenticate user and pass to next() on Redis cache hit', async () => {
      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      const cachedUser = { id: 'user-123', email: 'test@example.com', role: 'STAFF' };

      getIsRedisAvailable.mockReturnValue(true);
      getPubClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

      await authenticateToken(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(req.user).toEqual(cachedUser);
      expect(next).toHaveBeenCalled();
    });

    test('should fetch user from database and update cache on Redis cache miss', async () => {
      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      const dbUser = { id: 'user-123', email: 'test@example.com', role: 'STAFF', name: 'Test User' };

      getIsRedisAvailable.mockReturnValue(true);
      getPubClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue(null); // Cache miss
      prisma.user.findUnique.mockResolvedValue(dbUser);

      await authenticateToken(req, res, next);

      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, email: true, name: true, role: true, teams: true },
      });
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('user:user-123', 300, JSON.stringify(dbUser));
      expect(req.user).toEqual(dbUser);
      expect(next).toHaveBeenCalled();
    });

    test('should fallback to in-memory cache hit when Redis is not available', async () => {
      const token = jwt.sign({ id: 'user-456' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      const dbUser = { id: 'user-456', email: 'test456@example.com', role: 'MANAGER', name: 'User 456' };

      getIsRedisAvailable.mockReturnValue(false); // Redis disabled
      prisma.user.findUnique.mockResolvedValue(dbUser);

      // First request (Cache miss)
      await authenticateToken(req, res, next);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();

      // Second request (In-memory cache hit)
      next.mockClear();
      prisma.user.findUnique.mockClear();
      await authenticateToken(req, res, next);
      expect(prisma.user.findUnique).not.toHaveBeenCalled(); // Cached in memory!
      expect(next).toHaveBeenCalled();
    });

    test('should evict oldest cache entry when in-memory cache exceeds MAX_CACHE_SIZE limit', async () => {
      getIsRedisAvailable.mockReturnValue(false);
      
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn((token) => ({ id: token }));

      prisma.user.findUnique.mockImplementation(({ where }) => Promise.resolve({
        id: where.id,
        email: `${where.id}@example.com`,
        role: 'STAFF',
        name: `User ${where.id}`
      }));

      // Authenticate 1001 users to exceed MAX_CACHE_SIZE (1000)
      for (let i = 1; i <= 1001; i++) {
        req.headers['authorization'] = `Bearer user-${i}`;
        next.mockClear();
        await authenticateToken(req, res, next);
      }

      // But 'user-2' (the second oldest) should still be in cache.
      prisma.user.findUnique.mockClear();
      req.headers['authorization'] = `Bearer user-2`;
      next.mockClear();
      await authenticateToken(req, res, next);
      expect(prisma.user.findUnique).not.toHaveBeenCalled(); // cache hit!

      // The first user 'user-1' should be evicted from the fallbackCache.
      // If we request 'user-1' again, it should query the database (cache miss).
      prisma.user.findUnique.mockClear();
      req.headers['authorization'] = `Bearer user-1`;
      next.mockClear();
      await authenticateToken(req, res, next);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1); // queried DB again (cache miss!)

      jwt.verify = originalVerify;
    });

    test('should fallback to database when Redis throws an error on GET', async () => {
      const token = jwt.sign({ id: 'user-789' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      const dbUser = { id: 'user-789', email: 'test789@example.com', role: 'STAFF', name: 'User 789' };

      getIsRedisAvailable.mockReturnValue(true);
      getPubClient.mockReturnValue(mockRedisClient);
      
      // Redis get throws a connection closed error
      mockRedisClient.get.mockRejectedValue(new Error('ClientClosedError: The client is closed'));
      prisma.user.findUnique.mockResolvedValue(dbUser);

      await authenticateToken(req, res, next);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual(dbUser);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user does not exist in DB/cache', async () => {
      const token = jwt.sign({ id: 'non-existent' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      getIsRedisAvailable.mockReturnValue(false);
      prisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User account not found or has been disabled.',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorizeRoles', () => {
    test('should pass next() if user role is in the allowed roles list', () => {
      req.user = { id: 'user-1', role: 'ADMIN' };
      const middleware = authorizeRoles(['ADMIN', 'MANAGER']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should pass next() using case-insensitive role match', () => {
      req.user = { id: 'user-1', role: 'manager' };
      const middleware = authorizeRoles(['ADMIN', 'MANAGER']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user role is not in the allowed roles list', () => {
      req.user = { id: 'user-1', role: 'STAFF' };
      const middleware = authorizeRoles(['ADMIN', 'MANAGER']);

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Access Denied: Your role 'STAFF' is not authorized to access this resource.",
      });
    });

    test('should return 401 if req.user is missing', () => {
      const middleware = authorizeRoles(['ADMIN']);

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
