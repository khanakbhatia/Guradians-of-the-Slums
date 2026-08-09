const asyncHandler = require('../utils/asyncHandler');
const authorityService = require('../services/authority.service');
const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /authority/analytics
 * Fetches authority dashboard analytics cards and charts data.
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await authorityService.getAnalytics();
  res.status(200).json(new ApiResponse(200, { analytics }, 'Authority analytics fetched'));
});

/**
 * GET /authority/ai-recommendations
 * Generates live RAG recommendations.
 */
const getAiRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await authorityService.getAiRecommendations();
  res.status(200).json(new ApiResponse(200, { recommendations }, 'AI recommendations fetched'));
});

module.exports = {
  getAnalytics,
  getAiRecommendations,
};
