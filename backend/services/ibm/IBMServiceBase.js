/**
 * services/ibm/IBMServiceBase.js
 * Shared contract for every IBM service wrapper (Granite, BeeAI, watsonx,
 * RAG, Data Prep Kit). This file defines WHAT each wrapper exposes and
 * WHY — it does not call any IBM API, does not construct a prompt, and
 * does not contain any AI logic. Every method throws until a real
 * implementation replaces it; that's intentional, not an oversight —
 * silently returning fake data would be worse than a clear 501, because
 * calling code could mistake a stub response for a real one.
 *
 * Every subclass exposes the same four methods so callers (services,
 * and eventually an orchestration layer) can treat any IBM service
 * interchangeably at the interface level, even though each one's
 * REAL eventual implementation will do something quite different under
 * each method name — see the per-service role notes in each subclass file.
 */

const ApiError = require('../../utils/ApiError');

class IBMServiceBase {
  /**
   * @param {string} serviceName - used in error messages and isConfigured() diagnostics
   * @param {string[]} requiredEnvVars - keys into config/env.js this service needs before it can be considered "configured" (does not verify the credentials are *valid*, only that they're *present*)
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

  /** Every stub method routes through here — one place that defines the "not implemented" contract. */
  _notImplemented(methodName) {
    throw new ApiError(
      501,
      `${this.serviceName}.${methodName}() is architecture-only — no AI logic implemented. ` +
        'Replace this method body with the real IBM SDK/API call when that constraint is lifted.'
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
