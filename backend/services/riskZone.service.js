/**
 * services/riskZone.service.js
 * Pure database operations. Read-heavy endpoints (heatmap, geojson, nearby,
 * list) use .lean() + field projection deliberately — they skip Mongoose
 * document hydration (change-tracking, virtuals, getters) that a map
 * layer or export consumer never needs, which matters once a settlement
 * has hundreds of blocks.
 */

const RiskZone = require('../models/RiskZone.model');
const Incident = require('../models/Incident.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');
const { buildNearFilter, buildBBoxFilter } = require('../utils/geoQuery');

const LIST_FILTER_FIELDS = ['riskLevel', 'hazardType', 'settlement', 'dataSource'];
const LIST_SORT_FIELDS = ['riskScore', 'createdAt', 'settlement', 'lastAnalyzedAt'];
const DEFAULT_SORT = { riskScore: -1 };

// Metadata fields — go through create/update. Score fields are deliberately
// separate (see below) so a metadata edit can never accidentally overwrite
// a score the risk-scoring pipeline just computed, and vice versa.
const CREATE_FIELDS = ['blockId', 'name', 'settlement', 'geometry', 'hazardType', 'populationEstimate'];
const UPDATE_FIELDS = ['name', 'settlement', 'hazardType', 'populationEstimate', 'geometry'];

// Score fields — only touched via getRiskScore/updateRiskScore, matching
// the Incident.status precedent (dedicated endpoint, not the generic PATCH).
const SCORE_UPDATE_FIELDS = ['riskScore', 'confidence', 'contributingFactors', 'dataSource'];

// Minimal projection for map rendering — just enough to color a polygon
// and show a tooltip. Excludes contributingFactors, population, dataSource,
// createdBy: real weight-loss on payload size at hundreds of zones.
const HEATMAP_PROJECTION = 'blockId settlement hazardType riskScore riskLevel geometry';

// Full projection for GeoJSON export — everything a GIS tool or the
// "click a block for detail" panel would want, still excluding
// Mongoose-internal fields and createdBy (an internal audit field, not
// map-consumer data).
const GEOJSON_PROJECTION =
  'blockId name settlement hazardType riskScore riskLevel confidence populationEstimate dataSource lastAnalyzedAt geometry';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createRiskZone = async (payload, actorId) => {
  const existing = await RiskZone.findOne({ blockId: payload.blockId?.toUpperCase() }).lean();
  if (existing) {
    throw new ApiError(409, `blockId "${payload.blockId}" already exists`);
  }

  const data = {};
  for (const field of CREATE_FIELDS) {
    if (payload[field] !== undefined) data[field] = payload[field];
  }
  // riskScore/confidence are schema-required — a manually-created zone needs
  // starting values even though ongoing updates go through updateRiskScore.
  data.riskScore = payload.riskScore ?? 0;
  data.confidence = payload.confidence ?? 0;
  data.dataSource = payload.dataSource || 'manual';
  data.createdBy = actorId || null;

  const zone = await RiskZone.create(data);

  await ActivityLog.create({
    actor: actorId || null,
    performedBySystem: !actorId,
    action: 'RISKZONE_CREATED',
    entityType: 'RiskZone',
    entityId: zone._id,
    metadata: { blockId: zone.blockId, hazardType: zone.hazardType },
  });

  return zone;
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const getRiskZoneById = async (id) => {
  const zone = await RiskZone.findById(id);
  if (!zone) throw new ApiError(404, 'Risk zone not found');
  return zone;
};

const listRiskZones = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, LIST_SORT_FIELDS, DEFAULT_SORT);
  const filter = parseFilters(query, LIST_FILTER_FIELDS);

  const [zones, totalItems] = await Promise.all([
    RiskZone.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    RiskZone.countDocuments(filter),
  ]);

  return { zones, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

/** Geospatial "near me" — zones ordered by distance from a point. */
const nearbyRiskZones = async ({ lng, lat, radiusKm, riskLevel }) => {
  const filter = buildNearFilter('geometry', { lng, lat, radiusKm });
  if (riskLevel) filter.riskLevel = riskLevel;
  return RiskZone.find(filter).limit(100).lean();
};

/**
 * Lightweight FeatureCollection for map coloring. Supports an optional
 * viewport bounding box so a zoomed-in map doesn't pull every zone in the
 * city — this is the primary "optimized for scale" lever on this endpoint.
 */
const getHeatmapData = async (query) => {
  const filter = { ...(buildBBoxFilter('geometry', query) || {}) };
  if (query.riskLevel) filter.riskLevel = { $in: String(query.riskLevel).split(',') };
  if (query.hazardType) filter.hazardType = query.hazardType;

  const zones = await RiskZone.find(filter).select(HEATMAP_PROJECTION).limit(1000).lean();

  return {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      geometry: z.geometry,
      properties: {
        blockId: z.blockId,
        settlement: z.settlement,
        hazardType: z.hazardType,
        riskScore: z.riskScore,
        riskLevel: z.riskLevel,
      },
    })),
  };
};

