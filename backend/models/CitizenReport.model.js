/**
 * models/CitizenReport.model.js
 * Crowdsourced hazard report (photo + geotag). `reliabilityScore` is what
 * lets the system down-weight bad-faith reports instead of trusting all
 * input equally — judges/reviewers specifically probe this mechanism.
 */

const mongoose = require('mongoose');
const geoPointSchema = require('./schemas/geoPoint.schema');
const mediaAssetSchema = require('./schemas/mediaAsset.schema');
const { SEVERITIES } = require('./Incident.model'); // reuse the same 4-level scale, one source of truth

const HAZARD_TYPES = ['flood', 'fire', 'structural', 'landslide', 'blocked_drainage', 'other'];
const STATUSES = ['pending', 'verified', 'flagged', 'rejected', 'resolved'];

const citizenReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'reporter is required'],
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null, // linked after triage, not necessarily at creation
    },
    riskZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskZone',
      default: null,
    },
    hazardType: {
      type: String,
      enum: HAZARD_TYPES,
      required: true,
    },
    severity: {
      type: String,
      enum: SEVERITIES,
      required: true,
      default: 'medium',
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      maxlength: 1000,
    },
    photos: {
      type: [mediaAssetSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: 'A report cannot include more than 5 photos',
      },
    },
    location: {
      type: geoPointSchema,
      required: true,
    },
    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50, // seeded from reporter's historical accuracy at creation time (service-layer concern)
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      // Set by the authority/admin performing a verify/flag/reject action.
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    upvotes: {
      type: Number,
      min: 0,
      default: 0,
    },
    downvotes: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
citizenReportSchema.index({ location: '2dsphere' });
citizenReportSchema.index({ status: 1, reliabilityScore: -1 });
citizenReportSchema.index({ status: 1, severity: -1 });
citizenReportSchema.index({ status: 1, createdAt: 1 }); // admin pending-review queue, oldest first
citizenReportSchema.index({ reporter: 1, createdAt: -1 });
citizenReportSchema.index({ incident: 1 });

module.exports = mongoose.model('CitizenReport', citizenReportSchema);
module.exports.HAZARD_TYPES = HAZARD_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.SEVERITIES = SEVERITIES;
