/**
 * controllers/ai.controller.js
 * Thin HTTP layer over services/ibm/*. Every handler here does exactly
 * one thing: validate input, call one IBM service wrapper method, return
 * its result. No orchestration logic, no prompt construction, no
 * decision-making about WHICH service to call happens at request time —
 * that mapping is fixed per-route (see routes/v1/ai.routes.js header)
 * and was a deliberate architecture choice, not something M3's callers
 * configure per-request.
 *
 * Every one of these currently resolves to a 501 (via the IBM service
 * layer's _notImplemented()) until the AI logic behind that wrapper
 * method is implemented — that's expected, not a bug. The route/
 * validation/response-shape work is what M3 gets to build against today.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { beeAIService, watsonxService, graniteService } = require('../services/ibm');

const analyze = asyncHandler(async (req, res) => {
  const result = await beeAIService.analyzeRisk(req.body);
  res.status(200).json(new ApiResponse(200, result, 'Risk analysis complete'));
});

const riskScore = asyncHandler(async (req, res) => {
  const result = await watsonxService.analyzeRisk(req.body);
  res.status(200).json(new ApiResponse(200, result, 'Risk score computed'));
});

const generateReport = asyncHandler(async (req, res) => {
  const result = await beeAIService.generateReport(req.body);
  res.status(200).json(new ApiResponse(200, result, 'Report generated'));
});

const assignVolunteers = asyncHandler(async (req, res) => {
  const result = await beeAIService.assignVolunteer(req.body);
  res.status(200).json(new ApiResponse(200, result, 'Volunteer assignment recommended'));
});

const explainRisk = asyncHandler(async (req, res) => {
  const result = await graniteService.analyzeRisk(req.body);
  res.status(200).json(new ApiResponse(200, result, 'Risk explanation generated'));
});

module.exports = { analyze, riskScore, generateReport, assignVolunteers, explainRisk };
