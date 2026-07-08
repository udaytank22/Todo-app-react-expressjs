const { FallbackRedisStore } = require('../src/utils/FallbackRedisStore');
const { getIsRedisAvailable } = require('../src/services/redis');
const rateLimit = require('express-rate-limit');
const express = require('express');
const request = require('supertest');

// Mock the redis service
jest.mock('../src/services/redis', () => ({
  getIsRedisAvailable: jest.fn(),
}));

// Mock rate-limit-redis to avoid real Redis initialization and Lua script loading
const mockRedisStore = {
  init: jest.fn(),
  get: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
  resetKey: jest.fn(),
  resetAll: jest.fn(),
};

jest.mock('rate-limit-redis', () => ({
  RedisStore: jest.fn().mockImplementation(() => mockRedisStore),
}));

describe('FallbackRedisStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('falls back to MemoryStore when Redis increment() throws', async () => {
    // 1. Arrange: Redis is available but its increment() execution fails mid-request
    getIsRedisAvailable.mockReturnValue(true);
    
    // Simulate RedisStore's increment throwing an error (e.g. connection lost)
    mockRedisStore.increment.mockRejectedValue(new Error('Redis connection lost'));

    const store = new FallbackRedisStore({});
    
    // Create an express app with a rate limiter using this store
    const app = express();
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      store: store,
      message: { error: 'Too many requests' }
    }));
    app.get('/test', (req, res) => res.status(200).send('OK'));

    // 2. Act: Send requests. The store will fail on Redis but should fall back to MemoryStore.
    const res1 = await request(app).get('/test');
    expect(res1.status).toBe(200);
    expect(res1.text).toBe('OK');

    const res2 = await request(app).get('/test');
    expect(res2.status).toBe(200);

    // 3. Assert: Verify we called the Redis store's increment
    expect(mockRedisStore.increment).toHaveBeenCalled();
  });

  test('MemoryStore enforces rate limit after Redis fallback', async () => {
    // 1. Arrange: Redis is "available" but always throws errors on increment, triggering fallback to MemoryStore
    getIsRedisAvailable.mockReturnValue(true);
    mockRedisStore.increment.mockRejectedValue(new Error('Redis connection lost'));

    const store = new FallbackRedisStore({});
    
    const app = express();
    app.use(rateLimit({
      windowMs: 60 * 1000,
      max: 2, // Limit is 2 requests
      store: store,
      message: { error: 'Too many requests' }
    }));
    app.get('/test', (req, res) => res.status(200).send('OK'));

    // 2. Act & Assert:
    // Request 1: OK
    let res = await request(app).get('/test');
    expect(res.status).toBe(200);

    // Request 2: OK
    res = await request(app).get('/test');
    expect(res.status).toBe(200);

    // Request 3: Blocked (MemoryStore enforces the limit!)
    res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many requests');
  });

  test('routes to RedisStore when Redis is healthy', async () => {
    // 1. Arrange: Redis is available and healthy
    getIsRedisAvailable.mockReturnValue(true);
    
    // Redis increment command typically returns an object with totalHits and resetTime
    mockRedisStore.increment.mockResolvedValue({
      totalHits: 1,
      resetTime: new Date(Date.now() + 1000),
    });

    const store = new FallbackRedisStore({});
    
    const app = express();
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      store: store,
    }));
    app.get('/test', (req, res) => res.status(200).send('OK'));

    // 2. Act
    const res = await request(app).get('/test');

    // 3. Assert: It called the redis increment and processed correctly
    expect(res.status).toBe(200);
    expect(mockRedisStore.increment).toHaveBeenCalled();
  });
});
