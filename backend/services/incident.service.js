/**
 * services/incident.service.js
 * Pure database operations — no AI/agent logic. Business rules here are
 * limited to: field whitelisting, status-transition validation, and
 * referential-integrity checks before delete.
 */

const mongoose = require('mongoose');
const Incident = require('../models/Incident.model');
const Task = require('../models/Task.model');
const CitizenReport = require('../models/CitizenReport.model');
const ChatRoom = require('../models/ChatRoom.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');

const LIST_FILTER_FIELDS = ['status', 'severity', 'type', 'riskZone'];
const LIST_SORT_FIELDS = ['createdAt', 'startedAt', 'severity'];
const DEFAULT_SORT = { startedAt: -1 };

const CREATE_FIELDS = ['title', 'type', 'severity', 'riskZone', 'location', 'description', 'affectedPopulationEstimate'];
const UPDATE_FIELDS = ['title', 'type', 'severity', 'description', 'affectedPopulationEstimate'];
// status is deliberately excluded from generic update — it only changes
// through updateIncidentStatus(), which enforces the transition map and
// appends to statusHistory. Letting PATCH /incidents/:id silently accept
// `status` would bypass that entirely.

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createIncident = async (payload, actorId) => {
  const data = {};
  for (const field of CREATE_FIELDS) {
    if (payload[field] !== undefined) data[field] = payload[field];
  }
  data.reportedBy = actorId || null;

  const incident = await Incident.create(data);

  await ActivityLog.create({
    actor: actorId || null,
    performedBySystem: !actorId,
    action: 'INCIDENT_CREATED',
    entityType: 'Incident',
    entityId: incident._id,
    metadata: { type: incident.type, severity: incident.severity },
  });

  return incident;
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const getIncidentById = async (id) => {
  const incident = await Incident.findById(id)
    .populate('riskZone', 'blockId settlement riskLevel')
    .populate({
      path: 'relatedReports',
      select: 'hazardType description photos reporter createdAt',
      populate: { path: 'reporter', select: 'name' },
    });
  if (!incident) throw new ApiError(404, 'Incident not found');
  const incidentObject = incident.toObject({ virtuals: true });
  incidentObject.images = (incidentObject.relatedReports || []).flatMap((report) =>
    (report.photos || []).map((photo, index) => ({
      id: photo.publicId || `${report._id}-${index}`,
      url: photo.url,
      caption: `${report.hazardType} report${report.reporter?.name ? ` by ${report.reporter.name}` : ''}`,
      reportId: report._id,
    }))
  );
  return incidentObject;
};

const listIncidents = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, LIST_SORT_FIELDS, DEFAULT_SORT);
  const filter = parseFilters(query, LIST_FILTER_FIELDS);

  const [incidents, totalItems] = await Promise.all([
    Incident.find(filter).sort(sort).skip(skip).limit(limit),
    Incident.countDocuments(filter),
  ]);

  return { incidents, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

/**
 * Geospatial "near me" query. Uses $nearSphere on the 2dsphere index —
 * results come back pre-sorted nearest-first by MongoDB itself.
 */
const nearbyIncidents = async ({ lng, lat, radiusKm = 5, status }) => {
  if (lng === undefined || lat === undefined) {
    throw new ApiError(400, 'lng and lat are required');
  }

  const filter = {
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radiusKm) * 1000, // km -> meters
      },
    },
  };
  if (status) filter.status = status;

  return Incident.find(filter).limit(100);
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

const updateIncident = async (id, payload, actorId) => {
  const patch = {};
  for (const field of UPDATE_FIELDS) {
    if (payload[field] !== undefined) patch[field] = payload[field];
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, `No updatable fields provided. Allowed: ${UPDATE_FIELDS.join(', ')}`);
  }

  const incident = await Incident.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!incident) throw new ApiError(404, 'Incident not found');

  await ActivityLog.create({
    actor: actorId,
    action: 'INCIDENT_UPDATED',
    entityType: 'Incident',
    entityId: incident._id,
    metadata: { fields: Object.keys(patch) },
  });

  return incident;
};

