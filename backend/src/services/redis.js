const { createClient } = require('redis');

let pubClient = null;
let subClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis pub/sub clients.
 * Falls back gracefully if Redis is not running — the app keeps working
 * with in-memory fallbacks for rate limiting and Socket.IO.
 *
 * @returns {{ pubClient, subClient, isRedisAvailable }}
 */
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    pubClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries >= 3) {
            console.warn('[Redis] Max reconnect attempts reached. Switching to in-memory fallback.');
            return false; // stop retrying
          }
          return Math.min(retries * 200, 2000);
        },
      },
    });

    pubClient.on('connect', () => {
      console.log('[Redis] Socket connected.');
    });

    pubClient.on('ready', () => {
      isRedisAvailable = true;
      console.log('[Redis] Connection ready & ready to receive commands.');
    });

    pubClient.on('reconnecting', () => {
      console.log('[Redis] Attempting to reconnect...');
    });

    pubClient.on('error', (err) => {
      // Only log once Redis was previously working to avoid flooding the console
      if (isRedisAvailable) {
        console.warn('[Redis] Connection error:', err.message);
      }
      isRedisAvailable = false;
    });

    pubClient.on('end', () => {
      console.warn('[Redis] Connection ended.');
      isRedisAvailable = false;
    });

    await pubClient.connect();

    // Create a duplicate client for the Socket.IO subscribe channel
    subClient = pubClient.duplicate();
    await subClient.connect();

    isRedisAvailable = true;
    console.log('[Redis] Connected successfully →', redisUrl);

    return { pubClient, subClient, isRedisAvailable: true };
  } catch (err) {
    console.warn(
      `[Redis] Not available (${err.message}). Rate limiting and Socket.IO adapter will use in-memory fallback.`
    );

    // Clean up any partially connected clients
    try {
      if (pubClient && pubClient.isOpen) await pubClient.quit();
    } catch (_) {}
    try {
      if (subClient && subClient.isOpen) await subClient.quit();
    } catch (_) {}

    pubClient = null;
    subClient = null;
    isRedisAvailable = false;

    return { pubClient: null, subClient: null, isRedisAvailable: false };
  }
};

/** Get the publish Redis client (or null if unavailable) */
const getPubClient = () => pubClient;

/** Get the subscribe Redis client (or null if unavailable) */
const getSubClient = () => subClient;

/** Returns true when Redis is connected and healthy */
const getIsRedisAvailable = () => isRedisAvailable;

/**
 * Gracefully disconnect both Redis clients.
 * Call this during server shutdown.
 */
const disconnectRedis = async () => {
  try {
    if (pubClient && pubClient.isOpen) {
      await pubClient.quit();
      console.log('[Redis] Publisher client disconnected.');
    }
    if (subClient && subClient.isOpen) {
      await subClient.quit();
      console.log('[Redis] Subscriber client disconnected.');
    }
  } catch (err) {
    console.error('[Redis] Error during disconnect:', err.message);
  } finally {
    pubClient = null;
    subClient = null;
    isRedisAvailable = false;
  }
};

module.exports = {
  initRedis,
  getPubClient,
  getSubClient,
  getIsRedisAvailable,
  disconnectRedis,
};
