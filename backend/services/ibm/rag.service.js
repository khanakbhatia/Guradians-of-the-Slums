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
 * Unlike dataPrep.service.js, ai_service DOES expose a real retrieval
 * endpoint this wrapper can call: POST /api/v1/rag/retrieve (see
 * ai_service/app/api/v1/rag.py -> RagRetrievalService). It is not part
 * of the M2 facade (ai_service/app/api/m2_facade.py) because retrieval
 * is an internal grounding step, not a caller-facing feature on its
 * own — GraniteService's POST /report already calls it server-side as
 * part of grounded generation, so no Node route needs to call this
 * wrapper directly today. It's implemented here anyway (real HTTP call,
 * no invented data) for any future caller that wants raw grounding
 * context without a full Granite generation.
 *
 * IMPORTANT: because retrieval returns a list of source passages, not
 * prose, the four methods below intentionally do NOT return the generic
 * {riskScore,...}/{title,body,...}/etc. shapes IBMServiceBase documents
 * for the other wrappers — they return `{ query, contexts }`. Forcing a
 * retrieval result into a report or a risk-score shape would mean
 * inventing fields that don't exist; returning the real shape and
 * documenting the deviation is the honest option.
 *
 * Role per method (what query each one issues):
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
const { aiServiceClient } = require('./aiServiceClient');
const ApiError = require('../../utils/ApiError');
const { deepCamelCase } = require('./mappers');

class RAGService extends IBMServiceBase {
  constructor() {
    super('RAGService', ['RAG_VECTOR_STORE_URL', 'RAG_API_KEY', 'RAG_COLLECTION_NAME']);
  }

  /**
   * @param {{ query: string, indexName?: string, topK?: number, sourceTypes?: string[] }} options
   * @returns {Promise<{ query: string, indexName: string, embeddingProvider: string, contexts: Array }>}
   */
  async retrieveContext({ query, indexName = 'disaster_knowledge', topK = 5, sourceTypes = [] } = {}) {
    if (!query) throw new ApiError(422, 'retrieveContext requires "query".');
    const response = await aiServiceClient.postJSON('/api/v1/rag/retrieve', {
      query,
      index_name: indexName,
      top_k: topK,
      source_types: sourceTypes,
    });
    return deepCamelCase(response);
  }

  async analyzeRisk(input = {}) {
    return this.retrieveContext({
      query: `historical risk cases similar to area ${input.riskZoneId || input.areaId || ''} hazard ${input.hazardType || ''}`.trim(),
    });
  }

  async generateReport(input = {}) {
    return this.retrieveContext({ query: input.incidentContext || `report grounding for incident ${input.incidentId || ''}` });
  }

  async assignVolunteer(input = {}) {
    return this.retrieveContext({ query: `volunteer task outcome history for task ${input.taskId || ''}` });
  }

  async summarizeIncident(input = {}) {
    return this.retrieveContext({ query: input.incidentContext || `related past incidents for incident ${input.incidentId || ''}` });
  }
}

module.exports = RAGService;
