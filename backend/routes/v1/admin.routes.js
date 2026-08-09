/**
 * routes/v1/admin.routes.js
 * Mounted at /api/v1/admin in routes/v1/index.js. Every route here is
 * admin-only — this is the dedicated admin namespace, distinct from the
 * authority/admin-shared actions that already exist on other resources
 * (e.g. citizen-report verification is also reachable at
 * POST /citizen-reports/:id/verify; /admin/reports/:id/approve is a thin,
 * admin-scoped wrapper around that same service function, not a duplicate
 * implementation).
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const adminController = require('../../controllers/admin.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const adminAuditLogger = require('../../middlewares/adminAuditLogger');
const { ENTITY_TYPES } = require('../../models/ActivityLog.model');
const { CHANNELS: LOG_CHANNELS } = require('../../services/adminLogs.service');

const router = express.Router();

router.use(protect, authorize('admin'), adminAuditLogger);

const idParamValidator = param('id').isMongoId().withMessage('Invalid id');

// ---------------------------------------------------------------------------
// Dashboard / Analytics / Statistics
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard
 *     description: "Snapshot counts across every domain (users, incidents, risk zones, volunteers, tasks, citizen reports), each computed with a single $facet aggregation and run in parallel."
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             example: { success: true, message: "Dashboard fetched", data: { dashboard: { users: { total: 420, active: 401, byRole: { citizen: 300, volunteer: 90, authority: 25, admin: 5 } }, incidents: { total: 18, activeCount: 4, byStatus: { active: 4, resolved: 12, archived: 2 } }, riskZones: { total: 56, criticalCount: 6, byRiskLevel: { critical: 6, high: 14, moderate: 20, low: 16 } }, volunteers: { total: 90, pendingVerificationCount: 8, byAvailability: { available: 40, busy: 12, offline: 38 } }, tasks: { total: 210, byStatus: { open: 15, assigned: 22, completed: 165, cancelled: 8 } }, citizenReports: { total: 340, pendingCount: 19, byStatus: { pending: 19, verified: 250, flagged: 10, rejected: 40, resolved: 21 } } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get('/dashboard', adminController.getDashboard);

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Analytics
 *     description: Daily time-series (incidents started, reports filed, tasks completed, users registered) over a configurable window.
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 90, default: 7 }
 *     responses:
 *       200:
 *         description: Time-series data
 *         content:
 *           application/json:
 *             example: { success: true, message: "Analytics fetched", data: { analytics: { days: 7, incidentsPerDay: [{ date: "2026-08-01", count: 3 }, { date: "2026-08-02", count: 1 }], reportsPerDay: [{ date: "2026-08-01", count: 12 }], tasksCompletedPerDay: [{ date: "2026-08-01", count: 8 }], usersRegisteredPerDay: [{ date: "2026-08-01", count: 5 }] } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get(
  '/analytics',
  [query('days').optional().isInt({ min: 1, max: 90 })],
  validateRequest,
  adminController.getAnalytics
);

/**
 * @swagger
 * /admin/statistics:
 *   get:
 *     tags: [Admin]
 *     summary: Statistics
 *     description: Computed averages/distributions (avg task completion time, avg volunteer trust score, avg report reliability, avg incident resolution time) — distinct from Dashboard's plain counts.
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             example: { success: true, message: "Statistics fetched", data: { statistics: { avgTaskCompletionMinutes: 52.4, completedTaskSampleSize: 165, avgVolunteerTrustScore: 61.8, avgReportReliabilityScore: 57.2, avgIncidentResolutionHours: 5.6, resolvedIncidentSampleSize: 12 } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get('/statistics', adminController.getStatistics);

// ---------------------------------------------------------------------------
// System Logs / Activity Feed
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/system-logs:
 *   get:
 *     tags: [Admin]
 *     summary: System Logs
 *     description: Full filterable, paginated ActivityLog browser — for auditing/investigation, not a live feed.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: action
 *         schema: { type: string, example: "TASK_ACCEPTED" }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: actor
 *         schema: { type: string, description: "Filter by actor user id" }
 *       - in: query
 *         name: performedBySystem
 *         schema: { type: boolean }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated log entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { logs: { type: array, items: { $ref: '#/components/schemas/ActivityLog' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get(
  '/system-logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('entityType').optional().isIn(ENTITY_TYPES),
    query('actor').optional().isMongoId(),
  ],
  validateRequest,
  adminController.getSystemLogs
);

/**
 * @swagger
 * /admin/activity-feed:
 *   get:
 *     tags: [Admin]
 *     summary: Activity Feed
 *     description: "Lightweight recent-N stream for a live dashboard widget. Also pushed in real time over Socket.IO ('activity:new' to the role:admin room) via a post-save hook on ActivityLog — this endpoint is just the initial page load."
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Recent activity entries, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { feed: { type: array, items: { $ref: '#/components/schemas/ActivityLog' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get(
  '/activity-feed',
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  adminController.getActivityFeed
);

// ---------------------------------------------------------------------------
// Log files (utils/logger.js's six channels — file-based operational logs,
// distinct from the ActivityLog-backed System Logs/Activity Feed above)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: List log files
 *     description: Every rotated log file currently on disk across all six channels (app, error, http, security, database, admin), newest first.
 *     responses:
 *       200:
 *         description: "Array of { filename, channel, date, sizeBytes, lastModified }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Log files listed", data: { files: [{ filename: "admin-2026-08-06.log", channel: "admin", date: "2026-08-06", sizeBytes: 4820, lastModified: "2026-08-06T23:59:00.000Z" }] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get('/logs', adminController.listLogFiles);

/**
 * @swagger
 * /admin/logs/{channel}:
 *   get:
 *     tags: [Admin]
 *     summary: Tail a log channel
 *     description: "Last N lines of one channel's log file for one date, each parsed from JSON. Whole-file read, not a streaming tail — files over 20MB are rejected (413) rather than loaded into memory; narrow the date instead."
 *     parameters:
 *       - in: path
 *         name: channel
 *         required: true
 *         schema: { type: string, enum: [app, error, http, security, database, admin] }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date, example: "2026-08-07" }
 *         description: Defaults to today
 *       - in: query
 *         name: lines
 *         schema: { type: integer, minimum: 1, maximum: 1000, default: 100 }
 *     responses:
 *       200:
 *         description: "{ channel, date, lines: [...parsed entries], totalLines }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Log tail fetched", data: { channel: "security", date: "2026-08-06", lines: [{ level: "warn", message: "AUTH_FAILURE", timestamp: "2026-08-06T10:47:17.000Z", userId: null }], totalLines: 42 } }
 *       400: { description: Unknown channel or malformed date }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       413: { description: Log file too large to read in full }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/logs/:channel',
  [
    param('channel').isIn(LOG_CHANNELS),
    query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    query('lines').optional().isInt({ min: 1, max: 1000 }),
  ],
  validateRequest,
  adminController.tailLog
);

// ---------------------------------------------------------------------------
// Approve Reports
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/reports/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Approve Reports — pending queue
 *     description: Citizen reports awaiting review, oldest first (FIFO).
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated pending reports
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { reports: { type: array, items: { $ref: '#/components/schemas/CitizenReport' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 */
router.get(
  '/reports/pending',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  adminController.getPendingReports
);

