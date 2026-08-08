/**
 * models/schemas/mediaAsset.schema.js
 * Reusable sub-schema for a single Cloudinary-hosted file
 * (avatar, report photo, chat attachment, etc.)
 */

const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      // Cloudinary public_id, needed to delete/replace the asset later
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

module.exports = mediaAssetSchema;
