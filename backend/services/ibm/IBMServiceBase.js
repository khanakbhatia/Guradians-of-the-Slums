/**
 * services/ibm/IBMServiceBase.js
 * Shared contract for every IBM service wrapper (Granite, BeeAI, watsonx,
 * RAG, Data Prep Kit). This file defines WHAT each wrapper exposes and
 * WHY. It does not call any IBM API and does not construct a prompt
 * itself — every subclass now delegates its real work to the Python
 * ai_service (FastAPI + BeeAI + IBM Granite) over HTTP via
 * services/ibm/aiServiceClient.js; this base class only owns the shared
 * four-method interface and the "not yet wired to an ai_service
 * endpoint" fallback for methods that genuinely have no real
 * implementation yet (see services/ibm/dataPrep.service.js).
 *
 * Every subclass exposes the same four methods so callers (services,
 * and eventually an orchestration layer) can treat any IBM service
 * interchangeably at the interface level, even though each one's
 * REAL implementation does something quite different under each method
 * name — see the per-service role notes in each subclass file, and
 * routes/v1/ai.routes.js for the route -> wrapper -> ai_service endpoint
 * mapping.
 */

const ApiError = require('../../utils/ApiError');

class IBMServiceBase {
  /**
   * @param {string} serviceName - used in error messages and isConfigured() diagnostics
   * @param {string[]} requiredEnvVars - keys into config/env.js this service needs before it can be considered "configured". Every subclass now really only needs AI_SERVICE_URL (the ai_service HTTP boundary handles the actual IBM Granite/BeeAI credentials on the Python side — see ai_service/.env.example); any other vars listed here are legacy/reserved and checked for parity, not because Node reads them directly.
   */
  constructor(serviceName, requiredEnvVars = []) {
    if (new.target === IBMServiceBase) {
      throw new Error('IBMServiceBase is abstract — instantiate a subclass (GraniteService, BeeAIService, etc.)');
    }
    this.serviceName = serviceName;
    this.requiredEnvVars = requiredEnvVars;
  }

  /**
   * Reports whether this service's required env vars are present — a
   * cheap readiness check with no network call, suitable for a future
   * health-check endpoint. Does NOT mean the AI logic behind the method
   * is implemented; that's a separate, code-level readiness question.
   */
  isConfigured() {
    // eslint-disable-next-line global-require
    const env = require('../../config/env');
    return this.requiredEnvVars.every((key) => Boolean(env[key]));
  }

  /**
   * Every method that has no corresponding ai_service endpoint yet (or
   * isn't wired to any Node route today) routes through here — one place
   * that defines the "not implemented" contract. This is intentionally
   * still a hard 501, not a silent fallback: a stub response that looked
   * like a real one would be worse than a clear "not implemented" error.
   */
  _notImplemented(methodName) {
    throw new ApiError(
      501,
      `${this.serviceName}.${methodName}() has no ai_service endpoint wired up yet. ` +
        'See the TODO comment on this method for the endpoint that would back it once available.'
    );
  }

  /**
   * Risk analysis for a RiskZone (or a candidate zone not yet persisted).
   * See each subclass for that service's specific role in this operation.
   * @param {{ riskZoneId?: string, hazardType?: string, satelliteData?: any, weatherData?: any, historicalContext?: any }} input
   * @returns {Promise<{ riskScore: number, confidence: number, riskLevel: string, contributingFactors: Array<{factor:string, weight:number}>, rawModelOutput?: any }>}
   */
  async analyzeRisk(input) {
    return this._notImplemented('analyzeRisk');
  }

  /**
   * Generates a plain-language document — an incident briefing, an NGO
   * action plan, a municipal report — grounded in retrieved context.
   * @param {{ incidentId?: string, riskZoneId?: string, audience?: 'authority'|'volunteer'|'citizen', language?: string }} input
   * @returns {Promise<{ title: string, body: string, citations: Array<{source:string, excerpt:string}>, language: string, generatedAt: Date }>}
   */
  async generateReport(input) {
    return this._notImplemented('generateReport');
  }

  /**
   * Recommends a volunteer for a task. This is the FUTURE upgrade path
   * for the deterministic skill-overlap matching already implemented in
   * services/task.service.js (acceptTask's hasMatchingSkill check) — that
   * dummy rule remains the system of record until this is real; nothing
   * currently calls this method.
   * @param {{ taskId: string, candidateVolunteerIds?: string[] }} input
   * @returns {Promise<{ recommendedVolunteerId: string, rationale: string, confidence: number, alternates: Array<{volunteerId:string, score:number}> }>}
   */
  async assignVolunteer(input) {
    return this._notImplemented('assignVolunteer');
  }

  /**
   * Produces a short summary of an incident (and/or its linked citizen
   * reports) for a briefing, alert, or dashboard card.
   * @param {{ incidentId: string, maxLength?: number, audience?: 'authority'|'volunteer'|'citizen' }} input
   * @returns {Promise<{ summary: string, keyPoints: string[], generatedAt: Date }>}
   */
  async summarizeIncident(input) {
    return this._notImplemented('summarizeIncident');
  }
}

module.exports = IBMServiceBase;