/**
 * @swagger
 * /admin/reports/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve Reports — approve one
 *     description: "Thin admin-scoped wrapper around the same verifyReport logic used by POST /citizen-reports/{id}/verify — one rule set, two entry points."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { note: { type: string, maxLength: 500 } } }
 *     responses:
 *       200:
 *         description: Report approved (verified)
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
 *       409: { description: Report is not in a verifiable state }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/reports/:id/approve',
  [idParamValidator, body('note').optional().isLength({ max: 500 })],
  validateRequest,
  adminController.approveReport
);

// ---------------------------------------------------------------------------
// Approve Volunteers
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/volunteers/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Approve Volunteers — pending queue
 *     description: Volunteer profiles awaiting verification, oldest first.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated pending volunteers
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
  '/volunteers/pending',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  adminController.getPendingVolunteers
);

/**
 * @swagger
 * /admin/volunteers/{id}/approve:
 *   post:
 *     tags: [Admin]
 *     summary: Approve Volunteers — approve one
 *     description: Sets Volunteer.verified = true and sends the volunteer an in-app notification.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Volunteer approved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { volunteer: { $ref: '#/components/schemas/Volunteer' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Already verified }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/volunteers/:id/approve', [idParamValidator], validateRequest, adminController.approveVolunteer);
router.post('/volunteers/:id/reject', [idParamValidator], validateRequest, adminController.rejectVolunteer);

// ---------------------------------------------------------------------------
// Suspend User
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /admin/users/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend User
 *     description: "Sets isActive = false and revokes every refresh token (all sessions end immediately). Distinct audit action from account self-deactivation — carries an admin-supplied reason."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { reason: { type: string, maxLength: 500 } } }
 *     responses:
 *       200:
 *         description: User suspended
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } }
 *       400: { description: Cannot suspend your own account }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Already suspended/inactive }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/users/:id/suspend',
  [idParamValidator, body('reason').optional().isLength({ max: 500 })],
  validateRequest,
  adminController.suspendUser
);

/**
 * @swagger
 * /admin/users/{id}/unsuspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Unsuspend User
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User unsuspended
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Not suspended }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/users/:id/unsuspend', [idParamValidator], validateRequest, adminController.unsuspendUser);

module.exports = router;
