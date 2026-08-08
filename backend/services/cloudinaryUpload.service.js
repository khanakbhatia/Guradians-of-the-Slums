/**
 * services/cloudinaryUpload.service.js
 * Thin wrapper around Cloudinary's upload_stream so callers deal in
 * buffers in, structured metadata out — no Cloudinary SDK details leak
 * into controllers.
 */

const cloudinary = require('../config/cloudinary');

/**
 * @param {Buffer} buffer - raw file bytes (from multer memoryStorage)
 * @param {string} folder - Cloudinary folder, e.g. 'avatars'
 * @param {{ resourceType?: 'image'|'raw' }} [options] - 'raw' for non-image files (PDFs, docs); defaults to 'image'
 * @returns {Promise<{ url: string, publicId: string, format?: string, width?: number, height?: number, bytes?: number }>}
 */
const uploadBuffer = (buffer, folder, options = {}) =>
  new Promise((resolve, reject) => {
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

const deleteAsset = (publicId, options = {}) => cloudinary.uploader.destroy(publicId, { resource_type: options.resourceType || 'image' });

module.exports = { uploadBuffer, deleteAsset };
