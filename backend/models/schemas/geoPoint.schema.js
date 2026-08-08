/**
 * models/schemas/geoPoint.schema.js
 * Reusable GeoJSON Point sub-schema. Embed with `{ location: geoPointSchema }`
 * and add `schema.index({ location: '2dsphere' })` on the parent schema.
 *
 * Coordinates are always [longitude, latitude] per GeoJSON spec (NOT lat/lng).
 */

const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: (coords) =>
          Array.isArray(coords) &&
          coords.length === 2 &&
          coords[0] >= -180 &&
          coords[0] <= 180 &&
          coords[1] >= -90 &&
          coords[1] <= 90,
        message: 'coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

module.exports = geoPointSchema;
