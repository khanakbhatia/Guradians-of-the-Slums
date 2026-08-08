/**
 * routes/v1/ai.routes.js
 * Mounted at /api/v1/ai in routes/v1/index.js. Every route below calls a
 * real services/ibm/* wrapper method, which in turn calls the real
 * Python ai_service (FastAPI + BeeAI + IBM Granite) over HTTP — see
 * services/ibm/aiServiceClient.js for the shared HTTP boundary
 * (timeouts, retries, error normalization) and each services/ibm/*.service.js
 * file for what ai_service endpoint it calls and why.
 *
 * Route -> wrapper -> ai_service mapping, and why:
 *   POST /analyze           -> BeeAIService.analyzeRisk    -> POST /risk-score (+ POST /chat when incidentId is given) — full agent-orchestrated analysis, the Risk Analyst Agent's entry point
 *   POST /risk-score        -> WatsonxService.analyzeRisk  -> POST /risk-score — a single governed model call, lighter-weight than the full agent chain, for a quick/direct score
 *   POST /generate-report   -> BeeAIService.generateReport -> POST /report (via GraniteService) — RAG-grounded generation, the Report Generator Agent's entry point
 *   POST /assign-volunteers -> BeeAIService.assignVolunteer -> POST /assign — the Volunteer Coordinator Agent's entry point; the future upgrade path for task.service.js's dummy skill-match, which stays the system of record for now
 *   POST /explain-risk      -> GraniteService.analyzeRisk  -> POST /explain — Granite's documented role for this method is explaining a score, not computing one; matches the "Explain this prediction" feature
 *
 * This mapping is a starting point, not a constraint the wrappers enforce —
 * change it in this file alone if a different service turns out to fit better.
 *
 * Failure modes surfaced from ai_service (via aiServiceClient.js), on top
 * of this route's own 401/403/422:
 *   422 — ai_service rejected the request (bad input, or Granite's
 *         grounding guard refused to generate ungrounded text)
 *   502 — ai_service returned an unexpected/error response
 *   503 — ai_service is unreachable (not running / network failure)
 *   504 — ai_service did not respond within the configured timeout
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
 *     description: "Full agent-orchestrated risk analysis: always computes a real deterministic risk score (ai_service POST /risk-score), and additionally runs the Granite-backed multi-agent chain (ai_service POST /chat) when incidentId is supplied, folding its reasoning into rawModelOutput.orchestration. See services/ibm/beeai.service.js."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               incidentId: { type: string, description: "Optional — when provided, also runs the full BeeAI multi-agent orchestration chain, not just the deterministic score." }
 *               hazardType: { type: string }
 *               satelliteData: { type: object, description: "Optional pre-computed CV observation (ai_service VisionAnalysisResponse shape, e.g. forwarded from POST /detect). Defaults to an empty observation if omitted." }
 *               roadGraph: { type: object, description: "Optional pre-computed road-graph observation (ai_service GraphAnalysisResponse shape, e.g. forwarded from POST /analyze). Defaults to an empty observation if omitted." }
 *               weatherData: { type: object, description: "{ rainfallMm24h, rainfallMm72h, rainfallIntensityMmPerHr, dataSource }" }
 *               historicalContext: { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         description: "{ riskScore, confidence, riskLevel, contributingFactors, rawModelOutput }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk analysis complete", data: { riskScore: 78, confidence: 0.86, riskLevel: "high", contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }], rawModelOutput: { floodRisk: {}, fireRisk: {}, overallRisk: {}, modelVersion: "1.0.0", orchestration: null } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       502: { description: "ai_service returned an error response" }
 *       503: { description: "ai_service is unreachable" }
 *       504: { description: "ai_service request timed out" }
 */
router.post('/analyze', [mongoIdOptional('riskZoneId'), mongoIdOptional('incidentId')], validateRequest, aiController.analyze);

/**
 * @swagger
 * /ai/risk-score:
 *   post:
 *     tags: [AI]
 *     summary: Direct risk score (WatsonxService.analyzeRisk)
 *     description: "A single governed model invocation (ai_service POST /risk-score), lighter-weight than the full agent chain behind /analyze. See services/ibm/watsonx.service.js."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               hazardType: { type: string }
 *               satelliteData: { type: object, description: "Optional pre-computed CV observation; defaults to an empty observation if omitted." }
 *               roadGraph: { type: object, description: "Optional pre-computed road-graph observation; defaults to an empty observation if omitted." }
 *               weatherData: { type: object, description: "{ rainfallMm24h, rainfallMm72h, rainfallIntensityMmPerHr, dataSource }" }
 *     responses:
 *       200:
 *         description: "{ riskScore, confidence, riskLevel, contributingFactors, rawModelOutput }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk score computed", data: { riskScore: 78, confidence: 0.86, riskLevel: "high", contributingFactors: [{ factor: "drainage_capacity", weight: 0.4 }, { factor: "rainfall_forecast", weight: 0.35 }], rawModelOutput: {} } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       502: { description: "ai_service returned an error response" }
 *       503: { description: "ai_service is unreachable" }
 *       504: { description: "ai_service request timed out" }
 */
