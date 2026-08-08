/**
 * services/admin.service.js
 * Cross-cutting admin operations. Read endpoints (dashboard/analytics/
 * statistics) use $facet aggregations — one DB round trip per collection
 * instead of N separate countDocuments() calls — and run in parallel via
 * Promise.all across collections. Every list here is .lean() (no
 * Mongoose document hydration needed for read-only admin views).
 *
 * Where this reuses existing business logic rather than duplicating it:
 * approving a report calls citizenReport.service's verifyReport directly,
 * so the transition rules (valid "from" states, reliabilityScore delta)
 * stay defined in exactly one place.
 */

const User = require('../models/User.model');
const Incident = require('../models/Incident.model');
const RiskZone = require('../models/RiskZone.model');
const Volunteer = require('../models/Volunteer.model');
const Task = require('../models/Task.model');
const CitizenReport = require('../models/CitizenReport.model');
const ActivityLog = require('../models/ActivityLog.model');
const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta } = require('../utils/queryBuilder');
const { safeEmitToRooms } = require('../config/socket');
const citizenReportService = require('./citizenReport.service');
const { logoutAllDevices } = require('./auth.service');

// ---------------------------------------------------------------------------
// Dashboard — one $facet aggregation per collection, run in parallel.
// ---------------------------------------------------------------------------

const getDashboard = async () => {
  const [userFacets, incidentFacets, riskZoneFacets, volunteerFacets, taskFacets, reportFacets] = await Promise.all([
    User.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byRole: [{ $group: { _id: '$role', count: { $sum: 1 } } }],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
        },
      },
    ]),
    Incident.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          active: [{ $match: { status: { $in: ['reported', 'active'] } } }, { $count: 'count' }],
        },
      },
    ]),
    RiskZone.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byRiskLevel: [{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }],
          critical: [{ $match: { riskLevel: 'critical' } }, { $count: 'count' }],
        },
      },
    ]),
    Volunteer.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byAvailability: [{ $group: { _id: '$availability', count: { $sum: 1 } } }],
          pendingVerification: [{ $match: { verified: false } }, { $count: 'count' }],
        },
      },
    ]),
    Task.aggregate([{ $facet: { total: [{ $count: 'count' }], byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }] } }]),
    CitizenReport.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
        },
      },
    ]),
  ]);

  // Every $facet result comes back as arrays of {_id, count} rows (or a
  // single [{count}] for a plain $count) — flatten them into plain objects.
  const flattenGroup = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'unknown', r.count]));
  const flattenCount = (rows) => rows[0]?.count || 0;

  return {
    users: {
      total: flattenCount(userFacets[0].total),
      active: flattenCount(userFacets[0].active),
      byRole: flattenGroup(userFacets[0].byRole),
    },
    incidents: {
      total: flattenCount(incidentFacets[0].total),
      activeCount: flattenCount(incidentFacets[0].active),
      byStatus: flattenGroup(incidentFacets[0].byStatus),
    },
    riskZones: {
      total: flattenCount(riskZoneFacets[0].total),
      criticalCount: flattenCount(riskZoneFacets[0].critical),
      byRiskLevel: flattenGroup(riskZoneFacets[0].byRiskLevel),
    },
    volunteers: {
      total: flattenCount(volunteerFacets[0].total),
      pendingVerificationCount: flattenCount(volunteerFacets[0].pendingVerification),
      byAvailability: flattenGroup(volunteerFacets[0].byAvailability),
    },
    tasks: {
      total: flattenCount(taskFacets[0].total),
      byStatus: flattenGroup(taskFacets[0].byStatus),
    },
    citizenReports: {
      total: flattenCount(reportFacets[0].total),
      pendingCount: flattenCount(reportFacets[0].pending),
      byStatus: flattenGroup(reportFacets[0].byStatus),
    },
  };
};

// ---------------------------------------------------------------------------
// Analytics — daily time-series over a configurable window.
// ---------------------------------------------------------------------------

const dailySeries = async (Model, dateField, days) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await Model.aggregate([
    { $match: { [dateField]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, count: r.count }));
};

const getAnalytics = async (query) => {
  const days = Math.min(Math.max(parseInt(query.days, 10) || 7, 1), 90);

  const [incidentsPerDay, reportsPerDay, tasksCompletedPerDay, usersRegisteredPerDay] = await Promise.all([
    dailySeries(Incident, 'startedAt', days),
    dailySeries(CitizenReport, 'createdAt', days),
    Task.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).then((rows) => rows.map((r) => ({ date: r._id, count: r.count }))),
    dailySeries(User, 'createdAt', days),
  ]);

  return { days, incidentsPerDay, reportsPerDay, tasksCompletedPerDay, usersRegisteredPerDay };
};

// ---------------------------------------------------------------------------
// Statistics — computed metrics/distributions, distinct from Dashboard's
// plain counts (average durations, score distributions).
// ---------------------------------------------------------------------------

