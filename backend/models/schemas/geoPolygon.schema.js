/**
 * models/schemas/geoPolygon.schema.js
 * Reusable GeoJSON Polygon sub-schema for block/zone boundaries.
 * Add `schema.index({ geometry: '2dsphere' })` on the parent schema.
 */

const mongoose = require('mongoose');

const geoPolygonSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
      required: true,
    },
    coordinates: {
      // Array of linear rings; each ring is an array of [lng, lat] pairs,
      // first and last point must match (GeoJSON Polygon spec).
      type: [[[Number]]],
      required: true,
    },
  },
  { _id: false }
);

module.exports = geoPolygonSchema;
