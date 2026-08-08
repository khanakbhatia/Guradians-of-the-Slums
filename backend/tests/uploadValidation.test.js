process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const express = require('express');
const request = require('supertest');

const { uploadImages } = require('../config/multer');
const errorHandler = require('../middlewares/errorHandler');

describe('upload validation', () => {
  it('rejects unsupported citizen report photo MIME types', async () => {
    const app = express();
    app.post('/upload', uploadImages(5), (_req, res) => res.status(200).json({ ok: true }));
    app.use(errorHandler);

    const res = await request(app)
      .post('/upload')
      .attach('photos', Buffer.from('not an image'), {
        filename: 'evidence.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Unsupported file type');
  });
});