const getStatistics = async () => {
  const [taskDuration, volunteerTrust, reportReliability, incidentResolution] = await Promise.all([
    Task.aggregate([
      { $match: { status: 'completed', startedAt: { $ne: null }, completedAt: { $ne: null } } },
      { $project: { durationMinutes: { $divide: [{ $subtract: ['$completedAt', '$startedAt'] }, 60000] } } },
      { $group: { _id: null, avgMinutes: { $avg: '$durationMinutes' }, count: { $sum: 1 } } },
    ]),
    Volunteer.aggregate([{ $group: { _id: null, avgTrustScore: { $avg: '$trustScore' }, count: { $sum: 1 } } }]),
    CitizenReport.aggregate([{ $group: { _id: null, avgReliabilityScore: { $avg: '$reliabilityScore' }, count: { $sum: 1 } } }]),
    Incident.aggregate([
      { $match: { resolvedAt: { $ne: null } } },
      { $project: { resolutionHours: { $divide: [{ $subtract: ['$resolvedAt', '$startedAt'] }, 3600000] } } },
      { $group: { _id: null, avgHours: { $avg: '$resolutionHours' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    avgTaskCompletionMinutes: taskDuration[0]?.avgMinutes ?? null,
    completedTaskSampleSize: taskDuration[0]?.count ?? 0,
    avgVolunteerTrustScore: volunteerTrust[0]?.avgTrustScore ?? null,
    avgReportReliabilityScore: reportReliability[0]?.avgReliabilityScore ?? null,
    avgIncidentResolutionHours: incidentResolution[0]?.avgHours ?? null,
    resolvedIncidentSampleSize: incidentResolution[0]?.count ?? 0,
  };
};

// ---------------------------------------------------------------------------
// System Logs — full filterable/paginated ActivityLog browser.
// ---------------------------------------------------------------------------

const getSystemLogs = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.action) filter.action = query.action.toUpperCase();
  if (query.entityType) filter.entityType = query.entityType;
  if (query.actor) filter.actor = query.actor;
  if (query.performedBySystem !== undefined) filter.performedBySystem = query.performedBySystem === 'true';
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }

  const [logs, totalItems] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name role').lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return { logs, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

// ---------------------------------------------------------------------------
// Activity Feed — lightweight recent stream (also pushed live via the
// ActivityLog post-save hook to the same 'role:admin' room; this endpoint
// is just the initial page load / refresh-on-demand).
// ---------------------------------------------------------------------------

const getActivityFeed = async (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return ActivityLog.find({}).sort({ createdAt: -1 }).limit(limit).populate('actor', 'name role').lean();
};

// ---------------------------------------------------------------------------
// Approve Reports — thin wrapper around citizenReport.service so the
// verification transition rules live in exactly one place.
// ---------------------------------------------------------------------------

const getPendingReports = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: 'pending' };

  const [reports, totalItems] = await Promise.all([
    CitizenReport.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('reporter', 'name avatar').lean(),
    CitizenReport.countDocuments(filter),
  ]);

  return { reports, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

const approveReport = (id, actor, note) => citizenReportService.verifyReport(id, actor, note);

// ---------------------------------------------------------------------------
// Approve Volunteers
// ---------------------------------------------------------------------------

const getPendingVolunteers = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { verified: false };

  const [volunteers, totalItems] = await Promise.all([
    Volunteer.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('user', 'name email avatar').lean(),
    Volunteer.countDocuments(filter),
  ]);

  return { volunteers, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

const approveVolunteer = async (id, actor) => {
  const volunteer = await Volunteer.findById(id);
  if (!volunteer) throw new ApiError(404, 'Volunteer not found');
  if (volunteer.verified) throw new ApiError(409, 'Volunteer is already verified');

  volunteer.verified = true;
  await volunteer.save();

  await ActivityLog.create({
    actor: actor.id,
    action: 'VOLUNTEER_APPROVED',
    entityType: 'User',
    entityId: volunteer.user,
    metadata: { volunteerId: volunteer._id },
  });

  await Notification.create({
    recipient: volunteer.user,
    type: 'system',
    title: 'Volunteer profile verified',
    message: 'An admin has verified your volunteer profile — you can now accept tasks with a verified badge.',
    priority: 'normal',
  });
  safeEmitToRooms([`user:${volunteer.user}`], 'notification:new', {
    type: 'system',
    title: 'Volunteer profile verified',
    priority: 'normal',
  });

  return volunteer;
};

// ---------------------------------------------------------------------------
// Suspend / unsuspend user — distinct audit action from self/admin
// deactivation (services/user.service.js), carries an admin-supplied reason.
// ---------------------------------------------------------------------------

const suspendUser = async (id, actor, reason) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(actor.id)) throw new ApiError(400, 'You cannot suspend your own account');
  if (!user.isActive) throw new ApiError(409, 'User is already suspended/inactive');

  user.isActive = false;
  await user.save({ validateModifiedOnly: true });
  await logoutAllDevices(id);

  await ActivityLog.create({
    actor: actor.id,
    action: 'USER_SUSPENDED',
    entityType: 'User',
    entityId: id,
    metadata: { reason: reason || null },
  });

  return user;
};

const unsuspendUser = async (id, actor) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isActive) throw new ApiError(409, 'User is not suspended');

  user.isActive = true;
  await user.save({ validateModifiedOnly: true });

  await ActivityLog.create({
    actor: actor.id,
    action: 'USER_UNSUSPENDED',
    entityType: 'User',
    entityId: id,
  });

  return user;
};

module.exports = {
  getDashboard,
  getAnalytics,
  getStatistics,
  getSystemLogs,
  getActivityFeed,
  getPendingReports,
  approveReport,
  getPendingVolunteers,
  approveVolunteer,
  suspendUser,
  unsuspendUser,
};
