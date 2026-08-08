/**
 * routes/v1/incident.routes.js
 * Mounted at /api/v1/incidents in routes/v1/index.js.
 * No AI/agent logic anywhere here — every endpoint is a direct database
 * read/write (plus one geospatial query and one status state-machine check).
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const incidentController = require('../../controllers/incident.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { INCIDENT_TYPES, SEVERITIES, STATUSES } = require('../../models/Incident.model');

const router = express.Router();

router.use(protect); // every incident route requires authentication

const idParamValidator = param('id').isMongoId().withMessage('Invalid incident id');

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Create Incident
 *     description: authority/admin only. reportedBy is set to the authenticated user automatically.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, severity, riskZone, location]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               type: { type: string, enum: [flood, fire, structural_collapse, landslide, disease_outbreak, other] }
 *               severity: { type: string, enum: [low, medium, high, critical] }
 *               riskZone: { type: string, description: "RiskZone _id" }
 *               location:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates: { type: array, items: { type: number }, example: [72.8777, 19.0760] }
 *               description: { type: string, maxLength: 2000 }
 *               affectedPopulationEstimate: { type: integer, minimum: 0 }
 *     responses:
 *       201:
 *         description: Incident created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incident: { $ref: '#/components/schemas/Incident' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  authorize('authority', 'admin'),
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('type').isIn(INCIDENT_TYPES),
    body('severity').isIn(SEVERITIES),
    body('riskZone').isMongoId(),
    body('location.coordinates').isArray({ min: 2, max: 2 }),
    body('description').optional().isLength({ max: 2000 }),
    body('affectedPopulationEstimate').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  incidentController.createIncident
);

// ---------------------------------------------------------------------------
// Read — list, nearby (both before /:id so they aren't swallowed by it)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-startedAt" }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: riskZone
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated incident list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incidents: { type: array, items: { $ref: '#/components/schemas/Incident' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  incidentController.listIncidents
);

/**
 * @swagger
 * /incidents/nearby:
 *   get:
 *     tags: [Incidents]
 *     summary: Nearby Incidents
 *     description: Geospatial query using MongoDB $nearSphere — results are pre-sorted nearest-first by the database.
 *     parameters:
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number, example: 72.8777 }
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number, example: 19.0760 }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 5, example: 5 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Optional exact-match status filter
 *     responses:
 *       200:
 *         description: Incidents within radius, nearest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incidents: { type: array, items: { $ref: '#/components/schemas/Incident' } } } }
 *       400: { description: Missing lng/lat }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/nearby',
  [
    query('lng').isFloat({ min: -180, max: 180 }),
    query('lat').isFloat({ min: -90, max: 90 }),
    query('radiusKm').optional().isFloat({ min: 0.1, max: 100 }),
    query('status').optional().isIn(STATUSES),
  ],
  validateRequest,
  incidentController.nearbyIncidents
);

// ---------------------------------------------------------------------------
// Read — single incident
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get Incident
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Incident, with riskZone populated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incident: { $ref: '#/components/schemas/Incident' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, incidentController.getIncident);

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents/{id}:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update Incident
 *     description: "authority/admin only. Does NOT accept `status` — use PATCH /incidents/{id}/status for status changes, which enforces valid transitions."
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
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [flood, fire, structural_collapse, landslide, disease_outbreak, other] }
 *               severity: { type: string, enum: [low, medium, high, critical] }
 *               description: { type: string }
 *               affectedPopulationEstimate: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Incident updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incident: { $ref: '#/components/schemas/Incident' } } }
 *       400: { description: No updatable fields provided }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/:id',
  authorize('authority', 'admin'),
  [
    idParamValidator,
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('type').optional().isIn(INCIDENT_TYPES),
    body('severity').optional().isIn(SEVERITIES),
    body('description').optional().isLength({ max: 2000 }),
    body('affectedPopulationEstimate').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  incidentController.updateIncident
);

// ---------------------------------------------------------------------------
// Status — dedicated endpoints, enforce the transition state machine
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents/{id}/status:
 *   get:
 *     tags: [Incidents]
 *     summary: Incident Status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Current status plus when it last changed"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Incident status fetched", data: { status: "active", lastChangedAt: "2026-08-06T10:20:00.000Z", resolvedAt: null } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/:id/status', [idParamValidator], validateRequest, incidentController.getIncidentStatus);

/**
 * @swagger
 * /incidents/{id}/status:
 *   patch:
 *     tags: [Incidents]
 *     summary: Update Incident Status
 *     description: "authority/admin only. Authorities can only move to a status allowed by the transition map (reported→active→contained→resolved→archived, with archived reachable from anywhere); admins can force any transition. Every change appends an entry to statusHistory (the Incident Timeline)."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [reported, active, contained, resolved, archived] }
 *               note: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { incident: { $ref: '#/components/schemas/Incident' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Invalid status transition for a non-admin actor }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/:id/status',
  authorize('authority', 'admin'),
  [idParamValidator, body('status').isIn(STATUSES), body('note').optional().isLength({ max: 500 })],
  validateRequest,
  incidentController.updateIncidentStatus
);

// ---------------------------------------------------------------------------
// History (ActivityLog audit trail) / Timeline (status lifecycle)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents/{id}/history:
 *   get:
 *     tags: [Incidents]
 *     summary: Incident History
 *     description: Full audit trail from ActivityLog — every create/update/status-change/delete action recorded against this incident, newest first.
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
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get(
  '/:id/history',
  authorize('authority', 'admin'),
  [idParamValidator],
  validateRequest,
  incidentController.getIncidentHistory
);

/**
 * @swagger
 * /incidents/{id}/timeline:
 *   get:
 *     tags: [Incidents]
 *     summary: Incident Timeline
 *     description: Chronological (oldest-first) sequence of status transitions — reported → active → contained → resolved/archived — each with who changed it and when.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ordered status-change events
 *         content:
 *           application/json:
 *             example: { success: true, message: "Incident timeline fetched", data: { timeline: [{ status: "reported", changedAt: "2026-08-06T10:00:00.000Z", changedBy: null, note: null }, { status: "active", changedAt: "2026-08-06T10:20:00.000Z", changedBy: { name: "Amit Rao", role: "authority" }, note: "Confirmed on ground" }] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/:id/timeline', [idParamValidator], validateRequest, incidentController.getIncidentTimeline);

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /incidents/{id}:
 *   delete:
 *     tags: [Incidents]
 *     summary: Delete Incident
 *     description: "admin only. Hard delete, blocked (409) if any Task, CitizenReport, or ChatRoom references this incident — archive it via PATCH /incidents/{id}/status instead of deleting a live incident."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Incident deleted, no content returned }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Incident has dependent records — archive instead of deleting }
 */
router.delete(
  '/:id',
  authorize('admin'),
  [idParamValidator],
  validateRequest,
  incidentController.deleteIncident
);

module.exports = router;
