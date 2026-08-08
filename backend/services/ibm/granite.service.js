/**
 * services/ibm/granite.service.js
 * IBM Granite — the generation model. Tuned for enterprise/document-
 * grounded text generation with strong multilingual support, which is
 * why it's the natural fit for citizen-facing alerts and briefings in
 * a multi-language settlement (per the architecture doc's Section 3).
 *
 * Role per method (documentation only — nothing below executes AI logic):
 * - analyzeRisk: NOT Granite's natural job (it generates text, it doesn't
 *   score). Exposed for interface consistency only; a real implementation
 *   would likely have Granite *explain* a risk score computed elsewhere
 *   ("why is this block critical"), not compute the score itself.
 * - generateReport: Granite's core use case — turns a RAG-grounded
 *   context bundle into a plain-language incident briefing / NGO action
 *   plan / municipal report, in the requested language.
 * - assignVolunteer: NOT Granite's natural job (matching is BeeAI's
 *   territory). Exposed for interface consistency; a real implementation
 *   might have Granite draft the human-readable rationale text for an
 *   assignment BeeAI already decided, not make the decision.
 * - summarizeIncident: Granite's other core use case — condenses an
 *   incident and its linked reports into a short multilingual summary.
 */

const IBMServiceBase = require('./IBMServiceBase');

class GraniteService extends IBMServiceBase {
  constructor() {
    super('GraniteService', ['WATSONX_API_KEY', 'WATSONX_URL', 'WATSONX_PROJECT_ID', 'GRANITE_MODEL_ID']);
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

module.exports = GraniteService;
