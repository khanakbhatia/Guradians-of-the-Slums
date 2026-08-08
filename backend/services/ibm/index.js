/**
 * services/ibm/index.js
 * Single entry point for the IBM service layer. Exports both the classes
 * (for testing, or if a caller needs a fresh instance) and ready-to-use
 * singletons (for normal application code — one instance per service is
 * all any caller needs, since these wrappers are stateless besides their
 * config).
 *
 * Usage once real implementations replace the stubs:
 *   const { graniteService } = require('../services/ibm');
 *   const report = await graniteService.generateReport({ incidentId });
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
