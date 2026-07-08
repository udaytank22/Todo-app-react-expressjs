// Set environment variables before importing target modules
process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test@localhost:5432/db';
process.env.MOBILE_ENCRYPTION_KEY = 'test-mobile-secret-key-32-chars-long';

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { prisma } = require('../src/services/db');

// Mock prisma database service
jest.mock('../src/services/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(cmds => Promise.all(cmds)),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

const authRoutes = require('../src/routes/authRoutes');

describe('Auth Controller & Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    test('should successfully register a new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // User does not exist
      prisma.user.count.mockResolvedValue(1); // Already other users exist (role defaults to STAFF)
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'STAFF',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully.');
      expect(response.body.user.email).toBe('new@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    test('should register the first user in the system as ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0); // System is empty
      prisma.user.create.mockResolvedValue({
        id: 'admin-id',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('ADMIN');
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'ADMIN',
        }),
      }));
    });

    test('should reject registration if fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'missing-name-and-pass@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test('should reject registration if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    test('should successfully log in and return access + refresh tokens', async () => {
      const user = {
        id: 'user-1',
        email: 'user1@example.com',
        password: 'hashed_password',
        name: 'User One',
        role: 'STAFF',
      };
      prisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({ token: 'refresh-token-value' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(user.email);
    });

    test('should reject login for invalid credentials (incorrect password)', async () => {
      const user = {
        id: 'user-1',
        email: 'user1@example.com',
        password: 'hashed_password',
        name: 'User One',
        role: 'STAFF',
      };
      prisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false); // Wrong password

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'wrong_password',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password.');
    });

    test('should reject login for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password.');
    });
  });

  describe('Auth Rate Limiter Integration', () => {
    test('should rate limit requests after N attempts', async () => {
      // Create a specific rate limited endpoint mimicking /api/auth/login configuration
      const testApp = express();
      testApp.use(express.json());
      
      const testAuthLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3, // Rate limit after 3 attempts
        message: { error: 'Too many login attempts. Please try again later.' },
      });

      testApp.post('/api/auth/login', testAuthLimiter, (req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      // Attempt 1: Success
      let response = await request(testApp).post('/api/auth/login').send({});
      expect(response.status).toBe(200);

      // Attempt 2: Success
      response = await request(testApp).post('/api/auth/login').send({});
      expect(response.status).toBe(200);

      // Attempt 3: Success
      response = await request(testApp).post('/api/auth/login').send({});
      expect(response.status).toBe(200);

      // Attempt 4: Too Many Requests!
      response = await request(testApp).post('/api/auth/login').send({});
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many login attempts. Please try again later.');
    });
  });
});
