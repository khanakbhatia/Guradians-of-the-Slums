/**
 * routes/v1/riskZone.routes.js
 * Mounted at /api/v1/risk-zones in routes/v1/index.js.
 * No AI/agent logic — every endpoint is a direct database read/write.
 * Score computation itself happens upstream (the CV/risk-scoring pipeline);
 * this API only stores and serves whatever score it's given.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const riskZoneController = require('../../controllers/riskZone.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { HAZARD_TYPES, RISK_LEVELS } = require('../../models/RiskZone.model');

const router = express.Router();

router.use(protect); // every risk-zone route requires authentication

const idParamValidator = param('id').isMongoId().withMessage('Invalid risk zone id');

const bboxValidators = [
  query('minLng').optional().isFloat({ min: -180, max: 180 }),
  query('minLat').optional().isFloat({ min: -90, max: 90 }),
  query('maxLng').optional().isFloat({ min: -180, max: 180 }),
  query('maxLat').optional().isFloat({ min: -90, max: 90 }),
];

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones:
 *   post:
 *     tags: [RiskZones]
 *     summary: Create Risk Zone
 *     description: "authority/admin only. Intended for manual entry/correction — ongoing scoring updates from the risk pipeline go through PATCH /risk-zones/{id}/score instead."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [blockId, settlement, geometry, hazardType]
 *             properties:
 *               blockId: { type: string, example: "BLOCK-14" }
 *               name: { type: string }
 *               settlement: { type: string, example: "Dharavi" }
 *               hazardType: { type: string, enum: [flood, fire, structural, landslide, other] }
 *               geometry:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Polygon] }
 *                   coordinates: { type: array, description: "GeoJSON Polygon ring(s)" }
 *               populationEstimate: { type: integer, minimum: 0 }
 *               riskScore: { type: number, minimum: 0, maximum: 100, description: "Optional starting score, default 0" }
 *               confidence: { type: number, minimum: 0, maximum: 1 }
 *     responses:
 *       201:
 *         description: Risk zone created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZone: { $ref: '#/components/schemas/RiskZone' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       409: { description: blockId already exists }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  authorize('authority', 'admin'),
  [
    body('blockId').trim().isLength({ min: 2, max: 30 }),
    body('settlement').trim().isLength({ min: 2, max: 150 }),
    body('hazardType').isIn(HAZARD_TYPES),
    body('geometry.coordinates').isArray({ min: 1 }),
    body('populationEstimate').optional().isInt({ min: 0 }),
    body('riskScore').optional().isFloat({ min: 0, max: 100 }),
    body('confidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  validateRequest,
  riskZoneController.createRiskZone
);

// ---------------------------------------------------------------------------
// Read — list, nearby, heatmap, geojson (all before /:id)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones:
 *   get:
 *     tags: [RiskZones]
 *     summary: List risk zones
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-riskScore" }
 *       - in: query
 *         name: riskLevel
 *         schema: { type: string, example: "high,critical" }
 *         description: Filter by Severity — exact match, comma-separated for multiple
 *       - in: query
 *         name: hazardType
 *         schema: { type: string }
 *       - in: query
 *         name: settlement
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated risk zone list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZones: { type: array, items: { $ref: '#/components/schemas/RiskZone' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('riskLevel').optional().isString(),
  ],
  validateRequest,
  riskZoneController.listRiskZones
);

/**
 * @swagger
 * /risk-zones/nearby:
 *   get:
 *     tags: [RiskZones]
 *     summary: Nearby Risk Zones
 *     description: Geospatial query using $nearSphere — results are pre-sorted nearest-first by MongoDB.
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
 *         schema: { type: number, default: 5 }
 *       - in: query
 *         name: riskLevel
 *         schema: { type: string, enum: [low, moderate, high, critical] }
 *     responses:
 *       200:
 *         description: Risk zones within radius, nearest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZones: { type: array, items: { $ref: '#/components/schemas/RiskZone' } } } }
 *       400: { description: Missing lng/lat }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/nearby',
  [
    query('lng').isFloat({ min: -180, max: 180 }),
    query('lat').isFloat({ min: -90, max: 90 }),
    query('radiusKm').optional().isFloat({ min: 0.1, max: 100 }),
    query('riskLevel').optional().isIn(RISK_LEVELS),
  ],
  validateRequest,
  riskZoneController.nearbyRiskZones
);

/**
 * @swagger
 * /risk-zones/heatmap:
 *   get:
 *     tags: [RiskZones]
 *     summary: Heatmap Data
 *     description: "Lightweight FeatureCollection optimized for map coloring — trimmed properties (blockId, settlement, hazardType, riskScore, riskLevel only). Wrapped in the standard response envelope. Supports an optional viewport bounding box so a zoomed-in map only pulls what's visible. Cached 15s."
 *     parameters:
 *       - in: query
 *         name: minLng
 *         schema: { type: number }
 *       - in: query
 *         name: minLat
 *         schema: { type: number }
 *       - in: query
 *         name: maxLng
 *         schema: { type: number }
 *       - in: query
 *         name: maxLat
 *         schema: { type: number }
 *       - in: query
 *         name: riskLevel
 *         schema: { type: string, example: "high,critical" }
 *       - in: query
 *         name: hazardType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "GeoJSON FeatureCollection (trimmed properties), inside the standard envelope's `data`"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Heatmap data fetched", data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.85,19.05],[72.86,19.05],[72.86,19.06],[72.85,19.06],[72.85,19.05]]] }, properties: { blockId: "BLOCK-14", settlement: "Dharavi", hazardType: "flood", riskScore: 78, riskLevel: "high" } }] } }
 *       400: { description: Partial bounding box supplied }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get('/heatmap', bboxValidators, validateRequest, riskZoneController.getHeatmapData);

/**
 * @swagger
 * /risk-zones/geojson:
 *   get:
 *     tags: [RiskZones]
 *     summary: GeoJSON Export
 *     description: "Spec-compliant GeoJSON FeatureCollection with full properties, returned RAW at the top level (not wrapped in the response envelope) — this is what you point a Leaflet/Mapbox GeoJSON layer or an external GIS tool directly at. Content-Type: application/geo+json. Cached 15s."
 *     parameters:
 *       - in: query
 *         name: minLng
 *         schema: { type: number }
 *       - in: query
 *         name: minLat
 *         schema: { type: number }
 *       - in: query
 *         name: maxLng
 *         schema: { type: number }
 *       - in: query
 *         name: maxLat
 *         schema: { type: number }
 *       - in: query
 *         name: riskLevel
 *         schema: { type: string }
 *       - in: query
 *         name: hazardType
 *         schema: { type: string }
 *       - in: query
 *         name: settlement
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Raw GeoJSON FeatureCollection (NOT wrapped in the standard envelope)
 *         content:
 *           application/geo+json:
 *             example: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[[72.85,19.05],[72.86,19.05],[72.86,19.06],[72.85,19.06],[72.85,19.05]]] }, properties: { blockId: "BLOCK-14", name: "Riverside Block 14", settlement: "Dharavi", hazardType: "flood", riskScore: 78, riskLevel: "high", confidence: 0.86, populationEstimate: 2400, dataSource: "satellite", lastAnalyzedAt: "2026-08-06T04:00:00.000Z" } }] }
 *       400: { description: Partial bounding box supplied }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get('/geojson', bboxValidators, validateRequest, riskZoneController.getGeoJSON);

// ---------------------------------------------------------------------------
// Read — single zone
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones/{id}:
 *   get:
 *     tags: [RiskZones]
 *     summary: Get Risk Zone
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Risk zone
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZone: { $ref: '#/components/schemas/RiskZone' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, riskZoneController.getRiskZone);

// ---------------------------------------------------------------------------
// Update (metadata)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones/{id}:
 *   patch:
 *     tags: [RiskZones]
 *     summary: Update Risk Zone
 *     description: "authority/admin only. Metadata only (name, settlement, hazardType, populationEstimate, geometry) — does NOT accept riskScore/confidence; use PATCH /risk-zones/{id}/score for those."
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
 *               name: { type: string }
 *               settlement: { type: string }
 *               hazardType: { type: string, enum: [flood, fire, structural, landslide, other] }
 *               populationEstimate: { type: integer, minimum: 0 }
 *               geometry: { type: object }
 *     responses:
 *       200:
 *         description: Risk zone updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZone: { $ref: '#/components/schemas/RiskZone' } } }
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
    body('name').optional().trim().isLength({ max: 150 }),
    body('settlement').optional().trim().isLength({ min: 2, max: 150 }),
    body('hazardType').optional().isIn(HAZARD_TYPES),
    body('populationEstimate').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  riskZoneController.updateRiskZone
);

// ---------------------------------------------------------------------------
// Score — dedicated endpoints (Risk Score feature)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones/{id}/score:
 *   get:
 *     tags: [RiskZones]
 *     summary: Risk Score
 *     description: Current score, derived riskLevel, confidence, contributing factors, and when it was last analyzed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Score snapshot
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk score fetched", data: { score: { riskScore: 78, riskLevel: "high", confidence: 0.86, contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }], dataSource: "satellite", lastAnalyzedAt: "2026-08-06T04:00:00.000Z" } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 */
router.get('/:id/score', [idParamValidator], validateRequest, riskZoneController.getRiskScore);

