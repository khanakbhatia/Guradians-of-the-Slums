/**
 * services/ibm/watsonx.service.js
 * watsonx.ai — the model-hosting/orchestration layer underneath BeeAI.
 * Where BeeAIService represents "run the agent chain," this represents
 * the lower-level "invoke a specific hosted model with governance and
 * logging." A real implementation would have BeeAIService call into this
 * for the actual model invocations, while this wrapper stays agent-
 * agnostic (it doesn't know about Risk Analyst / Volunteer Coordinator /
 * Report Generator as concepts — that's BeeAI's layer, not this one's).
 *
 * Role per method (documentation only — nothing below executes AI logic):
 * - analyzeRisk: a governed, logged model call that would back the Risk
 *   Analyst Agent's reasoning step.
 * - generateReport: a governed, logged model call that would back the
 *   Report Generator Agent's text-generation step (likely delegating to
 *   GraniteService under the hood in a real implementation).
 * - assignVolunteer: a governed, logged model call that would back the
 *   Volunteer Coordinator Agent's matching step.
 * - summarizeIncident: a governed, logged model call for a standalone
 *   summarization request outside the full agent chain.
 */

const IBMServiceBase = require('./IBMServiceBase');

class WatsonxService extends IBMServiceBase {
  constructor() {
    super('WatsonxService', ['WATSONX_API_KEY', 'WATSONX_URL', 'WATSONX_PROJECT_ID']);
  }

  async analyzeRisk(input) {
    return super.analyzeRisk(input);
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
