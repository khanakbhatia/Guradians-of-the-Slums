/**
 * routes/v1/volunteer.routes.js
 * Mounted at /api/v1/volunteers in routes/v1/index.js.
 * Database only — no matching/scoring intelligence lives here.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const volunteerController = require('../../controllers/volunteer.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { SKILLS, AVAILABILITY } = require('../../models/Volunteer.model');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid volunteer id');

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers:
 *   post:
 *     tags: [Volunteers]
 *     summary: Volunteer Registration
 *     description: "Creates the volunteer profile for the authenticated account. Requires the account's role to already be 'volunteer' (set at signup) — one profile per account."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skills]
 *             properties:
 *               skills:
 *                 type: array
 *                 items: { type: string, enum: [medical, rescue, logistics, communication, construction, counseling, other] }
 *                 minItems: 1
 *               ngoAffiliation: { type: string }
 *               serviceRadiusKm: { type: number, minimum: 0, maximum: 100, default: 5 }
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates: { type: array, items: { type: number }, example: [72.8777, 19.0760] }
 *     responses:
 *       201:
 *         description: Volunteer profile created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteer: { $ref: '#/components/schemas/Volunteer' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "Account role is not 'volunteer'" }
 *       409: { description: Profile already exists for this account }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  [
    body('skills').isArray({ min: 1 }),
    body('skills.*').isIn(SKILLS),
    body('ngoAffiliation').optional().isLength({ max: 150 }),
    body('serviceRadiusKm').optional().isFloat({ min: 0, max: 100 }),
    body('currentLocation.coordinates').optional().isArray({ min: 2, max: 2 }),
  ],
  validateRequest,
  volunteerController.registerVolunteer
);

// ---------------------------------------------------------------------------
// Self profile
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers/me:
 *   get:
 *     tags: [Volunteers]
 *     summary: Volunteer Profile (self)
 *     responses:
 *       200:
 *         description: Own volunteer profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteer: { $ref: '#/components/schemas/Volunteer' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { description: No volunteer profile registered yet }
 */
router.get('/me', volunteerController.getOwnProfile);

/**
 * @swagger
 * /volunteers/me:
 *   patch:
 *     tags: [Volunteers]
 *     summary: Update Volunteer Profile (self)
 *     description: "skills, ngoAffiliation, serviceRadiusKm only — verified/trustScore/rating/completedTasksCount are system-controlled."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skills:
 *                 type: array
 *                 items: { type: string, enum: [medical, rescue, logistics, communication, construction, counseling, other] }
 *               ngoAffiliation: { type: string }
 *               serviceRadiusKm: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteer: { $ref: '#/components/schemas/Volunteer' } } }
 *       400: { description: No updatable fields provided }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { description: No volunteer profile registered yet }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/me',
  [
    body('skills').optional().isArray({ min: 1 }),
    body('skills.*').optional().isIn(SKILLS),
    body('ngoAffiliation').optional().isLength({ max: 150 }),
    body('serviceRadiusKm').optional().isFloat({ min: 0, max: 100 }),
  ],
  validateRequest,
  volunteerController.updateOwnProfile
);

// ---------------------------------------------------------------------------
// Availability — dedicated endpoints
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers/me/availability:
 *   get:
 *     tags: [Volunteers]
 *     summary: Availability (read)
 *     responses:
 *       200:
 *         description: "Current availability status and location"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Availability fetched", data: { availability: { availability: "available", currentLocation: { type: "Point", coordinates: [72.87, 19.07] }, updatedAt: "2026-08-06T09:00:00.000Z" } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { description: No volunteer profile registered yet }
 */
router.get('/me/availability', volunteerController.getAvailability);

/**
 * @swagger
 * /volunteers/me/availability:
 *   patch:
 *     tags: [Volunteers]
 *     summary: Availability (update)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availability: { type: string, enum: [available, busy, offline] }
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates: { type: array, items: { type: number } }
 *     responses:
 *       200:
 *         description: Availability updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Availability updated", data: { availability: { availability: "busy", currentLocation: null, updatedAt: "2026-08-06T09:05:00.000Z" } } }
 *       400: { description: No fields provided }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { description: No volunteer profile registered yet }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/me/availability',
  [
    body('availability').optional().isIn(AVAILABILITY),
    body('currentLocation.coordinates').optional().isArray({ min: 2, max: 2 }),
  ],
  validateRequest,
  volunteerController.updateAvailability
);

// ---------------------------------------------------------------------------
// Statistics (self)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers/me/stats:
 *   get:
 *     tags: [Volunteers]
 *     summary: Volunteer Statistics (self)
 *     description: "trustScore/rating/completedTasksCount from the profile, plus LIVE task counts by status computed from the Task collection (not just the cached counter)."
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             example: { success: true, message: "Volunteer statistics fetched", data: { stats: { trustScore: 62, rating: 4.5, availability: "available", completedTasksCount: 7, currentTasksByStatus: { assigned: 1, in_progress: 0, completed: 7, cancelled: 0 } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { description: No volunteer profile registered yet }
 */
router.get('/me/stats', volunteerController.getOwnStatistics);

// ---------------------------------------------------------------------------
// Leaderboard — must come before /:id
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers/leaderboard:
 *   get:
 *     tags: [Volunteers]
 *     summary: Leaderboard
 *     description: "Flat ranking by completedTasksCount then trustScore — no weighting/scoring model. Only volunteers with at least one completed task are listed."
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *       - in: query
 *         name: skill
 *         schema: { type: string }
 *         description: Restrict the leaderboard to volunteers with this skill
 *     responses:
 *       200:
 *         description: Ranked volunteer list
 *         content:
 *           application/json:
 *             example: { success: true, message: "Leaderboard fetched", data: { leaderboard: [{ _id: "507f1f77bcf86cd799439041", user: { name: "Priya Sharma", avatar: null }, skills: ["medical"], trustScore: 88, completedTasksCount: 14, rating: 4.8 }] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/leaderboard',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  volunteerController.getLeaderboard
);

// ---------------------------------------------------------------------------
// Admin/authority search
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers:
 *   get:
 *     tags: [Volunteers]
 *     summary: List/search volunteers (authority/admin)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-trustScore" }
 *       - in: query
 *         name: skills
 *         schema: { type: string }
 *       - in: query
 *         name: availability
 *         schema: { type: string, enum: [available, busy, offline] }
 *       - in: query
 *         name: verified
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated volunteer list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteers: { type: array, items: { $ref: '#/components/schemas/Volunteer' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get(
  '/',
  authorize('authority', 'admin'),
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  volunteerController.listVolunteers
);

// ---------------------------------------------------------------------------
// Lookup by id (after registration/me/leaderboard/list so those aren't
// swallowed as an :id)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /volunteers/{id}:
 *   get:
 *     tags: [Volunteers]
 *     summary: Get Volunteer Profile by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Volunteer profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteer: { $ref: '#/components/schemas/Volunteer' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, volunteerController.getVolunteer);

/**
 * @swagger
 * /volunteers/{id}/stats:
 *   get:
 *     tags: [Volunteers]
 *     summary: Volunteer Statistics by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             example: { success: true, message: "Volunteer statistics fetched", data: { stats: { trustScore: 62, rating: 4.5, availability: "available", completedTasksCount: 7, currentTasksByStatus: { assigned: 1, in_progress: 0, completed: 7, cancelled: 0 } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id/stats', [idParamValidator], validateRequest, volunteerController.getStatisticsById);

module.exports = router;
