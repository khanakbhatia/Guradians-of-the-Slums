/**
 * services/ibm/dataPrep.service.js
 * IBM Data Prep Kit — the ingestion layer. Cleans, normalizes, and
 * chunks raw imagery/text/sensor data BEFORE it reaches any reasoning
 * step. None of the four methods below are this service's natural
 * "final output" the way generateReport is Granite's — for every one
 * of them, DataPrepService's real role is preparing that method's INPUT,
 * not producing its output. Exposed here purely for interface
 * consistency with the other four wrappers.
 *
 * STATUS: still architecture-only (all four methods 501). Unlike
 * GraniteService/BeeAIService/WatsonxService, ai_service does not
 * currently expose a data-prep endpoint through its M2 facade
 * (ai_service/app/api/m2_facade.py) or a generic /api/v1 route this
 * wrapper's four-method interface could map onto — ai_service's data-prep
 * pipeline (app/pipelines/data_preprocessing_pipeline.py) is invoked
 * internally by other pipelines, not exposed as its own HTTP boundary.
 * No Node route calls this wrapper today either. Per the "don't invent
 * functionality" constraint, this stays a documented TODO rather than a
 * guessed integration: when ai_service adds a data-prep endpoint, wire
 * it here the same way granite.service.js/beeai.service.js/watsonx.service.js
 * call services/ibm/aiServiceClient.js.
 *
 * Role per method (documentation only — nothing below executes AI logic):
 * - analyzeRisk: would clean/normalize raw satellite tiles and weather
 *   CSVs into the structured shape a risk-scoring step expects.
 * - generateReport: would clean/chunk source documents (SOPs, historical
 *   records) into retrieval-ready form before RAGService indexes/queries them.
 * - assignVolunteer: would normalize/deduplicate volunteer and task
 *   records (e.g. inconsistent skill-tag casing) before any matching step runs.
 * - summarizeIncident: would deduplicate and clean raw citizen reports
 *   linked to an incident before they're summarized.
 */

const IBMServiceBase = require('./IBMServiceBase');

class DataPrepService extends IBMServiceBase {
  constructor() {
    super('DataPrepService', ['DATAPREP_ENDPOINT', 'DATAPREP_API_KEY']);
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

module.exports = DataPrepService;
