/**
 * routes/v1/citizenReport.routes.js
 * Mounted at /api/v1/citizen-reports in routes/v1/index.js.
 * No AI logic — reliabilityScore adjustments on verification are flat,
 * deterministic deltas, not a scoring model.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const citizenReportController = require('../../controllers/citizenReport.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { uploadImages } = require('../../config/multer');
const { HAZARD_TYPES, SEVERITIES } = require('../../models/CitizenReport.model');
const { MAX_PHOTOS } = require('../../services/citizenReport.service');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid report id');
const noteValidator = body('note').optional().isLength({ max: 500 });

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Create Report
 *     description: "JSON metadata only — attach photos afterward via POST /citizen-reports/{id}/images."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hazardType, description, location]
 *             properties:
 *               hazardType: { type: string, enum: [flood, fire, structural, landslide, blocked_drainage, other], description: "Category" }
 *               severity: { type: string, enum: [low, medium, high, critical], default: medium }
 *               description: { type: string, maxLength: 1000 }
 *               location:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates: { type: array, items: { type: number }, example: [72.8777, 19.0760] }
 *               riskZone: { type: string, description: "Optional RiskZone _id" }
 *               incident: { type: string, description: "Optional Incident _id, if already linked to a known incident" }
 *     responses:
 *       201:
 *         description: Report created, status "pending"
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  [
    body('hazardType').isIn(HAZARD_TYPES),
    body('severity').optional().isIn(SEVERITIES),
    body('description').trim().isLength({ min: 5, max: 1000 }),
    body('location.coordinates').isArray({ min: 2, max: 2 }),
    body('riskZone').optional().isMongoId(),
    body('incident').optional().isMongoId(),
  ],
  validateRequest,
  citizenReportController.createReport
);

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports:
 *   get:
 *     tags: [CitizenReports]
 *     summary: List reports
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-createdAt" }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: hazardType
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated report list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { reports: { type: array, items: { $ref: '#/components/schemas/CitizenReport' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  citizenReportController.listReports
);

/**
 * @swagger
 * /citizen-reports/{id}:
 *   get:
 *     tags: [CitizenReports]
 *     summary: Get Report
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, citizenReportController.getReport);

// ---------------------------------------------------------------------------
// Images — Cloudinary upload with server-side compression
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports/{id}/images:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Upload Images
 *     description: >
 *       Reporter (while status is "pending") or admin only. Up to 5 photos total per report.
 *       Each file is compressed server-side (resized to max 1600px width, re-encoded JPEG q72,
 *       EXIF stripped — including embedded GPS) before being uploaded to Cloudinary.
 *       Multipart field name: "photos" (repeat the field for multiple files).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photos]
 *             properties:
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Images uploaded, report returned with updated photos array
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       400: { description: "No files, wrong type/size, or would exceed the 5-photo limit" }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "Not the reporter (or admin)" }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Report is no longer 'pending' — evidence is locked after review starts (admin can override)" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/images',
  [idParamValidator],
  validateRequest,
  uploadImages(MAX_PHOTOS),
  citizenReportController.uploadImages
);

// ---------------------------------------------------------------------------
// Status (read)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports/{id}/status:
 *   get:
 *     tags: [CitizenReports]
 *     summary: Status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Current status, reliabilityScore, who reviewed it, and their note"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Report status fetched", data: { status: { status: "verified", reliabilityScore: 60, verifiedBy: { name: "Amit Rao", role: "authority" }, reviewNote: "Confirmed on site", updatedAt: "2026-08-06T10:30:00.000Z" } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id/status', [idParamValidator], validateRequest, citizenReportController.getStatus);

// ---------------------------------------------------------------------------
// Verification — named actions, authority/admin only
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports/{id}/verify:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Verification — verify
 *     description: "authority/admin only. Valid from 'pending' or 'flagged'. reliabilityScore +10 (capped at 100)."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { note: { type: string, maxLength: 500 } }
 *     responses:
 *       200:
 *         description: Report verified
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Report is not in a verifiable state" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/verify',
  authorize('authority', 'admin'),
  [idParamValidator, noteValidator],
  validateRequest,
  citizenReportController.verifyReport
);

/**
 * @swagger
 * /citizen-reports/{id}/flag:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Verification — flag
 *     description: "authority/admin only. Valid from 'pending' or 'verified' (a previously-verified report can be re-flagged if it turns out to be wrong). reliabilityScore -15 (floored at 0)."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { note: { type: string, maxLength: 500 } }
 *     responses:
 *       200:
 *         description: Report flagged
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Report is not in a flaggable state" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/flag',
  authorize('authority', 'admin'),
  [idParamValidator, noteValidator],
  validateRequest,
  citizenReportController.flagReport
);

/**
 * @swagger
 * /citizen-reports/{id}/reject:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Verification — reject
 *     description: "authority/admin only. Valid from 'pending' or 'flagged'. Terminal state. reliabilityScore -20 (floored at 0)."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { note: { type: string, maxLength: 500 } }
 *     responses:
 *       200:
 *         description: Report rejected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Report is not in a rejectable state" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/reject',
  authorize('authority', 'admin'),
  [idParamValidator, noteValidator],
  validateRequest,
  citizenReportController.rejectReport
);

/**
 * @swagger
 * /citizen-reports/{id}/resolve:
 *   post:
 *     tags: [CitizenReports]
 *     summary: Verification — resolve
 *     description: "authority/admin only. Valid only from 'verified' — the reported hazard has now been addressed."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { note: { type: string, maxLength: 500 } }
 *     responses:
 *       200:
 *         description: Report resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { report: { $ref: '#/components/schemas/CitizenReport' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Report is not 'verified'" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/resolve',
  authorize('authority', 'admin'),
  [idParamValidator, noteValidator],
  validateRequest,
  citizenReportController.resolveReport
);

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /citizen-reports/{id}/history:
 *   get:
 *     tags: [CitizenReports]
 *     summary: History
 *     description: Full audit trail from ActivityLog — creation, image uploads, and every verification action — newest first.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { entries: { type: array, items: { $ref: '#/components/schemas/ActivityLog' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id/history', [idParamValidator], validateRequest, citizenReportController.getHistory);

module.exports = router;
