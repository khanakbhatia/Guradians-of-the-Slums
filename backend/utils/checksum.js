/**
 * utils/checksum.js
 * SHA-256 of a file buffer — used by services/media.service.js to detect
 * duplicate uploads (same uploader, category, and content) before
 * spending a Cloudinary upload + compression pass on a file already stored.
 */

const crypto = require('crypto');

const computeChecksum = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

module.exports = { computeChecksum };
