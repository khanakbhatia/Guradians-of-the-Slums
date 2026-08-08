/**
 * services/ibm/granite.service.js
 * IBM Granite — the generation model. Tuned for enterprise/document-
 * grounded text generation with strong multilingual support, which is
 * why it's the natural fit for citizen-facing alerts and briefings in
 * a multi-language settlement (per the architecture doc's Section 3).
 * ai_service runs Granite locally (an Ollama-compatible runtime — see
 * ai_service/app/integrations/local_granite.py) behind a RAG-grounding
 * guard that refuses to generate ungrounded text (GraniteClient in
 * ai_service/app/services/llm/granite_client.py); this wrapper calls
 * that guarded pipeline over HTTP via POST /report.
 *
 * Role per method (see IBMServiceBase for the shared method contracts):
 * - analyzeRisk: NOT Granite's natural job (it generates text, it
 *   doesn't score) — per the original architecture note, a real
 *   implementation has Granite *explain* a risk score computed
 *   elsewhere ("why is this block critical"), not compute the score
 *   itself. Implemented here as a call to ai_service's POST /explain,
 *   which does exactly that (RiskScoringEngine's explanation output,
 *   not a fresh score) — this deliberately returns an explanation-
 *   shaped payload rather than the generic {riskScore,...} shape other
 *   analyzeRisk implementations return, matching what routes/v1/ai.routes.js's
 *   POST /ai/explain-risk actually needs.
 * - generateReport: REAL — Granite's core use case. Calls POST /report,
 *   which retrieves grounding context via RAG and only then generates,
 *   refusing (422) if no grounding context is found rather than
 *   hallucinating one.
 * - assignVolunteer: NOT Granite's natural job (matching is BeeAI's
 *   territory — see beeai.service.js) and nothing routes to this
 *   method here. TODO: if a future feature wants Granite to draft the
 *   human-readable rationale text for an assignment BeeAI already
 *   decided (rather than deciding the assignment itself), that would
 *   also call POST /report with output_type set appropriately.
 * - summarizeIncident: Granite's other core use case — condenses an
 *   incident into a short summary. Implemented as a POST /report call
 *   with output_type "incident_report"; nothing currently routes to
 *   this method (no /ai/summarize-incident route exists yet).
 */

const IBMServiceBase = require('./IBMServiceBase');
const { aiServiceClient } = require('./aiServiceClient');
const ApiError = require('../../utils/ApiError');
const {
  buildRiskScoringRequest,
  mapExplainabilityResponse,
  buildGraniteGenerationRequest,
  mapGraniteGenerationResponseToLegacy,
} = require('./mappers');

class GraniteService extends IBMServiceBase {
  constructor() {
    super('GraniteService', ['WATSONX_API_KEY', 'WATSONX_URL', 'WATSONX_PROJECT_ID', 'GRANITE_MODEL_ID']);
  }

  /**
   * Explanation-only risk output (see class doc above for why this
   * deviates from the generic {riskScore,...} shape).
   * @param {{ riskZoneId?: string, hazardType?: string, satelliteData?: object, roadGraph?: object, weatherData?: object, historicalContext?: Array }} input
   * @returns {Promise<{ areaId: string, explanations: object, visualOverlays: Array }>}
   */
  async analyzeRisk(input = {}) {
    const request = buildRiskScoringRequest({
      areaId: input.riskZoneId || input.areaId,
      satelliteData: input.satelliteData,
      roadGraph: input.roadGraph,
      weatherData: input.weatherData,
      historicalContext: input.historicalContext,
    });
    const response = await aiServiceClient.postJSON('/explain', request);
    return mapExplainabilityResponse(response);
  }

  /**
   * @param {{ incidentContext: string, outputType?: string, audience?: 'authority'|'volunteer'|'citizen', language?: string, indexName?: string, locationName?: string }} input
   */
  async generateReport(input = {}) {
    if (!input.incidentContext) {
      // Fail fast with a clear, actionable message rather than letting
      // ai_service reject an empty grounding query — this is Node-side
      // input validation, not AI logic.
      throw new ApiError(422, 'generateReport requires "incidentContext" (a text description to ground the report on).');
    }
    const request = buildGraniteGenerationRequest(input);
    const response = await aiServiceClient.postJSON('/report', request);
    return mapGraniteGenerationResponseToLegacy(response, { language: input.language });
  }

  async assignVolunteer(input) {
    // TODO: wire to POST /report (output_type reused for a rationale-drafting
    // prompt) if/when a route needs Granite-authored assignment rationale
    // text on top of BeeAIService.assignVolunteer's decision. Nothing calls
    // this today — see routes/v1/ai.routes.js's POST /ai/assign-volunteers,
    // which maps to BeeAIService.assignVolunteer instead.
    return super.assignVolunteer(input);
  }

  /**
   * @param {{ incidentId: string, incidentContext: string, maxLength?: number, audience?: 'authority'|'volunteer'|'citizen', language?: string }} input
   */
  async summarizeIncident(input = {}) {
    if (!input.incidentContext) {
      throw new ApiError(422, 'summarizeIncident requires "incidentContext" (the incident/report text to summarize).');
    }
    const request = buildGraniteGenerationRequest({ ...input, outputType: 'incident_report' });
    const response = await aiServiceClient.postJSON('/report', request);
    const mapped = mapGraniteGenerationResponseToLegacy(response, { language: input.language });
    // Best-effort key points: split the generated narrative into sentences.
    // This is text post-processing of a real, already-generated report —
    // not new AI-generated content — so it stays out of ai_service.
    const keyPoints = mapped.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, input.maxLength ? Math.max(1, Math.ceil(input.maxLength / 80)) : 5);
    return { summary: mapped.body, keyPoints, generatedAt: mapped.generatedAt };
  }
}

module.exports = GraniteService;
