/**
 * services/ibm/mockFallback.js
 * Deterministic, realistic fallback payloads used ONLY when ai_service is
 * genuinely unreachable (connection refused / timeout, surfaced by
 * aiServiceClient as ApiError 503/504) — never for 4xx responses, which
 * mean the request itself was rejected (bad input, or Granite's grounding
 * guard correctly refusing to fabricate ungrounded text) and should
 * continue to surface as real errors.
 *
 * Shapes here intentionally mirror services/ibm/mappers.js's *ToLegacy
 * output so callers (controllers, and the frontend hooks consuming them)
 * cannot tell the difference structurally — every payload is tagged with
 * `rawModelOutput.fallback: true` / a `fallback: true` field so it can be
 * identified in logs and, if a UI wants to, labeled as degraded.
 *
 * Goal: dashboards never render an empty/broken widget just because
 * Ollama/Granite/ai_service is down locally — they render a clearly-
 * marked, plausible placeholder instead.
 */

const seededScore = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 100;
};

const levelFor = (score) => (score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'moderate' : 'low');

const mockRiskScore = (areaId = 'unknown-area') => {
  const score = 30 + seededScore(String(areaId)) / 2; // 30-79 range, deterministic per area
  const rounded = Math.round(score);
  return {
    riskScore: rounded,
    confidence: 0.35,
    riskLevel: levelFor(rounded),
    contributingFactors: [
      { factor: 'rainfall_forecast', weight: 0.4 },
      { factor: 'drainage_capacity', weight: 0.35 },
      { factor: 'historical_flood_frequency', weight: 0.25 },
    ],
    rawModelOutput: {
      fallback: true,
      reason: 'ai_service unavailable — deterministic mock score returned so dashboards keep rendering.',
      areaId,
    },
  };
};

const mockExplanation = (areaId = 'unknown-area') => {
  const { riskScore, riskLevel } = mockRiskScore(areaId);
  const explanation = {
    why: `Estimated ${riskLevel} risk based on typical seasonal rainfall and drainage patterns for this area.`,
    humanReadableReasoning:
      'AI explanation service is currently unavailable; this is a conservative placeholder explanation, not a live model output.',
    confidence: 0.3,
    featureContributions: [
      { featureName: 'rainfall_forecast', contribution: 0.4, weight: 0.4, direction: 'increases_risk', explanation: 'Seasonal rainfall trend' },
      { featureName: 'drainage_capacity', contribution: 0.35, weight: 0.35, direction: 'increases_risk', explanation: 'Limited drainage infrastructure' },
    ],
    visualOverlays: [],
  };
  return {
    areaId,
    explanations: { flood: explanation, fire: explanation, overall: explanation },
    visualOverlays: [],
    fallback: true,
    riskScoreHint: riskScore,
  };
};

const mockVolunteerAssignment = (volunteers = []) => {
  if (!volunteers.length) {
    return {
      recommendedVolunteerId: null,
      rationale: 'AI matching service unavailable and no candidate volunteers were supplied.',
      confidence: 0,
      alternates: [],
      rankedVolunteers: [],
      fallback: true,
    };
  }
  const [top, ...rest] = volunteers;
  return {
    recommendedVolunteerId: top.volunteer_id ?? null,
    rationale: 'AI matching service unavailable — recommending nearest/first available volunteer as a fallback.',
    confidence: 0.2,
    alternates: rest.slice(0, 3).map((v) => ({ volunteerId: v.volunteer_id, score: 0.15 })),
    rankedVolunteers: volunteers.map((v, idx) => ({ ...v, score: Math.max(0.05, 0.5 - idx * 0.05), fallback: true })),
    fallback: true,
  };
};

const mockReport = ({ incidentContext, outputType = 'incident_report', language = 'en' } = {}) => ({
  title: `${outputType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (Draft)`,
  body:
    incidentContext ||
    'AI report generation is temporarily unavailable. This is a placeholder notice — please have an authority manually review the underlying incident data.',
  citations: [],
  language,
  generatedAt: new Date(),
  fallback: true,
});

const mockEvacuationRoute = ({ incidentId, origin, shelters = [] } = {}) => {
  const shelter = shelters[0];
  return {
    incidentId: String(incidentId ?? 'unknown-incident'),
    priority: 'moderate',
    bestRoute: {
      routeId: 'fallback-route-1',
      found: Boolean(shelter),
      shelterId: shelter ? String(shelter.shelterId ?? shelter.shelter_id ?? shelter.id) : null,
      shelterName: shelter?.name ?? null,
      roadIds: [],
      nodeIds: [],
      coordinates: shelter
        ? [
            { longitude: origin?.lng ?? origin?.longitude, latitude: origin?.lat ?? origin?.latitude },
            { longitude: shelter.lng ?? shelter.longitude, latitude: shelter.lat ?? shelter.latitude },
          ]
        : [],
      distanceM: null,
      safetyCost: null,
      estimatedTimeMinutes: null,
      riskZoneIds: [],
      reason: 'ai_service unavailable — straight-line placeholder route to the nearest known shelter, not a road-network plan.',
    },
    alternativeRoute: null,
    blockedRoadIds: [],
    planningMethod: 'fallback_mock',
    fallback: true,
  };
};

module.exports = { mockRiskScore, mockExplanation, mockVolunteerAssignment, mockReport, mockEvacuationRoute };
