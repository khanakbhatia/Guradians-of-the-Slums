/**
 * config/multer.js
 * Multer storage/upload configuration. Uses memoryStorage — files are
 * buffered in RAM and streamed straight to Cloudinary, never written to
 * local disk (no cleanup step needed, safe for stateless/containerized deploys).
 */

const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_SATELLITE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_UPLOAD_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB pre-compression ceiling for citizen/chat images
const MAX_SATELLITE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // satellite tiles run much larger, and are compressed far less aggressively
const MAX_DOCUMENT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // documents aren't compressed at all, so this IS the stored size

const makeFileFilter = (allowedMimeTypes) => (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(', ')}`));
  }
  cb(null, true);
};

const imageFileFilter = makeFileFilter(ALLOWED_IMAGE_MIME_TYPES);

// Single-file upload (e.g. avatar) — kept at a tighter 2MB since it isn't compressed.
const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

// Multi-file upload (e.g. citizen report photos, chat attachments) — each
// file gets compressed server-side before storage, so the pre-compression
// ceiling can be looser.
const uploadImages = (maxCount) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: maxCount },
  }).array('photos', maxCount);

// Satellite imagery — larger size ceiling, accepts TIFF in addition to
// standard raster formats, single file per upload.
const uploadSatelliteImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFileFilter(ALLOWED_SATELLITE_MIME_TYPES),
  limits: { fileSize: MAX_SATELLITE_FILE_SIZE_BYTES, files: 1 },
}).single('file');

// Documents — PDFs and Word docs, not compressed at all, so the size
// ceiling is a hard cap rather than a pre-compression buffer.
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFileFilter(ALLOWED_DOCUMENT_MIME_TYPES),
  limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES, files: 1 },
}).single('file');

module.exports = {
  uploadImage,
  uploadImages,
  uploadSatelliteImage,
  uploadDocument,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_SATELLITE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_SATELLITE_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
};
