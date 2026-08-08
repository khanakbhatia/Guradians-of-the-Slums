/**
 * services/ibm/rag.service.js
 * The RAG (retrieval-augmented generation) grounding layer — sits
 * between the agents and Granite. Its job is retrieval only: given a
 * query, pull relevant passages from historical disaster records,
 * municipal SOPs, NGO guides, and weather bulletins, with citations.
 * It does NOT generate prose itself (that's Granite's job, downstream
 * of whatever this returns) — this is the piece that answers "why not
 * just prompt an LLM directly" by grounding every generated claim in a
 * retrieved, citable source.
 *
 * Role per method (documentation only — nothing below executes AI logic):
 * - analyzeRisk: retrieves similar historical risk cases / past incidents
 *   in comparable zones, as context for whatever computes the score.
 * - generateReport: retrieves the grounding documents (e.g. the actual
 *   municipal flood SOP) a report should cite before Granite writes it.
 * - assignVolunteer: retrieves historical task/volunteer outcome
 *   patterns as context — NOT a ranking signal by itself, just source
 *   material the coordinator agent could reason over.
 * - summarizeIncident: retrieves related past incidents for context so
 *   a summary can note "this matches a prior pattern," when relevant.
 */

const IBMServiceBase = require('./IBMServiceBase');

class RAGService extends IBMServiceBase {
  constructor() {
    super('RAGService', ['RAG_VECTOR_STORE_URL', 'RAG_API_KEY', 'RAG_COLLECTION_NAME']);
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

module.exports = RAGService;
