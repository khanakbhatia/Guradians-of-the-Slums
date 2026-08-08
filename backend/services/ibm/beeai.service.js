/**
 * services/ibm/beeai.service.js
 * IBM BeeAI (BOB) — the mandatory multi-agent orchestration layer. Per
 * the architecture doc, this is where a Risk Analyst Agent hands off to
 * a Volunteer Coordinator Agent, which hands off to a Report Generator
 * Agent — BeeAI coordinates that handoff and delegates the actual work
 * to watsonx-hosted models (Granite) and RAG underneath. This wrapper
 * does not itself reason about anything; it represents "trigger the
 * agent chain and get back its result."
 *
 * Role per method (documentation only — nothing below executes AI logic):
 * - analyzeRisk: triggers the Risk Analyst Agent's handoff chain.
 * - generateReport: triggers the Report Generator Agent (which itself
 *   would call RAGService then GraniteService as part of its handoff).
 * - assignVolunteer: triggers the Volunteer Coordinator Agent — this is
 *   the eventual smart-matching layer that would sit ABOVE the
 *   deterministic skill-overlap check in services/task.service.js, not
 *   replace it outright; the dummy rule stays as a safe fallback.
 * - summarizeIncident: typically a byproduct of the Report Generator
 *   Agent's run, exposed here as its own callable step for cases that
 *   only need the summary, not a full report.
 */

const IBMServiceBase = require('./IBMServiceBase');

class BeeAIService extends IBMServiceBase {
  constructor() {
    super('BeeAIService', ['BEEAI_ENDPOINT', 'BEEAI_API_KEY']);
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

module.exports = BeeAIService;
