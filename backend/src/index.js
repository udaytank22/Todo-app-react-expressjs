require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Services
const { initRedis, getPubClient, getIsRedisAvailable, disconnectRedis } = require('./services/redis');
const { initSocket } = require('./services/socket');
const { emitNewInquiry, emitNewNotification } = require('./services/socket');
const prisma = require('./services/db');

// Route modules
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const customerAssignmentRoutes = require('./routes/customerAssignmentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const searchRoutes = require('./routes/searchRoutes');
const { prometheus, metricsMiddleware, checkHealth } = require('./utils/monitoring');
const logger = require('./utils/logger');
const encryptionMiddleware = require('./middleware/encryption');


// Utils / External services
const { isConnected, fetchEmails } = require('./services/outlook');
const { findAssignedUser } = require('./utils/assignmentEngine');
const { startEmailSyncWorker, stopEmailSyncWorker } = require('./workers/emailSyncWorker');

// ── App & Server ──────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Auto Email Sync Background Worker ────────────────────────────────────────
// The email auto-sync logic has been extracted to a dedicated Bull queue worker
// in `workers/emailSyncWorker.js` (Phase 2).


// ── Async Server Bootstrap ────────────────────────────────────────────────────
const startServer = async () => {
  // ── 1. Connect to Redis (graceful fallback if unavailable) ──────────────
  const { pubClient, subClient } = await initRedis();

  // ── 2. Initialize Socket.IO (Redis adapter if available) ────────────────
  initSocket(server, pubClient, subClient);

  // ── 3. Security Headers (Helmet) ────────────────────────────────────────
  app.use(
    helmet({
      // Allow cross-origin resource loading (needed for /uploads static files)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Disable CSP — this is a pure API server; CSP is handled by the frontend
      contentSecurityPolicy: false,
    })
  );

  // ── 4. CORS ─────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-client-device', 'x-client-encrypted'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(encryptionMiddleware);
  app.use(express.static(path.join(__dirname, '../public')));

  // Prometheus metrics middleware
  app.use(metricsMiddleware);

  // Trust X-Forwarded-For when running behind Nginx or a load balancer
  app.set('trust proxy', 1);

  // ── 5. Rate Limiting (Redis-backed or in-memory fallback) ───────────────
  /**
   * Build a rate limiter that uses the Redis store when Redis is connected,
   * or falls back to the default in-memory store for single-instance use.
   */
  const buildRateLimiter = (opts) => {
    const redisClient = getPubClient();
    // Destructure out keyPrefix so it is never passed to express-rate-limit
    // (express-rate-limit v8 does not accept it — it belongs in RedisStore only)
    const { keyPrefix, ...rateLimitOpts } = opts;
    if (redisClient && getIsRedisAvailable()) {
      return rateLimit({
        ...rateLimitOpts,
        store: new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
          prefix: keyPrefix || 'rl:',
        }),
      });
    }
    // In-memory fallback (works per-process — fine for single instance)
    return rateLimit(rateLimitOpts);
  };

  const apiLimiter = buildRateLimiter({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyPrefix: 'rl:api:',       // Only used by RedisStore prefix
    message: { error: 'Too many requests. Please try again later.' },
  });

  const authLimiter = buildRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyPrefix: 'rl:auth:',      // Only used by RedisStore prefix
    message: { error: 'Too many login attempts. Please try again later.' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // ── 6. Static File Serving ───────────────────────────────────────────────
  const uploadDir = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadDir));

  // ── 7. Health Check (enhanced) ───────────────────────────────────────────

  // ── 8. API Routes ────────────────────────────────────────────────────────
  // Mount Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/customer-assignments', customerAssignmentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/search', searchRoutes);

  // --- Observability Endpoints ---
  app.get('/health', async (req, res) => {
    const checks = await checkHealth();
    res.status(checks.status === 'OK' ? 200 : 503).json(checks);
  });

  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(await prometheus.register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // ── 9. 404 Handler ───────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });

  // ── 10. Global Error Handler ─────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err.stack || err.message);
    res.status(err.status || 500).json({
      error: err.message || 'An internal server error occurred.',
    });
  });

  // ── 11. Start Listening ──────────────────────────────────────────────────
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log('==================================================');
    console.log('  AI Task & Email Inquiry Manager — Server Ready  ');
    console.log(`  Port        : ${PORT}`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Demo Mode   : ${process.env.DEMO_MODE === 'true' ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`  Redis       : ${getIsRedisAvailable() ? '✓ Connected' : '✗ Unavailable (in-memory fallback)'}`);
    console.log('==================================================');

    // Start background email sync polling
    startEmailSyncWorker();
  });

  // ── 12. Graceful Shutdown ────────────────────────────────────────────────
  const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new HTTP connections
    server.close(async () => {
      console.log('[Server] HTTP server closed — no new connections accepted.');

      // Stop polling emails
      stopEmailSyncWorker();

      try {
        await prisma.$disconnect();
        console.log('[Server] Database pool disconnected.');
      } catch (dbErr) {
        console.error('[Server] Error disconnecting database:', dbErr.message);
      }

      // Disconnect Redis clients
      await disconnectRedis();

      console.log('[Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (e.g. stuck DB query)
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timed out — forcing exit.');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
