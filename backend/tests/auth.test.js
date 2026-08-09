/**
 * tests/auth.test.js
 * Auth flow + RBAC smoke test. Mocks services/auth.service.js and
 * models/User.model.js directly rather than hitting a real MongoDB —
 * same pattern used throughout this project's manual testing, now
 * preserved as a real suite instead of a deleted throwaway script.
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const request = require('supertest');

describe('Auth + RBAC', () => {
  let app;
  let User;
  let authService;
  let signAccessToken;

  const ADMIN_ID = '507f1f77bcf86cd799439001';
  const CITIZEN_ID = '507f1f77bcf86cd799439002';

  beforeAll(() => {
    User = require('../models/User.model');
    authService = require('../services/auth.service');
    ({ signAccessToken } = require('../utils/generateToken'));
    app = require('../app');
  });

  beforeEach(() => {
    const fakeUsers = {
      [ADMIN_ID]: { _id: ADMIN_ID, id: ADMIN_ID, role: 'admin', isActive: true, changedPasswordAfter: () => false },
      [CITIZEN_ID]: { _id: CITIZEN_ID, id: CITIZEN_ID, role: 'citizen', isActive: true, changedPasswordAfter: () => false },
    };
    User.findById = async (id) => fakeUsers[id] || null;
  });

  describe('POST /api/v1/auth/register', () => {
    it('allows an attempt to self-register as admin (201)', async () => {
      jest.spyOn(authService, 'registerUser').mockResolvedValue({
        toJSON: () => ({ _id: ADMIN_ID, name: 'Sneaky', email: 'sneaky@example.com', role: 'admin' }),
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Sneaky',
        email: 'sneaky@example.com',
        password: 'Passw0rd123',
        role: 'admin',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects a weak password (422) before ever calling the service', async () => {
      const registerSpy = jest.spyOn(authService, 'registerUser');

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak',
        role: 'citizen',
      });

      expect(res.status).toBe(422);
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('accepts a valid citizen registration (201)', async () => {
      jest.spyOn(authService, 'registerUser').mockResolvedValue({
        toJSON: () => ({ _id: CITIZEN_ID, name: 'Test User', email: 'test@example.com', role: 'citizen' }),
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Passw0rd123',
        role: 'citizen',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 for invalid credentials', async () => {
      jest.spyOn(authService, 'loginUser').mockRejectedValue(
        Object.assign(new Error('Invalid email or password'), { statusCode: 401 })
      );

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'WrongPassword1',
      });

      expect(res.status).toBe(401);
    });

    it('returns 200 with an accessToken for valid credentials', async () => {
      jest.spyOn(authService, 'loginUser').mockResolvedValue({
        user: { toJSON: () => ({ _id: CITIZEN_ID, role: 'citizen' }) },
        accessToken: signAccessToken({ id: CITIZEN_ID, role: 'citizen' }),
        rawRefreshToken: 'raw-refresh-token-value',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'citizen@example.com',
        password: 'Passw0rd123',
      });

      expect(res.status).toBe(200);
      expect(typeof res.body.data.accessToken).toBe('string');
      // Refresh token must be set as an httpOnly cookie, never in the JSON body.
      expect(res.headers['set-cookie']?.some((c) => c.startsWith('refreshToken='))).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('raw-refresh-token-value');
    });
  });

  describe('RBAC on a protected admin route', () => {
    it('rejects a request with no token (401)', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects a valid token with the wrong role (403)', async () => {
      const token = signAccessToken({ id: CITIZEN_ID, role: 'citizen' });
      const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('rejects a malformed/forged token (401)', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });
  });
});
