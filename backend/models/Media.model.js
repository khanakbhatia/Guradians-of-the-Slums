/**
 * models/Media.model.js
 * Centralized tracking for every file stored on Cloudinary through the
 * dedicated upload surfaces (satellite imagery, general citizen images,
 * documents) — as opposed to the inline mediaAsset sub-schema used
 * elsewhere (User.avatar, CitizenReport.photos, Message.attachments),
 * which stays lightweight because those are tightly owned by one parent
 * document. Media exists for uploads that need independent metadata,
 * dedup, and lifecycle tracking of their own.
 */

const mongoose = require('mongoose');
const geoPointSchema = require('./schemas/geoPoint.schema');

const CATEGORIES = ['satellite', 'citizen_image', 'document'];
const RESOURCE_TYPES = ['image', 'raw'];
const RELATED_ENTITY_KINDS = ['Incident', 'RiskZone', 'CitizenReport'];

const mediaSchema = new mongoose.Schema(
  {
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'uploader is required'],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    originalFilename: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      trim: true,
    },
    sizeBytes: {
      // Original upload size, before any compression.
      type: Number,
      required: true,
      min: 0,
    },
    storedSizeBytes: {
      // Size actually stored on Cloudinary — equals sizeBytes for
      // uncompressed categories (documents).
      type: Number,
      required: true,
      min: 0,
    },
    width: {
      type: Number,
      min: 0,
      default: null,
    },
    height: {
      type: Number,
      min: 0,
      default: null,
    },
    checksum: {
      // SHA-256 of the ORIGINAL buffer, pre-compression — dedup key.
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      // Cloudinary's own resource type — 'raw' for documents, 'image' otherwise.
      type: String,
      enum: RESOURCE_TYPES,
      required: true,
    },
    captureLocation: {
      // Optional — primarily for satellite imagery (where the pass covers).
      type: geoPointSchema,
      default: null,
    },
    relatedEntity: {
      kind: { type: String, enum: RELATED_ENTITY_KINDS, default: null },
      item: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedEntity.kind', default: null },
    },
    metadata: {
      // Category-specific extras that don't warrant their own top-level
      // field: e.g. { captureDate, satelliteSource } for satellite,
      // { title, documentType, language } for document,
      // { caption } for citizen_image.
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['ready', 'failed'],
      default: 'ready',
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
mediaSchema.index({ checksum: 1, uploader: 1, category: 1 }); // dedup lookup
mediaSchema.index({ category: 1, createdAt: -1 }); // category listing, newest first
mediaSchema.index({ uploader: 1, createdAt: -1 }); // "my uploads"
mediaSchema.index({ 'relatedEntity.kind': 1, 'relatedEntity.item': 1 });
mediaSchema.index({ captureLocation: '2dsphere' }); // automatically sparse — only indexes docs that have this field

module.exports = mongoose.model('Media', mediaSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
module.exports.RELATED_ENTITY_KINDS = RELATED_ENTITY_KINDS;
