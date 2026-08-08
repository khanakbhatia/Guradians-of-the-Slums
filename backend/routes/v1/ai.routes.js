/**
 * routes/v1/ai.routes.js
 * Mounted at /api/v1/ai in routes/v1/index.js. The API surface M3 builds
 * AI logic behind — every route below already calls a real
 * services/ibm/* wrapper method; only the wrapper's internals are still
 * unimplemented (they return 501 until that work lands).
 *
 * Route -> wrapper mapping, and why:
 *   POST /analyze           -> BeeAIService.analyzeRisk    (full agent-orchestrated analysis — the Risk Analyst Agent's entry point)
 *   POST /risk-score        -> WatsonxService.analyzeRisk  (a single governed model call, lighter-weight than the full agent chain — for a quick/direct score)
 *   POST /generate-report   -> BeeAIService.generateReport (agent-orchestrated — Report Generator Agent's entry point)
 *   POST /assign-volunteers -> BeeAIService.assignVolunteer (Volunteer Coordinator Agent's entry point — the future upgrade path for task.service.js's dummy skill-match)
 *   POST /explain-risk      -> GraniteService.analyzeRisk  (Granite's documented role for this method is explaining a score, not computing one — matches the "Explain this prediction" feature)
 *
 * This mapping is a starting point, not a constraint the wrappers enforce —
 * change it in this file alone if a different service turns out to fit better.
 */

const express = require('express');
const { body } = require('express-validator');

const aiController = require('../../controllers/ai.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.use(protect, authorize('authority', 'admin'));

const mongoIdOptional = (field) => body(field).optional().isMongoId();

/**
 * @swagger
 * /ai/analyze:
 *   post:
 *     tags: [AI]
 *     summary: Trigger risk analysis (BeeAIService.analyzeRisk)
 *     description: "Full agent-orchestrated risk analysis. Currently returns 501 — architecture only, no AI logic implemented yet (see services/ibm/beeai.service.js)."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               hazardType: { type: string }
 *               satelliteData: { type: object }
 *               weatherData: { type: object }
 *               historicalContext: { type: object }
 *     responses:
 *       200:
 *         description: "{ riskScore, confidence, riskLevel, contributingFactors, rawModelOutput }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk analysis complete", data: { riskScore: 78, confidence: 0.86, riskLevel: "high", contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }, { factor: "rainfall_forecast", weight: 0.35 }], rawModelOutput: {} } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       501: { description: "Not implemented — architecture only" }
 */
router.post('/analyze', [mongoIdOptional('riskZoneId')], validateRequest, aiController.analyze);

/**
 * @swagger
 * /ai/risk-score:
 *   post:
 *     tags: [AI]
 *     summary: Direct risk score (WatsonxService.analyzeRisk)
 *     description: "A single governed model invocation, lighter-weight than the full agent chain behind /analyze. Currently returns 501 — architecture only (see services/ibm/watsonx.service.js)."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               hazardType: { type: string }
 *               satelliteData: { type: object }
 *               weatherData: { type: object }
 *     responses:
 *       200:
 *         description: "{ riskScore, confidence, riskLevel, contributingFactors, rawModelOutput }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk analysis complete", data: { riskScore: 78, confidence: 0.86, riskLevel: "high", contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }, { factor: "rainfall_forecast", weight: 0.35 }], rawModelOutput: {} } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       501: { description: "Not implemented — architecture only" }
 */
router.post('/risk-score', [mongoIdOptional('riskZoneId')], validateRequest, aiController.riskScore);

/**
 * @swagger
 * /ai/generate-report:
 *   post:
 *     tags: [AI]
 *     summary: Generate a report (BeeAIService.generateReport)
 *     description: "Agent-orchestrated report generation (incident briefing / NGO action plan / municipal report). Currently returns 501 — architecture only (see services/ibm/beeai.service.js)."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               incidentId: { type: string }
 *               riskZoneId: { type: string }
 *               audience: { type: string, enum: [authority, volunteer, citizen] }
 *               language: { type: string, example: "en" }
 *     responses:
 *       200:
 *         description: "{ title, body, citations, language, generatedAt }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Report generated", data: { title: "Block 14 Flood Briefing", body: "Rising water levels observed near the primary drainage channel...", citations: [{ source: "Municipal Flood SOP 2023", excerpt: "Evacuation priority for blocks below sea level..." }], language: "en", generatedAt: "2026-08-07T10:00:00.000Z" } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       501: { description: "Not implemented — architecture only" }
 */
router.post(
  '/generate-report',
  [mongoIdOptional('incidentId'), mongoIdOptional('riskZoneId'), body('audience').optional().isIn(['authority', 'volunteer', 'citizen'])],
  validateRequest,
  aiController.generateReport
);

/**
 * @swagger
 * /ai/assign-volunteers:
 *   post:
 *     tags: [AI]
 *     summary: Recommend a volunteer assignment (BeeAIService.assignVolunteer)
 *     description: "Volunteer Coordinator Agent's entry point — the future smart-matching upgrade path above the deterministic skill-overlap check already live in POST /tasks/{id}/accept. This endpoint does not itself assign anything; it only recommends. Currently returns 501 — architecture only (see services/ibm/beeai.service.js)."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId: { type: string }
 *               candidateVolunteerIds: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: "{ recommendedVolunteerId, rationale, confidence, alternates }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Volunteer assignment recommended", data: { recommendedVolunteerId: "507f1f77bcf86cd799439041", rationale: "Nearest available volunteer with matching medical skill", confidence: 0.72, alternates: [{ volunteerId: "507f1f77bcf86cd799439042", score: 0.65 }] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       501: { description: "Not implemented — architecture only" }
 */
router.post(
  '/assign-volunteers',
  [body('taskId').isMongoId(), body('candidateVolunteerIds').optional().isArray(), body('candidateVolunteerIds.*').optional().isMongoId()],
  validateRequest,
  aiController.assignVolunteers
);

/**
 * @swagger
 * /ai/explain-risk:
 *   post:
 *     tags: [AI]
 *     summary: Explain a risk score (GraniteService.analyzeRisk)
 *     description: "Granite's documented role for this method is explaining an already-computed score in plain language, not computing a new one — matches the 'Explain this prediction' feature. Currently returns 501 — architecture only (see services/ibm/granite.service.js)."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               historicalContext: { type: object }
 *     responses:
 *       200:
 *         description: "{ riskScore, confidence, riskLevel, contributingFactors, rawModelOutput }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk explanation generated", data: { riskScore: 78, confidence: 0.86, riskLevel: "high", contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }], rawModelOutput: {} } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       501: { description: "Not implemented — architecture only" }
 */
router.post('/explain-risk', [mongoIdOptional('riskZoneId')], validateRequest, aiController.explainRisk);

module.exports = router;
