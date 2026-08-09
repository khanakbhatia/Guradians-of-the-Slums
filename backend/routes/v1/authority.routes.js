const express = require('express');
const authorityController = require('../../controllers/authority.controller');
const { protect, authorize } = require('../../middlewares/auth');

const router = express.Router();

// All authority routes require login and either 'authority' or 'admin' roles
router.use(protect, authorize('authority', 'admin'));

/**
 * GET /api/v1/authority/analytics
 * Returns authority analytics cards, severity mix, zone load, and trend.
 */
router.get('/analytics', authorityController.getAnalytics);

/**
 * GET /api/v1/authority/ai-recommendations
 * Returns active AI recommendations based on live state.
 */
router.get('/ai-recommendations', authorityController.getAiRecommendations);

module.exports = router;
