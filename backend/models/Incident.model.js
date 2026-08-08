/**
 * models/Incident.model.js
 * An active/resolved disaster event. Tasks, CitizenReports, and ChatRooms
 * all key off an Incident so the demo's "one continuous story" (heatmap ->
 * agent trace -> task -> alert -> chat) has a single anchor document.
 */

const mongoose = require('mongoose');
const geoPointSchema = require('./schemas/geoPoint.schema');

const INCIDENT_TYPES = ['flood', 'fire', 'structural_collapse', 'landslide', 'disease_outbreak', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['reported', 'active', 'contained', 'resolved', 'archived'];

// Allowed status transitions for non-admin actors (authority). Admins may
// force any transition — enforced in services/incident.service.js, not here,
// since "who can override" is an authorization concern, not a schema one.
const STATUS_TRANSITIONS = {
  reported: ['active', 'archived'],
  active: ['contained', 'resolved', 'archived'],
  contained: ['resolved', 'archived'],
  resolved: ['archived'],
  archived: [], // terminal
};

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: INCIDENT_TYPES,
      required: true,
    },
    severity: {
      type: String,
      enum: SEVERITIES,
      required: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'reported',
    },
    riskZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskZone',
      required: [true, 'riskZone is required'],
    },
    location: {
      type: geoPointSchema,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    affectedPopulationEstimate: {
      type: Number,
      min: 0,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null when auto-raised by the risk-scoring pipeline
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    relatedReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CitizenReport',
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
      validate: {
        validator: function validateResolvedAfterStart(value) {
          return !value || !this.startedAt || value >= this.startedAt;
        },
        message: 'resolvedAt cannot be earlier than startedAt',
      },
    },

    // Append-only log of status transitions — this IS the "Incident Timeline"
    // data source. Never mutate/remove entries, only push new ones.
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, enum: STATUSES, required: true },
          changedAt: { type: Date, default: Date.now },
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          note: { type: String, trim: true, maxlength: 500, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
incidentSchema.index({ status: 1, severity: -1 });
incidentSchema.index({ riskZone: 1 });
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ startedAt: -1 });

// ---- Hooks ----
incidentSchema.pre('save', function seedInitialStatusHistory(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, changedAt: this.startedAt || new Date(), changedBy: this.reportedBy || null });
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.STATUSES = STATUSES;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
