/**
 * services/ibm/index.js
 * Single entry point for the IBM service layer. Exports both the classes
 * (for testing, or if a caller needs a fresh instance) and ready-to-use
 * singletons (for normal application code — one instance per service is
 * all any caller needs, since these wrappers are stateless besides their
 * config).
 *
 * Usage:
 *   const { graniteService } = require('../services/ibm');
 *   const report = await graniteService.generateReport({ incidentContext });
 *
 * GraniteService/BeeAIService/WatsonxService call the real ai_service over
 * HTTP (see aiServiceClient.js); RAGService calls ai_service's retrieval
 * endpoint directly; DataPrepService remains architecture-only (no
 * matching ai_service endpoint exists yet — see its file header).
 */

const GraniteService = require('./granite.service');
const BeeAIService = require('./beeai.service');
const WatsonxService = require('./watsonx.service');
const RAGService = require('./rag.service');
const DataPrepService = require('./dataPrep.service');

module.exports = {
  // Classes
  GraniteService,
  BeeAIService,
  WatsonxService,
  RAGService,
  DataPrepService,

  // Singletons
  graniteService: new GraniteService(),
  beeAIService: new BeeAIService(),
  watsonxService: new WatsonxService(),
  ragService: new RAGService(),
  dataPrepService: new DataPrepService(),
};
