/**
 * services/cloudinaryUpload.service.js
 * Thin wrapper around Cloudinary's upload_stream so callers deal in
 * buffers in, structured metadata out — no Cloudinary SDK details leak
 * into controllers.
 */

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const sharp = require('sharp');

const cloudinary = require('../config/cloudinary');
const env = require('../config/env');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const isCloudinaryConfigured = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

const publicUploadUrl = (folder, filename) => `/uploads/${folder}/${filename}`;

const localPublicId = (folder, filename) => `local:${folder}/${filename}`;

const uploadBufferLocally = async (buffer, folder) => {
  const metadata = await sharp(buffer).metadata().catch(() => ({}));
  const format = metadata.format || 'bin';
  const extension = format === 'jpeg' ? 'jpg' : format;
  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const targetDir = path.join(UPLOADS_ROOT, folder);
  const targetPath = path.join(targetDir, filename);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    url: publicUploadUrl(folder, filename),
    publicId: localPublicId(folder, filename),
    format,
    width: metadata.width,
    height: metadata.height,
    bytes: buffer.length,
  };
};

const deleteLocalAsset = async (publicId) => {
  if (!publicId?.startsWith('local:')) return;
  const relativePath = publicId.slice('local:'.length);
  const targetPath = path.resolve(UPLOADS_ROOT, relativePath);
  if (!targetPath.startsWith(UPLOADS_ROOT)) return;
  await fs.unlink(targetPath).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
};

/**
 * @param {Buffer} buffer - raw file bytes (from multer memoryStorage)
 * @param {string} folder - Cloudinary folder, e.g. 'avatars'
 * @param {{ resourceType?: 'image'|'raw' }} [options] - 'raw' for non-image files (PDFs, docs); defaults to 'image'
 * @returns {Promise<{ url: string, publicId: string, format?: string, width?: number, height?: number, bytes?: number }>}
 */
const uploadBuffer = (buffer, folder, options = {}) => {
  if (!isCloudinaryConfigured()) {
    return uploadBufferLocally(buffer, folder);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: options.resourceType || 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
};

const deleteAsset = (publicId, options = {}) =>
  publicId?.startsWith('local:')
    ? deleteLocalAsset(publicId)
    : cloudinary.uploader.destroy(publicId, { resource_type: options.resourceType || 'image' });

module.exports = { uploadBuffer, deleteAsset };
