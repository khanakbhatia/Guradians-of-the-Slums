/**
 * utils/geoQuery.js
 * Shared MongoDB geospatial filter builders, used by both RiskZone and
 * Incident "nearby" endpoints so the $nearSphere/$geoWithin construction
 * lives in one place instead of being copy-pasted per resource.
 */

const ApiError = require('./ApiError');

/**
 * Builds a $nearSphere filter on `field`, sorted nearest-first by MongoDB
 * itself (no in-app distance sorting needed).
 */
const buildNearFilter = (field, { lng, lat, radiusKm = 5 }) => {
  if (lng === undefined || lat === undefined) {
    throw new ApiError(400, 'lng and lat are required');
  }
  return {
    [field]: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000, // km -> meters
      },
    },
  };
};

/**
 * Builds a $geoWithin filter on `field` for a map-viewport bounding box.
 * Returns null if none of the four bbox params were supplied (bbox is
 * optional — callers fall back to an unfiltered, capped query).
 * Throws 400 if only SOME of the four params were supplied (partial bbox
 * is ambiguous, not a valid "no filter" state).
 */
const buildBBoxFilter = (field, { minLng, minLat, maxLng, maxLat }) => {
  const provided = [minLng, minLat, maxLng, maxLat].filter((v) => v !== undefined);
  if (provided.length === 0) return null;
  if (provided.length < 4) {
    throw new ApiError(400, 'minLng, minLat, maxLng, and maxLat must all be provided together');
  }

  const [w, s, e, n] = [minLng, minLat, maxLng, maxLat].map(Number);
  return {
    [field]: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
        },
      },
    },
  };
};

module.exports = { buildNearFilter, buildBBoxFilter };
