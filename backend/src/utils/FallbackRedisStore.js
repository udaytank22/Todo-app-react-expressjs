const { MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getIsRedisAvailable } = require('../services/redis');

class FallbackRedisStore {
  constructor(redisStoreOpts) {
    this.redisStore = new RedisStore(redisStoreOpts);
    this.memoryStore = new MemoryStore();
  }

  init(options) {
    // Catch initialization errors (like Redis connection refused) to prevent crashing on startup
    if (typeof this.redisStore.init === 'function') {
      const res = this.redisStore.init(options);
      if (res && typeof res.catch === 'function') {
        res.catch(err => {
          console.warn('[RateLimit] Failed to initialize RedisStore on startup (using MemoryStore fallback):', err.message);
        });
      }
    }
    this.memoryStore.init(options);
  }

  async get(key) {
    if (getIsRedisAvailable()) {
      try {
        return await this.redisStore.get(key);
      } catch (err) {
        console.error('[RateLimit] Redis get error, falling back to MemoryStore:', err.message);
      }
    }
    return await this.memoryStore.get(key);
  }

  async increment(key) {
    if (getIsRedisAvailable()) {
      try {
        return await this.redisStore.increment(key);
      } catch (err) {
        console.error('[RateLimit] Redis increment error, falling back to MemoryStore:', err.message);
      }
    }
    return await this.memoryStore.increment(key);
  }

  async decrement(key) {
    if (getIsRedisAvailable()) {
      try {
        return await this.redisStore.decrement(key);
      } catch (err) {
        console.error('[RateLimit] Redis decrement error, falling back to MemoryStore:', err.message);
      }
    }
    return await this.memoryStore.decrement(key);
  }

  async resetKey(key) {
    if (getIsRedisAvailable()) {
      try {
        return await this.redisStore.resetKey(key);
      } catch (err) {
        console.error('[RateLimit] Redis resetKey error, falling back to MemoryStore:', err.message);
      }
    }
    return await this.memoryStore.resetKey(key);
  }

  async resetAll() {
    if (getIsRedisAvailable()) {
      try {
        return await this.redisStore.resetAll();
      } catch (err) {
        console.error('[RateLimit] Redis resetAll error, falling back to MemoryStore:', err.message);
      }
    }
    return await this.memoryStore.resetAll();
  }

  shutdown() {
    if (typeof this.redisStore.shutdown === 'function') {
      this.redisStore.shutdown();
    }
    if (typeof this.memoryStore.shutdown === 'function') {
      this.memoryStore.shutdown();
    }
  }
}

module.exports = { FallbackRedisStore };
