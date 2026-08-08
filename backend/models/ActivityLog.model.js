/**
 * models/ActivityLog.model.js
 * Append-only audit trail. Doubles as the persistence layer behind the
 * live "Agent Trace Panel": agent handoffs are written here with
 * performedBySystem=true and an agentName, then streamed to the frontend
 * over Socket.IO as they're inserted.
 */

const mongoose = require('mongoose');
const { safeEmitToRooms } = require('../config/socket');

const ENTITY_TYPES = ['User', 'Task', 'Incident', 'CitizenReport', 'RiskZone', 'ChatRoom', 'Notification', 'Media'];

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null when performedBySystem is true
    },
    performedBySystem: {
      type: Boolean,
      default: false,
    },
    agentName: {
      // e.g. 'RiskAnalystAgent' | 'VolunteerCoordinatorAgent' | 'ReportGeneratorAgent'
      type: String,
      trim: true,
      default: null,
    },
    action: {
      type: String,
      required: [true, 'action is required'],
      trim: true,
      maxlength: 100,
      uppercase: true, // e.g. 'TASK_ASSIGNED', 'REPORT_VERIFIED', 'AGENT_HANDOFF'
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // logs are immutable; no updatedAt needed
  }
);

// ---- Indexes ----
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ actor: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });

// ---- Validation ----
activityLogSchema.pre('validate', function requireActorOrSystem(next) {
  if (!this.performedBySystem && !this.actor) {
    return next(new Error('actor is required unless performedBySystem is true'));
  }
  next();
});

// ---- Live Activity Feed ----
// Every ActivityLog write, from anywhere in the app, pushes to admins in
// real time — a single hook here instead of adding a socket emit to every
// individual service that calls ActivityLog.create(). Fire-and-forget:
// safeEmitToRooms already no-ops quietly if Socket.IO isn't initialized.
activityLogSchema.post('save', function pushToActivityFeed(doc) {
  safeEmitToRooms(['role:admin'], 'activity:new', {
    _id: doc._id,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    performedBySystem: doc.performedBySystem,
    agentName: doc.agentName,
    createdAt: doc.createdAt,
  });
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
module.exports.ENTITY_TYPES = ENTITY_TYPES;
