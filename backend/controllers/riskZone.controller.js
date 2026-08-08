/**
 * controllers/riskZone.controller.js
 * Thin HTTP layer: parse req, call services/riskZone.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const riskZoneService = require('../services/riskZone.service');

// Heatmap/GeoJSON change only as fast as the risk-scoring pipeline recomputes
// (minutes, not seconds) — a short cache lets a busy dashboard poll without
// hammering the DB on every pan/zoom.
const MAP_EXPORT_CACHE_SECONDS = 15;

const createRiskZone = asyncHandler(async (req, res) => {
  const zone = await riskZoneService.createRiskZone(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, { riskZone: zone }, 'Risk zone created'));
});

const getRiskZone = asyncHandler(async (req, res) => {
  const zone = await riskZoneService.getRiskZoneById(req.params.id);
  res.status(200).json(new ApiResponse(200, { riskZone: zone }, 'Risk zone fetched'));
});

const listRiskZones = asyncHandler(async (req, res) => {
  const { zones, meta } = await riskZoneService.listRiskZones(req.query);
  res.status(200).json(new ApiResponse(200, { riskZones: zones }, 'Risk zones fetched', meta));
});

const nearbyRiskZones = asyncHandler(async (req, res) => {
  const { lng, lat, radiusKm, riskLevel } = req.query;
  const zones = await riskZoneService.nearbyRiskZones({ lng, lat, radiusKm, riskLevel });
  res.status(200).json(new ApiResponse(200, { riskZones: zones }, 'Nearby risk zones fetched'));
});

const getHeatmapData = asyncHandler(async (req, res) => {
  const geojson = await riskZoneService.getHeatmapData(req.query);
  res.set('Cache-Control', `public, max-age=${MAP_EXPORT_CACHE_SECONDS}`);
  res.status(200).json(new ApiResponse(200, geojson, 'Heatmap data fetched'));
});

const getGeoJSON = asyncHandler(async (req, res) => {
  const geojson = await riskZoneService.getGeoJSON(req.query);
  res.set('Cache-Control', `public, max-age=${MAP_EXPORT_CACHE_SECONDS}`);
  res.set('Content-Type', 'application/geo+json');
  res.status(200).json(geojson); // raw FeatureCollection — GeoJSON consumers expect this shape at the top level, not wrapped in the ApiResponse envelope
});

const updateRiskZone = asyncHandler(async (req, res) => {
  const zone = await riskZoneService.updateRiskZone(req.params.id, req.body, req.user.id);
  res.status(200).json(new ApiResponse(200, { riskZone: zone }, 'Risk zone updated'));
});

const getRiskScore = asyncHandler(async (req, res) => {
  const score = await riskZoneService.getRiskScore(req.params.id);
  res.status(200).json(new ApiResponse(200, { score }, 'Risk score fetched'));
});

const updateRiskScore = asyncHandler(async (req, res) => {
  const zone = await riskZoneService.updateRiskScore(req.params.id, req.body, req.user.id);
  res.status(200).json(new ApiResponse(200, { riskZone: zone }, 'Risk score updated'));
});

const deleteRiskZone = asyncHandler(async (req, res) => {
  await riskZoneService.deleteRiskZone(req.params.id);
  res.status(204).send();
});

module.exports = {
  createRiskZone,
  getRiskZone,
  listRiskZones,
  nearbyRiskZones,
  getHeatmapData,
  getGeoJSON,
  updateRiskZone,
  getRiskScore,
  updateRiskScore,
  deleteRiskZone,
};
