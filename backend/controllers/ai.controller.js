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
 * Every wrapper method below now calls the real Python ai_service
 * (FastAPI + BeeAI + IBM Granite) over HTTP — see services/ibm/*.service.js
 * and services/ibm/aiServiceClient.js. This controller stays unchanged
 * from its original architecture-only version on purpose: the whole
 * point of the services/ibm/* boundary was that real AI logic could land
 * behind it without touching routing, validation, or response shape here.
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
