/**
 * tests/health.test.js
 * The health check is deliberately DB-aware (see routes/index.js) — this
 * suite verifies both states, not just the happy path.
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

describe('GET /api/health', () => {
  afterEach(() => {
    // Restore whatever readyState real code left behind so other test
    // files in this suite don't inherit a value this file set.
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
  });

  it('returns 503 with dependencies.database "disconnected" when Mongo is not connected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.dependencies.database).toBe('disconnected');
  });

  it('returns 200 with dependencies.database "connected" when Mongo readyState is 1', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dependencies.database).toBe('connected');
    expect(typeof res.body.uptime).toBe('number');
  });
});