// ---------------------------------------------------------------------------
// Status (dedicated — enforces the transition map, writes statusHistory)
// ---------------------------------------------------------------------------

const getIncidentStatus = async (id) => {
  const incident = await Incident.findById(id).select('status statusHistory startedAt resolvedAt');
  if (!incident) throw new ApiError(404, 'Incident not found');
  return {
    status: incident.status,
    lastChangedAt: incident.statusHistory.at(-1)?.changedAt || incident.startedAt,
    resolvedAt: incident.resolvedAt,
  };
};

const updateIncidentStatus = async (id, newStatus, actor, note) => {
  const incident = await Incident.findById(id);
  if (!incident) throw new ApiError(404, 'Incident not found');

  const isAdmin = actor.role === 'admin';
  const allowedNext = Incident.STATUS_TRANSITIONS[incident.status] || [];

  if (!isAdmin && !allowedNext.includes(newStatus)) {
    throw new ApiError(
      409,
      `Cannot transition incident from "${incident.status}" to "${newStatus}". Allowed: ${allowedNext.join(', ') || 'none (terminal state)'}`
    );
  }

  incident.status = newStatus;
  incident.statusHistory.push({ status: newStatus, changedBy: actor.id, note: note || null });
  if (newStatus === 'resolved' && !incident.resolvedAt) {
    incident.resolvedAt = new Date();
  }
  await incident.save();

  await ActivityLog.create({
    actor: actor.id,
    action: 'INCIDENT_STATUS_CHANGED',
    entityType: 'Incident',
    entityId: incident._id,
    metadata: { from: incident.statusHistory.at(-2)?.status, to: newStatus, note },
  });

  return incident;
};

// ---------------------------------------------------------------------------
// History (full audit trail from ActivityLog) / Timeline (status lifecycle)
// ---------------------------------------------------------------------------

const getIncidentHistory = async (id, query) => {
  const exists = await Incident.exists({ _id: id });
  if (!exists) throw new ApiError(404, 'Incident not found');

  const { page, limit, skip } = parsePagination(query);
  const filter = { entityType: 'Incident', entityId: id };

  const [entries, totalItems] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name role'),
    ActivityLog.countDocuments(filter),
  ]);

  return { entries, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

/** Chronological status lifecycle, oldest first — the statusHistory array IS the timeline. */
const getIncidentTimeline = async (id) => {
  const incident = await Incident.findById(id)
    .select('statusHistory startedAt resolvedAt')
    .populate('statusHistory.changedBy', 'name role');
  if (!incident) throw new ApiError(404, 'Incident not found');

  return incident.statusHistory.slice().sort((a, b) => a.changedAt - b.changedAt);
};

// ---------------------------------------------------------------------------
// Delete — blocked if dependent records exist, to avoid orphaning FKs.
// Archiving (via updateIncidentStatus) is the normal end-of-lifecycle path;
// this is for removing an incident that was created in error.
// ---------------------------------------------------------------------------

const deleteIncident = async (id) => {
  const incident = await Incident.findById(id);
  if (!incident) throw new ApiError(404, 'Incident not found');

  const [taskCount, reportCount, chatRoomCount] = await Promise.all([
    Task.countDocuments({ incident: id }),
    CitizenReport.countDocuments({ incident: id }),
    ChatRoom.countDocuments({ incident: id }),
  ]);

  if (taskCount + reportCount + chatRoomCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete incident with dependent records (${taskCount} tasks, ${reportCount} reports, ${chatRoomCount} chat rooms). Set status to "archived" instead.`
    );
  }

  await incident.deleteOne();

  await ActivityLog.create({
    action: 'INCIDENT_DELETED',
    entityType: 'Incident',
    entityId: new mongoose.Types.ObjectId(id), // document no longer exists to ref
    performedBySystem: true,
  });
};

module.exports = {
  createIncident,
  getIncidentById,
  listIncidents,
  nearbyIncidents,
  updateIncident,
  deleteIncident,
  getIncidentStatus,
  updateIncidentStatus,
  getIncidentHistory,
  getIncidentTimeline,
};
