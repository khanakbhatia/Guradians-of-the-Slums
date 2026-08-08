/**
 * routes/v1/notification.routes.js
 * Mounted at /api/v1/notifications in routes/v1/index.js.
 * Every broadcast/alert route here also pushes live via Socket.IO
 * (see config/socket.js room conventions) in addition to persisting
 * Notification documents.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const notificationController = require('../../controllers/notification.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { TYPES, CHANNELS, PRIORITIES } = require('../../models/Notification.model');
const { ROLES } = require('../../models/User.model');
const { SKILLS } = require('../../models/Volunteer.model');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid notification id');
const alertBodyValidators = [
  body('title').trim().isLength({ min: 2, max: 150 }),
  body('message').trim().isLength({ min: 2, max: 500 }),
  body('type').optional().isIn(TYPES),
  body('priority').optional().isIn(PRIORITIES),
  body('channel').optional().isIn(CHANNELS),
];
const geoValidators = [
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('radiusKm').optional().isFloat({ min: 0.1, max: 100 }),
];

// ---------------------------------------------------------------------------
// Self — list, unread count, mark read (all before /:id-shaped admin routes)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List my notifications
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
 *         name: isRead
 *         schema: { type: boolean }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, normal, high, urgent] }
 *     responses:
 *       200:
 *         description: Paginated notification list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { notifications: { type: array, items: { $ref: '#/components/schemas/Notification' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  notificationController.listNotifications
);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Unread Count
 *     description: Total unread, broken down by priority.
 *     responses:
 *       200:
 *         description: "{ total, byPriority: { low, normal, high, urgent } }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Unread count fetched", data: { unread: { total: 4, byPriority: { low: 0, normal: 1, high: 1, urgent: 2 } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark Read — all
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             example: { success: true, message: "Notifications marked as read", data: { modifiedCount: 4 } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark Read — single
 *     description: Idempotent — marking an already-read notification again is a no-op, not an error.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked read
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { notification: { $ref: '#/components/schemas/Notification' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/:id/read', [idParamValidator], validateRequest, notificationController.markAsRead);

// ---------------------------------------------------------------------------
// Broadcast — generic (explicit userIds and/or a role)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Broadcast
 *     description: "authority/admin only. Targets an explicit list of userIds and/or every active user of a given role. Persists one Notification per resolved recipient, plus a single Socket.IO emit covering all their personal rooms."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               type: { type: string, enum: [alert, task_assigned, task_update, chat_message, system, report_status], default: system }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: normal }
 *               channel: { type: string, enum: [in_app, sms, push, email], default: in_app }
 *               role: { type: string, enum: [citizen, volunteer, authority, admin] }
 *               userIds: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: "{ recipientCount }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Broadcast sent", data: { recipientCount: 12 } }
 *       400: { description: No recipients resolved }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/broadcast',
  authorize('authority', 'admin'),
  [
    ...alertBodyValidators,
    body('role').optional().isIn(ROLES),
    body('userIds').optional().isArray(),
    body('userIds.*').optional().isMongoId(),
  ],
  validateRequest,
  notificationController.broadcast
);

// ---------------------------------------------------------------------------
// Authority / Volunteer / Citizen Alerts — role-scoped convenience broadcasts
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /notifications/authority-alert:
 *   post:
 *     tags: [Notifications]
 *     summary: Authority Alerts
 *     description: "authority/admin only. Notifies every active authority, optionally narrowed to one department."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: normal }
 *               department: { type: string, description: "Optional exact-match filter on Authority.department" }
 *     responses:
 *       201:
 *         description: "{ recipientCount }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Broadcast sent", data: { recipientCount: 12 } }
 *       400: { description: No matching authority recipients }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/authority-alert',
  authorize('authority', 'admin'),
  [...alertBodyValidators, body('department').optional().isString()],
  validateRequest,
  notificationController.authorityAlert
);

/**
 * @swagger
 * /notifications/volunteer-alert:
 *   post:
 *     tags: [Notifications]
 *     summary: Volunteer Alerts
 *     description: "authority/admin only. Notifies active volunteers, optionally filtered by a single skill and/or a geo radius around currentLocation. Flat filters only — no ranking/matching intelligence."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: normal }
 *               skill: { type: string, enum: [medical, rescue, logistics, communication, construction, counseling, other] }
 *               lng: { type: number }
 *               lat: { type: number }
 *               radiusKm: { type: number, default: 5 }
 *     responses:
 *       201:
 *         description: "{ recipientCount }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Broadcast sent", data: { recipientCount: 12 } }
 *       400: { description: No matching volunteer recipients }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/volunteer-alert',
  authorize('authority', 'admin'),
  [...alertBodyValidators, ...geoValidators, body('skill').optional().isIn(SKILLS)],
  validateRequest,
  notificationController.volunteerAlert
);

/**
 * @swagger
 * /notifications/citizen-alert:
 *   post:
 *     tags: [Notifications]
 *     summary: Citizen Alerts
 *     description: "authority/admin only. Notifies active citizens, optionally scoped to a geo radius around their User.location (e.g. an evacuation warning for one neighborhood)."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: high }
 *               lng: { type: number }
 *               lat: { type: number }
 *               radiusKm: { type: number, default: 5 }
 *     responses:
 *       201:
 *         description: "{ recipientCount }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Broadcast sent", data: { recipientCount: 12 } }
 *       400: { description: No matching citizen recipients }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/citizen-alert',
  authorize('authority', 'admin'),
  [...alertBodyValidators, ...geoValidators],
  validateRequest,
  notificationController.citizenAlert
);

// ---------------------------------------------------------------------------
// Room Based Notifications — ephemeral push to an incident room
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /notifications/incidents/{incidentId}/room-alert:
 *   post:
 *     tags: [Notifications]
 *     summary: Room Based Notifications
 *     description: "authority/admin only. Pushes live to everyone currently connected to the `incident:{incidentId}` Socket.IO room (joined client-side via the 'incident:join' event). NOT persisted as personal Notification documents — room membership is transient — but the push itself is audit-logged."
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: normal }
 *     responses:
 *       200:
 *         description: Pushed (fire-and-forget — no way to know how many clients were listening)
 *         content:
 *           application/json:
 *             example: { success: true, message: "Room alert pushed to connected clients", data: null }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/incidents/:incidentId/room-alert',
  authorize('authority', 'admin'),
  [param('incidentId').isMongoId(), ...alertBodyValidators],
  validateRequest,
  notificationController.incidentRoomAlert
);

module.exports = router;
