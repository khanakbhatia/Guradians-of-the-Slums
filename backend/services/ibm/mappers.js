/**
 * services/ibm/mappers.js
 * Pure, side-effect-free adapters between the backend's existing
 * request/response shapes (Mongoose documents, the IBMServiceBase JSDoc
 * contract) and ai_service's Pydantic schemas (ai_service/app/schemas/*).
 * Kept out of the services/controllers themselves so the field-mapping
 * logic is unit-testable and reusable across services/ibm/*.js.
 *
 * Nothing in this file makes a network call or contains AI logic — it
 * only reshapes data.
 */

// ---- generic snake_case <-> camelCase conversion ----
// ai_service (Python/Pydantic) is snake_case; the rest of this API is
// camelCase. Converting generically here means every wrapper method gets
// consistent-looking output without hand-mapping every field.

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const snakeToCamel = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const deepCamelCase = (value) => {
  if (Array.isArray(value)) return value.map(deepCamelCase);
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[snakeToCamel(key)] = deepCamelCase(val);
      return acc;
    }, {});
  }
  return value;
};

// ---- skill vocabulary mapping ----
// Volunteer.model.js SKILLS: ['medical','rescue','logistics','communication','construction','counseling','other']
// ai_service VolunteerSkill (app/schemas/volunteers.py): first_aid, search_and_rescue,
// evacuation_support, food_distribution, water_sanitation, shelter_management,
// logistics, local_language, medical, crowd_management
// The two vocabularies only partially overlap. Skills with no reasonable
// equivalent are dropped (not fabricated) — logged by the caller if the
// resulting list is empty.
const SKILL_TO_AI = {
  medical: 'medical',
  rescue: 'search_and_rescue',
  logistics: 'logistics',
  communication: 'local_language',
  construction: 'shelter_management',
  counseling: 'evacuation_support',
  // 'other' has no equivalent — intentionally dropped.
};

const mapSkillsToAI = (skills = []) => [...new Set(skills.map((s) => SKILL_TO_AI[s]).filter(Boolean))];

// ---- severity vocabulary mapping ----
// Incident.model.js SEVERITIES: ['low','medium','high','critical']
// ai_service IncidentSeverity (app/schemas/volunteers.py): low, moderate, high, critical
const SEVERITY_TO_AI = { low: 'low', medium: 'moderate', high: 'high', critical: 'critical' };
const mapSeverityToAI = (severity) => SEVERITY_TO_AI[severity] || 'moderate';

// ---- geo distance ----
// Haversine great-circle distance in km between two GeoJSON [lng, lat]
// points. Plain math, not AI logic — used to populate VolunteerProfile.distance_km,
// a required field ai_service's matcher scores on.
const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

const haversineDistanceKm = (pointA, pointB) => {
  if (!pointA?.coordinates || !pointB?.coordinates) return null;
  const [lonA, latA] = pointA.coordinates;
  const [lonB, latB] = pointB.coordinates;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lonB - lonA);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

// ---- risk scoring ----
// Builds a RiskScoringRequest (ai_service/app/schemas/risk.py). ai_service's
// risk engine expects CV (`cv_output`) and road-graph (`road_graph`)
// observations as INPUT — those are themselves the OUTPUT of upstream
// vision/graph pipelines this project's M1 milestone hasn't wired up yet.
// TODO(M1 integration): once satellite CV (`POST /detect`) and road-graph
// analysis (`POST /analyze`) are called as part of RiskZone ingestion,
// thread their real responses through here instead of the empty defaults
// below. Until then we send a valid-but-empty observation (zero counts,
// no detections) rather than fabricating detections/roads that were never
// actually observed — an empty input yields a conservative, low-confidence
// score from ai_service, which is honest; invented detections would not be.
const emptyVisionObservation = (areaId) => ({
  image_id: areaId || 'unknown-area',
  model_name: 'external',
  detections: [],
  summary: {
    image_width: 0,
    image_height: 0,
    building_count: 0,
    road_count: 0,
    drainage_count: 0,
    open_space_count: 0,
    roof_density_score: 0,
  },
});

const emptyRoadGraphObservation = () => ({
  graph: { nodes: [], edges: [], connected_components: [], isolated_node_ids: [] },
  evacuation_bottlenecks: [],
  blocked_roads: [],
  shortest_safe_path: null,
});

/**
 * @param {{ areaId: string, satelliteData?: object, roadGraph?: object, weatherData?: object, historicalContext?: Array }} input
 */
const buildRiskScoringRequest = ({ areaId, satelliteData, roadGraph, weatherData, historicalContext }) => ({
  area_id: areaId || 'unknown-area',
  // Callers may pass an already-shaped VisionAnalysisResponse/GraphAnalysisResponse
  // (e.g. forwarded straight from a prior POST /detect or /analyze call);
  // otherwise fall back to the documented empty default above.
  cv_output: satelliteData && satelliteData.detections ? satelliteData : emptyVisionObservation(areaId),
  road_graph: roadGraph && roadGraph.graph ? roadGraph : emptyRoadGraphObservation(),
  rainfall: {
    rainfall_mm_24h: weatherData?.rainfallMm24h ?? weatherData?.rainfall_mm_24h ?? 0,
    rainfall_mm_72h: weatherData?.rainfallMm72h ?? weatherData?.rainfall_mm_72h ?? 0,
    rainfall_intensity_mm_per_hr:
      weatherData?.rainfallIntensityMmPerHr ?? weatherData?.rainfall_intensity_mm_per_hr ?? 0,
    data_source: weatherData?.dataSource ?? weatherData?.data_source ?? null,
  },
  historical_floods: Array.isArray(historicalContext)
    ? historicalContext.map((record, idx) => ({
        event_id: record.eventId || record.event_id || `hist-${idx}`,
        flood_depth_m: record.floodDepthM ?? record.flood_depth_m ?? null,
        affected_buildings: record.affectedBuildings ?? record.affected_buildings ?? null,
        displaced_people: record.displacedPeople ?? record.displaced_people ?? null,
        severity_score: record.severityScore ?? record.severity_score ?? 0.5,
        years_ago: record.yearsAgo ?? record.years_ago ?? null,
      }))
    : [],
});