/** Full-property GeoJSON export — for external GIS tools or the detail panel. */
const getGeoJSON = async (query) => {
  const filter = { ...(buildBBoxFilter('geometry', query) || {}) };
  const whitelisted = parseFilters(query, LIST_FILTER_FIELDS);
  Object.assign(filter, whitelisted);

  const zones = await RiskZone.find(filter).select(GEOJSON_PROJECTION).limit(1000).lean();

  return {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      geometry: z.geometry,
      properties: {
        blockId: z.blockId,
        name: z.name,
        settlement: z.settlement,
        hazardType: z.hazardType,
        riskScore: z.riskScore,
        riskLevel: z.riskLevel,
        confidence: z.confidence,
        populationEstimate: z.populationEstimate,
        dataSource: z.dataSource,
        lastAnalyzedAt: z.lastAnalyzedAt,
      },
    })),
  };
};

// ---------------------------------------------------------------------------
// Update (metadata)
// ---------------------------------------------------------------------------

const updateRiskZone = async (id, payload, actorId) => {
  const patch = {};
  for (const field of UPDATE_FIELDS) {
    if (payload[field] !== undefined) patch[field] = payload[field];
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, `No updatable fields provided. Allowed: ${UPDATE_FIELDS.join(', ')}`);
  }

  const zone = await RiskZone.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!zone) throw new ApiError(404, 'Risk zone not found');

  await ActivityLog.create({
    actor: actorId,
    action: 'RISKZONE_UPDATED',
    entityType: 'RiskZone',
    entityId: zone._id,
    metadata: { fields: Object.keys(patch) },
  });

  return zone;
};

// ---------------------------------------------------------------------------
// Score — dedicated endpoint. Uses .save(), not findByIdAndUpdate, because
// RiskZone's pre('save') hook derives riskLevel from riskScore — bypassing
// .save() would leave riskLevel stale/out of sync with the new score.
// ---------------------------------------------------------------------------

const getRiskScore = async (id) => {
  const zone = await RiskZone.findById(id).select(
    'riskScore riskLevel confidence contributingFactors dataSource lastAnalyzedAt'
  );
  if (!zone) throw new ApiError(404, 'Risk zone not found');
  return zone;
};

const updateRiskScore = async (id, payload, actorId) => {
  const zone = await RiskZone.findById(id);
  if (!zone) throw new ApiError(404, 'Risk zone not found');

  const previousScore = zone.riskScore;
  for (const field of SCORE_UPDATE_FIELDS) {
    if (payload[field] !== undefined) zone[field] = payload[field];
  }
  zone.lastAnalyzedAt = new Date();
  await zone.save(); // triggers pre('save') riskLevel derivation

  await ActivityLog.create({
    actor: actorId || null,
    performedBySystem: !actorId,
    action: 'RISKZONE_SCORE_UPDATED',
    entityType: 'RiskZone',
    entityId: zone._id,
    metadata: { from: previousScore, to: zone.riskScore, riskLevel: zone.riskLevel },
  });

  return zone;
};

// ---------------------------------------------------------------------------
// Delete — blocked if any Incident references this zone (FK integrity).
// ---------------------------------------------------------------------------

const deleteRiskZone = async (id) => {
  const zone = await RiskZone.findById(id);
  if (!zone) throw new ApiError(404, 'Risk zone not found');

  const incidentCount = await Incident.countDocuments({ riskZone: id });
  if (incidentCount > 0) {
    throw new ApiError(409, `Cannot delete risk zone with ${incidentCount} linked incident(s)`);
  }

  await zone.deleteOne();

  await ActivityLog.create({
    action: 'RISKZONE_DELETED',
    entityType: 'RiskZone',
    entityId: zone._id,
    performedBySystem: true,
  });
};

module.exports = {
  createRiskZone,
  getRiskZoneById,
  listRiskZones,
  nearbyRiskZones,
  getHeatmapData,
  getGeoJSON,
  updateRiskZone,
  getRiskScore,
  updateRiskScore,
  deleteRiskZone,
};