router.post('/risk-score', [mongoIdOptional('riskZoneId')], validateRequest, aiController.riskScore);

/**
 * @swagger
 * /ai/generate-report:
 *   post:
 *     tags: [AI]
 *     summary: Generate a report (BeeAIService.generateReport)
 *     description: "RAG-grounded IBM Granite generation (ai_service POST /report — retrieves grounding context, then generates; refuses with 422 if no grounding context is found rather than hallucinating one). Requires incidentContext: a text description of the incident/situation to ground the report on. See services/ibm/beeai.service.js and services/ibm/granite.service.js."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [incidentContext]
 *             properties:
 *               incidentContext: { type: string, description: "Text description of the incident/situation to ground the report on." }
 *               incidentId: { type: string }
 *               riskZoneId: { type: string }
 *               audience: { type: string, enum: [authority, volunteer, citizen] }
 *               language: { type: string, example: "en" }
 *               outputType: { type: string, enum: [incident_report, citizen_alert, ngo_action_plan, authority_briefing, multilingual_alert], description: "Overrides the audience -> output-type default mapping." }
 *     responses:
 *       200:
 *         description: "{ title, body, citations, language, generatedAt }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Report generated", data: { title: "Authority Briefing", body: "Rising water levels observed near the primary drainage channel...", citations: [{ source: "Municipal Flood SOP 2023", excerpt: "chunk-0042" }], language: "en", generatedAt: "2026-08-07T10:00:00.000Z" } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { description: "Validation error, or ai_service's grounding guard refused to generate ungrounded text" }
 *       502: { description: "ai_service returned an error response" }
 *       503: { description: "ai_service is unreachable" }
 *       504: { description: "ai_service request timed out" }
 */
router.post(
  '/generate-report',
  [
    body('incidentContext').isString().trim().notEmpty(),
    mongoIdOptional('incidentId'),
    mongoIdOptional('riskZoneId'),
    body('audience').optional().isIn(['authority', 'volunteer', 'citizen']),
  ],
  validateRequest,
  aiController.generateReport
);

/**
 * @swagger
 * /ai/assign-volunteers:
 *   post:
 *     tags: [AI]
 *     summary: Recommend a volunteer assignment (BeeAIService.assignVolunteer)
 *     description: "Volunteer Coordinator Agent's entry point (ai_service POST /assign) — the smart-matching upgrade path above the deterministic skill-overlap check already live in POST /tasks/{id}/accept. This endpoint does not itself assign anything; it only recommends. See services/ibm/beeai.service.js."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId: { type: string }
 *               candidateVolunteerIds: { type: array, items: { type: string }, description: "Optional — restricts candidates to this list. Defaults to all currently-available volunteers." }
 *     responses:
 *       200:
 *         description: "{ recommendedVolunteerId, rationale, confidence, alternates, rankedVolunteers }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Volunteer assignment recommended", data: { recommendedVolunteerId: "507f1f77bcf86cd799439041", rationale: "Nearest available volunteer with matching medical skill", confidence: 0.72, alternates: [{ volunteerId: "507f1f77bcf86cd799439042", score: 0.65 }], rankedVolunteers: [] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { description: "Task not found" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       502: { description: "ai_service returned an error response" }
 *       503: { description: "ai_service is unreachable" }
 *       504: { description: "ai_service request timed out" }
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
 *     description: "Granite's documented role for this method is explaining a risk score in plain language, not computing a new one (ai_service POST /explain) — matches the 'Explain this prediction' feature. Note the response shape is explanation-shaped ({ areaId, explanations, visualOverlays }), not the generic risk-score shape other analyzeRisk implementations return. See services/ibm/granite.service.js."
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               riskZoneId: { type: string }
 *               satelliteData: { type: object, description: "Optional pre-computed CV observation; defaults to an empty observation if omitted." }
 *               roadGraph: { type: object, description: "Optional pre-computed road-graph observation; defaults to an empty observation if omitted." }
 *               weatherData: { type: object }
 *               historicalContext: { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         description: "{ areaId, explanations: { flood, fire, overall }, visualOverlays }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Risk explanation generated", data: { areaId: "BLOCK-14", explanations: { overall: { why: "Elevated flood risk driven by rainfall and drainage capacity", humanReadableReasoning: "...", confidence: 0.86, featureContributions: [{ featureName: "drainage_capacity", contribution: 0.4, weight: 0.4, direction: "increases_risk", explanation: "..." }], visualOverlays: [] } }, visualOverlays: [] } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       502: { description: "ai_service returned an error response" }
 *       503: { description: "ai_service is unreachable" }
 *       504: { description: "ai_service request timed out" }
 */
router.post('/explain-risk', [mongoIdOptional('riskZoneId')], validateRequest, aiController.explainRisk);

module.exports = router;