/** Maps ai_service's RiskScoringResponse onto the IBMServiceBase#analyzeRisk contract. */
const mapRiskScoringResponseToLegacy = (response) => ({
  riskScore: Math.round((response.overall_risk?.score ?? 0) * 100),
  confidence: response.confidence_score,
  riskLevel: response.overall_risk?.level,
  contributingFactors: (response.overall_risk?.explanation?.feature_contributions ?? []).map((fc) => ({
    factor: fc.feature_name,
    weight: fc.weight,
  })),
  rawModelOutput: deepCamelCase(response),
});

/** Maps ai_service's RiskExplainabilityResponse to camelCase (shape is already a good fit — no restructuring needed). */
const mapExplainabilityResponse = (response) => deepCamelCase(response);

// ---- volunteer matching ----
/**
 * @param {{ incidentId: string, incidentSeverity: string, requiredSkills?: string[], volunteers: Array, maxDistanceKm?: number, limit?: number, taskLocation?: object }} input
 */
const buildVolunteerMatchingRequest = ({
  incidentId,
  incidentSeverity,
  requiredSkills = [],
  volunteers = [],
  maxDistanceKm = 10,
  limit = 20,
  taskLocation,
}) => ({
  incident_id: String(incidentId),
  required_skills: mapSkillsToAI(requiredSkills),
  incident_severity: mapSeverityToAI(incidentSeverity),
  volunteers: volunteers.map((v) => ({
    volunteer_id: String(v._id ?? v.volunteerId ?? v.id),
    name: v.name ?? v.user?.name ?? undefined,
    skills: mapSkillsToAI(v.skills || []),
    distance_km: taskLocation && v.currentLocation ? Math.round((haversineDistanceKm(taskLocation, v.currentLocation) ?? maxDistanceKm) * 100) / 100 : maxDistanceKm,
    available_now: v.availability === 'available',
    available_hours: v.availableHours ?? 4,
    trust_score: Math.min(1, Math.max(0, (v.trustScore ?? 50) / 100)),
  })),
  max_distance_km: maxDistanceKm,
  limit,
});

/** Maps ai_service's VolunteerMatchingResponse onto the IBMServiceBase#assignVolunteer contract. */
const mapVolunteerMatchingResponseToLegacy = (response) => {
  const ranked = response.ranked_volunteers ?? [];
  const [top, ...rest] = ranked;
  return {
    recommendedVolunteerId: top?.volunteer_id ?? null,
    rationale: top?.reason ?? 'No eligible volunteers were found within range.',
    confidence: top?.confidence ?? 0,
    alternates: rest.map((r) => ({ volunteerId: r.volunteer_id, score: r.score })),
    // Full ranked list + explainable contributions preserved for callers that want more than the top pick.
    rankedVolunteers: deepCamelCase(ranked),
  };
};

// ---- Granite grounded generation ----
const AUDIENCE_TO_OUTPUT_TYPE = {
  citizen: 'citizen_alert',
  volunteer: 'ngo_action_plan',
  authority: 'authority_briefing',
};

/**
 * @param {{ incidentContext: string, outputType?: string, audience?: string, language?: string, indexName?: string, locationName?: string }} input
 */
const buildGraniteGenerationRequest = ({
  incidentContext,
  outputType,
  audience,
  language,
  indexName = 'disaster_knowledge',
  locationName,
}) => ({
  output_type: outputType || AUDIENCE_TO_OUTPUT_TYPE[audience] || 'incident_report',
  incident_context: incidentContext,
  index_name: indexName,
  top_k: 5,
  source_types: [],
  target_languages: language ? [language] : [],
  location_name: locationName ?? null,
  audience: audience ?? null,
});

/** Maps ai_service's GraniteGenerationResponse onto the IBMServiceBase#generateReport contract. */
const mapGraniteGenerationResponseToLegacy = (response, { language } = {}) => ({
  title: response.output_type
    ? response.output_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Generated Report',
  body: response.generated_text,
  citations: (response.citations ?? []).map((c) => ({ source: c.title, excerpt: c.source_uri || c.chunk_id })),
  language: language || response.target_languages?.[0] || 'en',
  generatedAt: new Date(),
});

module.exports = {
  deepCamelCase,
  mapSkillsToAI,
  mapSeverityToAI,
  haversineDistanceKm,
  buildRiskScoringRequest,
  mapRiskScoringResponseToLegacy,
  mapExplainabilityResponse,
  buildVolunteerMatchingRequest,
  mapVolunteerMatchingResponseToLegacy,
  buildGraniteGenerationRequest,
  mapGraniteGenerationResponseToLegacy,
};
