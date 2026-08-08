/**
 * services/ibm/watsonx.service.js
 * watsonx.ai — the model-hosting/orchestration layer underneath BeeAI.
 * Where BeeAIService represents "run the agent chain," this represents
 * the lower-level "invoke a specific hosted model with governance and
 * logging." In this integration that single governed call is
 * ai_service's deterministic risk-scoring engine (POST /risk-score,
 * see ai_service/app/api/m2_facade.py -> RiskScoringEngine), which is
 * exactly the "lighter-weight than the full agent chain" call
 * routes/v1/ai.routes.js documents for POST /ai/risk-score.
 *
 * Role per method (see IBMServiceBase for the shared method contracts):
 * - analyzeRisk: REAL — a single call to ai_service's risk-scoring
 *   engine. No BeeAI orchestration, no Granite narrative generation —
 *   just the governed score.
 * - generateReport / assignVolunteer / summarizeIncident: NOT watsonx's
 *   documented role for this project (those belong to BeeAIService /
 *   GraniteService) and nothing routes to them here — left as
 *   documented not-implemented rather than duplicating logic that
 *   already lives in the other two wrappers.
 */

const IBMServiceBase = require('./IBMServiceBase');
const { aiServiceClient } = require('./aiServiceClient');
const { buildRiskScoringRequest, mapRiskScoringResponseToLegacy } = require('./mappers');

class WatsonxService extends IBMServiceBase {
  constructor() {
    super('WatsonxService', ['WATSONX_API_KEY', 'WATSONX_URL', 'WATSONX_PROJECT_ID']);
  }

  /**
   * @param {{ riskZoneId?: string, hazardType?: string, satelliteData?: object, roadGraph?: object, weatherData?: object, historicalContext?: Array }} input
   */
  async analyzeRisk(input = {}) {
    const request = buildRiskScoringRequest({
      areaId: input.riskZoneId || input.areaId,
      satelliteData: input.satelliteData,
      roadGraph: input.roadGraph,
      weatherData: input.weatherData,
      historicalContext: input.historicalContext,
    });
    const response = await aiServiceClient.postJSON('/risk-score', request);
    return mapRiskScoringResponseToLegacy(response);
  }

  async generateReport(input) {
    return super.generateReport(input);
  }

  async assignVolunteer(input) {
    return super.assignVolunteer(input);
  }

  async summarizeIncident(input) {
    return super.summarizeIncident(input);
  }
}

module.exports = WatsonxService;
