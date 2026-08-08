process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

const fs = require('fs/promises');
const path = require('path');

const sharp = require('sharp');

describe('cloudinaryUpload.service local fallback', () => {
  it('persists image buffers under backend/uploads when Cloudinary is not configured', async () => {
    jest.resetModules();
    const cloudinaryUpload = require('../services/cloudinaryUpload.service');

    const buffer = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: '#225577',
      },
    })
      .jpeg()
      .toBuffer();

    const result = await cloudinaryUpload.uploadBuffer(buffer, 'test-citizen-reports');
    const relativePath = result.publicId.replace('local:', '');
    const storedPath = path.join(__dirname, '..', 'uploads', relativePath);

    expect(result.url).toMatch(/^\/uploads\/test-citizen-reports\//);
    expect(result.publicId).toMatch(/^local:test-citizen-reports\//);
    await expect(fs.access(storedPath)).resolves.toBeUndefined();

    await cloudinaryUpload.deleteAsset(result.publicId);
    await expect(fs.access(storedPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
