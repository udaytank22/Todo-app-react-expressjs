const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const { generateCsrfToken, csrfProtection } = require('../src/middleware/csrf');

describe('CSRF Middleware', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());

    // Define the same csrfMiddleware as index.js
    const csrfMiddleware = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const hasSessionCookie = req.cookies && req.cookies.token;

      if (
        ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
        authHeader ||
        !hasSessionCookie
      ) {
        return next();
      }

      return csrfProtection(req, res, next);
    };

    app.use('/api', csrfMiddleware);

    // CSRF generating endpoint
    app.get('/api/setup', (req, res) => {
      const token = generateCsrfToken(req, res);
      res.json({ csrfToken: token });
    });

    // Protected endpoint
    app.post('/api/change', (req, res) => {
      res.status(200).json({ success: true });
    });
  });

  test('GET requests skip CSRF check', async () => {
    const res = await request(app).get('/api/change');
    expect(res.status).toBe(404); // change route is POST, so GET is 404 (but not 403 CSRF error)
  });

  test('POST requests without session cookie skip CSRF check (anonymous user)', async () => {
    const res = await request(app)
      .post('/api/change')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST requests with Authorization header skip CSRF check (mobile client)', async () => {
    const res = await request(app)
      .post('/api/change')
      .set('Authorization', 'Bearer valid-jwt-token')
      .set('Cookie', ['token=active-session'])
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST requests with session cookie but no CSRF header fail with 403', async () => {
    const res = await request(app)
      .post('/api/change')
      .set('Cookie', ['token=active-session'])
      .send({});
    expect(res.status).toBe(403);
  });

  test('POST requests with session cookie and matching CSRF header succeed', async () => {
    // 1. Get a valid CSRF token and its cookie
    const setupRes = await request(app).get('/api/setup');
    const csrfToken = setupRes.body.csrfToken;
    const cookies = setupRes.headers['set-cookie'];

    // 2. Extract csrfToken cookie
    const csrfCookie = cookies.find(c => c.startsWith('csrfToken='));

    // 3. Send state-changing request with session token cookie + csrfToken cookie + matching header
    const res = await request(app)
      .post('/api/change')
      .set('Cookie', ['token=active-session', csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
