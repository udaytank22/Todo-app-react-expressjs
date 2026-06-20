const prometheus = require('prom-client');
const { prisma } = require('../services/db');
const { redis } = require('../services/cache');
const { isConnected } = require('../services/outlook');

// Setup prometheus default metrics (CPU, Memory, etc.)
prometheus.collectDefaultMetrics();

// HTTP Request Duration Histogram
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// WebSocket active connections Gauge
const wsConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
});

// Middleware to track HTTP requests
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpDuration.labels(req.method, route, res.statusCode).observe(duration);
  });
  next();
};

// Deep Health Check function
const checkHealth = async () => {
  const checks = {
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      outlook: isConnected() ? 'connected' : 'disconnected',
    }
  };
  
  // DB Check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (err) {
    checks.checks.database = 'unhealthy';
    checks.status = 'DEGRADED';
  }
  
  // Redis Check
  try {
    if (redis.isReady) {
      await redis.ping();
      checks.checks.redis = 'healthy';
    } else {
      checks.checks.redis = 'unhealthy';
      checks.status = 'DEGRADED';
    }
  } catch (err) {
    checks.checks.redis = 'unhealthy';
    checks.status = 'DEGRADED';
  }
  
  return checks;
};

module.exports = {
  prometheus,
  metricsMiddleware,
  wsConnections,
  checkHealth
};