/**
 * @swagger
 * /risk-zones/{id}/score:
 *   patch:
 *     tags: [RiskZones]
 *     summary: Update Risk Score
 *     description: "authority/admin only (a system/pipeline caller would use a service-to-service credential — out of scope here). riskLevel is re-derived automatically from riskScore; lastAnalyzedAt is set to now."
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
 *             properties:
 *               riskScore: { type: number, minimum: 0, maximum: 100 }
 *               confidence: { type: number, minimum: 0, maximum: 1 }
 *               dataSource: { type: string, enum: [satellite, citizen_report, historical, manual, agent_reassessment] }
 *               contributingFactors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     factor: { type: string }
 *                     weight: { type: number, minimum: 0, maximum: 1 }
 *     responses:
 *       200:
 *         description: "Score updated, riskLevel re-derived"
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { riskZone: { $ref: '#/components/schemas/RiskZone' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/:id/score',
  authorize('authority', 'admin'),
  [
    idParamValidator,
    body('riskScore').optional().isFloat({ min: 0, max: 100 }),
    body('confidence').optional().isFloat({ min: 0, max: 1 }),
    body('dataSource').optional().isIn(['satellite', 'citizen_report', 'historical', 'manual', 'agent_reassessment']),
    body('contributingFactors').optional().isArray(),
  ],
  validateRequest,
  riskZoneController.updateRiskScore
);

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /risk-zones/{id}:
 *   delete:
 *     tags: [RiskZones]
 *     summary: Delete Risk Zone
 *     description: "admin only. Blocked (409) if any Incident references this zone."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Risk zone deleted }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Zone has linked incidents }
 */
router.delete(
  '/:id',
  authorize('admin'),
  [idParamValidator],
  validateRequest,
  riskZoneController.deleteRiskZone
);

module.exports = router;
