const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = createClient({ 
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn('⚠️ Redis not found. Running in degraded mode without cache.');
        return false; // Stop retrying
      }
      return 500; // Retry after 500ms
    }
  }
});

let isRedisErrorLogged = false;
redis.on('error', (err) => {
  if (!isRedisErrorLogged) {
    console.log('Redis connection issue:', err.message);
    isRedisErrorLogged = true;
  }
});
redis.connect().catch(() => {});

const cache = {
  /**
   * Get value from cache
   * @param {string} key 
   * @returns {any}
   */
  async get(key) {
    if (!redis.isReady) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Cache GET error for key ${key}:`, err);
      return null;
    }
  },
  
  /**
   * Set value in cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds 
   */
  async set(key, value, ttlSeconds = 60) {
    if (!redis.isReady) return;
    try {
      await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error(`Cache SET error for key ${key}:`, err);
    }
  },
  
  /**
   * Delete keys matching a pattern
   * @param {string} pattern 
   */
  async invalidate(pattern) {
    if (!redis.isReady) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (err) {
      console.error(`Cache INVALIDATE error for pattern ${pattern}:`, err);
    }
  },
};

module.exports = { redis, cache };
