/**
 * services/ibm/beeai.service.js
 * IBM BeeAI (BOB) — the mandatory multi-agent orchestration layer. Per
 * the architecture doc, this is where a Risk Analyst Agent hands off to
 * a Volunteer Coordinator Agent, which hands off to a Report Generator
 * Agent. In this integration that orchestration runs inside ai_service
 * (BeeAIDisasterCoordinator, see ai_service/app/services/agents/coordinator.py,
 * exposed at POST /chat) — this wrapper triggers it over HTTP and, for
 * the two methods that are actually routed to from Node
 * (routes/v1/ai.routes.js), also does the DB lookups needed to build a
 * real request out of the IDs the route receives.
 *
 * Role per method (see IBMServiceBase for the shared method contracts):
 * - analyzeRisk: REAL — the "full agent-orchestrated" counterpart to
 *   WatsonxService's single risk-score call. Always computes the real
 *   deterministic score (POST /risk-score, same as WatsonxService) and,
 *   when an `incidentId` is supplied, additionally runs the Granite-backed
 *   multi-agent chain (POST /chat) and folds its reasoning into
 *   `rawModelOutput.orchestration`. Without an `incidentId` there is no
 *   incident to orchestrate around, so this degrades gracefully to the
 *   deterministic score alone (documented via `rawModelOutput.orchestration = null`,
 *   not silently pretended-away).
 * - generateReport: REAL — delegates to GraniteService.generateReport.
 *   Per the architecture doc, BeeAI's real role here is triggering "the
 *   Report Generator Agent, which itself would call RAGService then
 *   GraniteService" — ai_service's POST /report already performs that
 *   RAG-then-Granite chain server-side, so there is no separate
 *   orchestration step to add on the Node side; duplicating the call
 *   here instead of reusing GraniteService's would just be the same
 *   HTTP request twice.
 * - assignVolunteer: REAL — the Volunteer Coordinator Agent's entry
 *   point. Loads the Task and candidate Volunteers, builds ai_service's
 *   VolunteerMatchingRequest, and calls POST /assign. This sits ABOVE
 *   the deterministic skill-overlap check in services/task.service.js's
 *   acceptTask — it recommends, it does not itself assign anything, and
 *   the dummy rule remains the system of record there, unchanged.
 * - summarizeIncident: REAL — delegates to GraniteService.summarizeIncident,
 *   for the same reuse reason as generateReport above.
 */

const IBMServiceBase = require('./IBMServiceBase');
const { aiServiceClient } = require('./aiServiceClient');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../utils/logger');
const Task = require('../../models/Task.model');
const Volunteer = require('../../models/Volunteer.model');
const GraniteService = require('./granite.service');
const {
  buildRiskScoringRequest,
  mapRiskScoringResponseToLegacy,
  buildVolunteerMatchingRequest,
  mapVolunteerMatchingResponseToLegacy,
} = require('./mappers');

const graniteService = new GraniteService();

class BeeAIService extends IBMServiceBase {
  constructor() {
    super('BeeAIService', ['BEEAI_ENDPOINT', 'BEEAI_API_KEY']);
  }

  /**
   * @param {{ riskZoneId?: string, incidentId?: string, hazardType?: string, satelliteData?: object, roadGraph?: object, weatherData?: object, historicalContext?: Array }} input
   */
  async analyzeRisk(input = {}) {
    const scoreRequest = buildRiskScoringRequest({
      areaId: input.riskZoneId || input.areaId,
      satelliteData: input.satelliteData,
      roadGraph: input.roadGraph,
      weatherData: input.weatherData,
      historicalContext: input.historicalContext,
    });
    const scoreResponse = await aiServiceClient.postJSON('/risk-score', scoreRequest);
    const legacy = mapRiskScoringResponseToLegacy(scoreResponse);

    if (!input.incidentId) {
      logger.info('BeeAIService.analyzeRisk: no incidentId supplied, skipping agent orchestration', {
        areaId: scoreRequest.area_id,
      });
      legacy.rawModelOutput.orchestration = null;
      return legacy;
    }

    try {
      const orchestration = await aiServiceClient.postJSON('/chat', {
        incident_id: String(input.incidentId),
        incident_context:
          input.incidentContext ||
          `Risk analysis for area ${scoreRequest.area_id}: overall risk ${legacy.riskLevel} (score ${legacy.riskScore}/100).`,
        area_id: scoreRequest.area_id,
      });
      legacy.rawModelOutput.orchestration = {
        status: orchestration.status,
        finalAnswer: orchestration.final_answer,
        agentResults: orchestration.agent_results,
        reasoningFlow: orchestration.reasoning_flow,
        failures: orchestration.failures,
      };
    } catch (err) {
      // Orchestration is an enrichment on top of the real, already-computed
      // score above — if the multi-agent chain fails, surface the failure
      // in the payload instead of failing the whole request, since we
      // still have a valid deterministic score to return.
      logger.warn('BeeAIService.analyzeRisk: agent orchestration step failed, returning score without it', {
        incidentId: input.incidentId,
        error: err.message,
      });
      legacy.rawModelOutput.orchestration = { error: err.message };
    }

    return legacy;
  }

  /**
   * @param {{ incidentContext: string, outputType?: string, audience?: string, language?: string, indexName?: string, locationName?: string }} input
   */
  async generateReport(input) {
    return graniteService.generateReport(input);
  }

  /**
   * @param {{ taskId: string, candidateVolunteerIds?: string[] }} input
   */
  async assignVolunteer(input = {}) {
    if (!input.taskId) {
      throw new ApiError(422, 'assignVolunteer requires "taskId".');
    }

    const task = await Task.findById(input.taskId).populate('incident', 'severity');
    if (!task) throw new ApiError(404, 'Task not found');

    const candidateFilter = input.candidateVolunteerIds?.length
      ? { _id: { $in: input.candidateVolunteerIds } }
      : { availability: 'available' };
    const volunteers = await Volunteer.find(candidateFilter).limit(50).lean();

    if (volunteers.length === 0) {
      return {
        recommendedVolunteerId: null,
        rationale: 'No candidate volunteers were found (none available and no candidateVolunteerIds supplied).',
        confidence: 0,
        alternates: [],
        rankedVolunteers: [],
      };
    }

    const request = buildVolunteerMatchingRequest({
      incidentId: task.incident?._id || task.incident,
      incidentSeverity: task.incident?.severity || 'moderate',
      requiredSkills: task.requiredSkills,
      volunteers,
      taskLocation: task.location,
      limit: 20,
    });

    const response = await aiServiceClient.postJSON('/assign', request);
    return mapVolunteerMatchingResponseToLegacy(response);
  }

  /**
   * @param {{ incidentId: string, incidentContext: string, maxLength?: number, audience?: string, language?: string }} input
   */
  async summarizeIncident(input) {
    return graniteService.summarizeIncident(input);
  }
}

module.exports = BeeAIService;
