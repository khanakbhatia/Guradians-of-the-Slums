/**
 * routes/v1/media.routes.js
 * Mounted at /api/v1/media in routes/v1/index.js.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const mediaController = require('../../controllers/media.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { uploadSatelliteImage, uploadDocument } = require('../../config/multer');
const sanitizeInput = require('../../middlewares/sanitizeInput');
const { uploadImage: uploadSingleImage } = require('../../config/multer'); // reused below for citizen-image single upload
const { CATEGORIES, RELATED_ENTITY_KINDS } = require('../../models/Media.model');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid media id');

const relatedEntityValidators = [
  body('relatedEntityKind').optional().isIn(RELATED_ENTITY_KINDS),
  body('relatedEntityItem').optional().isMongoId(),
  body('captureLng').optional().isFloat({ min: -180, max: 180 }),
  body('captureLat').optional().isFloat({ min: -90, max: 90 }),
];

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /media/satellite:
 *   post:
 *     tags: [Media]
 *     summary: Satellite Upload
 *     description: >
 *       authority/admin only. Accepts JPEG/PNG/TIFF up to 25MB. Compressed with the
 *       "satellite" profile (max 4096px width, quality 88) — much lighter than citizen-image
 *       compression, since this imagery is meant for analysis, not just display. Deduplicated
 *       by content checksum per uploader+category — re-uploading an identical file returns
 *       the existing record (200) instead of creating a new one (201).
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               relatedEntityKind: { type: string, enum: [Incident, RiskZone, CitizenReport] }
 *               relatedEntityItem: { type: string }
 *               captureLng: { type: number }
 *               captureLat: { type: number }
 *               metadata: { type: string, description: "JSON string, e.g. captureDate/satelliteSource" }
 *     responses:
 *       201:
 *         description: Uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       200:
 *         description: Deduplicated — identical file already existed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       400: { description: Missing file, wrong type, or over size limit }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/satellite',
  authorize('authority', 'admin'),
  relatedEntityValidators,
  validateRequest,
  uploadSatelliteImage,
  sanitizeInput, // multer parses text fields after global sanitizeInput already ran on an empty body
  mediaController.uploadSatellite
);

/**
 * @swagger
 * /media/citizen-images:
 *   post:
 *     tags: [Media]
 *     summary: Citizen Images
 *     description: >
 *       Any authenticated user. Accepts JPEG/PNG/WebP up to 2MB. Compressed with the
 *       "citizen" profile (max 1600px width, quality 72) — same pipeline as citizen-report
 *       photos and chat attachments. Distinct from POST /citizen-reports/{id}/images, which
 *       is specifically evidence attached to a report's verification workflow — this is a
 *       general-purpose image upload optionally linked to any related entity.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               relatedEntityKind: { type: string, enum: [Incident, RiskZone, CitizenReport] }
 *               relatedEntityItem: { type: string }
 *               metadata: { type: string, description: "JSON string, e.g. caption" }
 *     responses:
 *       201:
 *         description: Uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       200:
 *         description: Deduplicated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       400: { description: Missing file, wrong type, or over size limit }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/citizen-images',
  relatedEntityValidators,
  validateRequest,
  uploadSingleImage.single('file'),
  sanitizeInput,
  mediaController.uploadCitizenImage
);

/**
 * @swagger
 * /media/documents:
 *   post:
 *     tags: [Media]
 *     summary: Documents
 *     description: >
 *       authority/admin only. Accepts PDF/DOC/DOCX up to 15MB. NOT compressed (documents
 *       aren't images) — uploaded to Cloudinary as a 'raw' resource type. Intended for
 *       municipal SOPs, NGO guides, and similar reference material.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               relatedEntityKind: { type: string, enum: [Incident, RiskZone, CitizenReport] }
 *               relatedEntityItem: { type: string }
 *               metadata: { type: string, description: "JSON string, e.g. title/documentType/language" }
 *     responses:
 *       201:
 *         description: Uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       200:
 *         description: Deduplicated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       400: { description: Missing file, wrong type, or over size limit }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/documents',
  authorize('authority', 'admin'),
  relatedEntityValidators,
  validateRequest,
  uploadDocument,
  sanitizeInput,
  mediaController.uploadDocument
);

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /media:
 *   get:
 *     tags: [Media]
 *     summary: List media (Storage)
 *     description: "Visibility varies by role: admin sees everything; authority sees their own uploads plus all satellite/document uploads; everyone else sees only their own uploads."
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [satellite, citizen_image, document] }
 *       - in: query
 *         name: relatedEntityKind
 *         schema: { type: string, enum: [Incident, RiskZone, CitizenReport] }
 *       - in: query
 *         name: relatedEntityItem
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated media list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { type: array, items: { $ref: '#/components/schemas/Media' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(CATEGORIES),
  ],
  validateRequest,
  mediaController.listMedia
);

/**
 * @swagger
 * /media/{id}:
 *   get:
 *     tags: [Media]
 *     summary: Get media metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media record
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { media: { $ref: '#/components/schemas/Media' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, mediaController.getMedia);

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /media/{id}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete media
 *     description: Uploader or admin only. Removes from Cloudinary and deletes the metadata record.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete('/:id', [idParamValidator], validateRequest, mediaController.deleteMedia);

module.exports = router;
