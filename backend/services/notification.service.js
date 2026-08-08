/**
 * services/notification.service.js
 * Every notification is written to MongoDB first (so it survives in the
 * unread list even if the recipient is offline), then pushed live over
 * Socket.IO as a best-effort real-time nudge. The DB write is the source
 * of truth; the socket emit never blocks or fails the request.
 *
 * Role/geo broadcasts use Notification.insertMany() — one round trip for
 * N recipients instead of N sequential .create() calls.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Volunteer = require('../models/Volunteer.model');
const Authority = require('../models/Authority.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');
const { buildNearFilter } = require('../utils/geoQuery');
const { safeEmitToRooms } = require('../config/socket');

const LIST_FILTER_FIELDS = ['isRead', 'type', 'priority', 'channel'];
const LIST_SORT_FIELDS = ['createdAt', 'priority'];
const DEFAULT_SORT = { createdAt: -1 };
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// ---------------------------------------------------------------------------
// List / read (self)
// ---------------------------------------------------------------------------

const listNotifications = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, LIST_SORT_FIELDS, DEFAULT_SORT);
  const filter = { recipient: userId, ...parseFilters(query, LIST_FILTER_FIELDS) };

  const [notifications, totalItems] = await Promise.all([
    Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return { notifications, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

/** Unread count, broken down by priority so a badge can show "3 urgent" vs "12 total". */
const getUnreadCount = async (userId) => {
  const rows = await Notification.aggregate([
    { $match: { recipient: new mongoose.Types.ObjectId(userId), isRead: false } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  const byPriority = { low: 0, normal: 0, high: 0, urgent: 0 };
  let total = 0;
  for (const row of rows) {
    if (row._id in byPriority) byPriority[row._id] = row.count;
    total += row.count;
  }

  return { total, byPriority };
};

// ---------------------------------------------------------------------------
// Mark read
// ---------------------------------------------------------------------------

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }
  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return { modifiedCount: result.modifiedCount };
};

// ---------------------------------------------------------------------------
// Recipient resolution — flat DB filters, no scoring/ranking.
// ---------------------------------------------------------------------------

const activeUserIds = async (candidateIds) => {
  const users = await User.find({ _id: { $in: candidateIds }, isActive: true }).select('_id').lean();
  return users.map((u) => u._id);
};

const resolveAuthorityRecipients = async ({ department } = {}) => {
  const filter = {};
  if (department) filter.department = department;
  const authorities = await Authority.find(filter).select('user').lean();
  return activeUserIds(authorities.map((a) => a.user));
};

const resolveVolunteerRecipients = async ({ skill, lng, lat, radiusKm } = {}) => {
  const filter = {};
  if (skill) filter.skills = skill;
  if (lng !== undefined && lat !== undefined) {
    Object.assign(filter, buildNearFilter('currentLocation', { lng, lat, radiusKm }));
  }
  const volunteers = await Volunteer.find(filter).select('user').limit(1000).lean();
  return activeUserIds(volunteers.map((v) => v.user));
};

const resolveCitizenRecipients = async ({ lng, lat, radiusKm } = {}) => {
  const filter = { role: 'citizen', isActive: true };
  if (lng !== undefined && lat !== undefined) {
    Object.assign(filter, buildNearFilter('location', { lng, lat, radiusKm }));
  }
  const citizens = await User.find(filter).select('_id').limit(2000).lean();
  return citizens.map((c) => c._id);
};

// ---------------------------------------------------------------------------
// Broadcast — persist one Notification per resolved recipient, then a
// single Socket.IO emit covering all their personal rooms at once.
// ---------------------------------------------------------------------------

const broadcastToUserIds = async (userIds, payload, actor) => {
  if (userIds.length === 0) {
    return { recipientCount: 0 };
  }

  const docs = userIds.map((recipient) => ({
    recipient,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    channel: payload.channel || 'in_app',
    priority: payload.priority || 'normal',
    language: payload.language || 'en',
    relatedEntity: payload.relatedEntity || undefined,
  }));

  await Notification.insertMany(docs, { ordered: false });

  const rooms = userIds.map((id) => `user:${id}`);
  safeEmitToRooms(rooms, 'notification:new', {
    type: payload.type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority || 'normal',
  });

  await ActivityLog.create({
    actor: actor?.id || null,
    performedBySystem: !actor,
    action: 'NOTIFICATION_BROADCAST',
    entityType: 'Notification',
    entityId: userIds[0], // no single "the" notification id for a fan-out; anchor the log on the first recipient
    metadata: { recipientCount: userIds.length, type: payload.type, priority: payload.priority, title: payload.title },
  });

  return { recipientCount: userIds.length };
};

/** Generic broadcast: explicit userIds and/or a role room. */
const broadcast = async ({ userIds = [], role, ...payload }, actor) => {
  let targetIds = [...userIds];

  if (role) {
    const roleUsers = await User.find({ role, isActive: true }).select('_id').limit(5000).lean();
    targetIds = [...new Set([...targetIds, ...roleUsers.map((u) => String(u._id))])];
  }
  if (targetIds.length === 0) {
    throw new ApiError(400, 'No recipients resolved — provide userIds and/or role');
  }

  return broadcastToUserIds(targetIds, payload, actor);
};

const sendAuthorityAlert = async ({ department, ...payload }, actor) => {
  const recipientIds = await resolveAuthorityRecipients({ department });
  if (recipientIds.length === 0) throw new ApiError(400, 'No matching authority recipients found');
  return broadcastToUserIds(recipientIds, { ...payload, type: payload.type || 'alert' }, actor);
};

const sendVolunteerAlert = async ({ skill, lng, lat, radiusKm, ...payload }, actor) => {
  const recipientIds = await resolveVolunteerRecipients({ skill, lng, lat, radiusKm });
  if (recipientIds.length === 0) throw new ApiError(400, 'No matching volunteer recipients found');
  return broadcastToUserIds(recipientIds, { ...payload, type: payload.type || 'task_assigned' }, actor);
};

const sendCitizenAlert = async ({ lng, lat, radiusKm, ...payload }, actor) => {
  const recipientIds = await resolveCitizenRecipients({ lng, lat, radiusKm });
  if (recipientIds.length === 0) throw new ApiError(400, 'No matching citizen recipients found');
  return broadcastToUserIds(recipientIds, { ...payload, type: payload.type || 'alert' }, actor);
};

// ---------------------------------------------------------------------------
// Room-based notification — ephemeral live push to everyone currently
// connected to an incident room. NOT persisted as individual Notification
// docs (room membership is transient and unknown to the DB), but still
// audit-logged so there's a record that the push happened.
// ---------------------------------------------------------------------------

const sendIncidentRoomAlert = async (incidentId, payload, actor) => {
  safeEmitToRooms([`incident:${incidentId}`], 'room:notification', {
    incidentId,
    title: payload.title,
    message: payload.message,
    priority: payload.priority || 'normal',
    sentAt: new Date().toISOString(),
  });

  await ActivityLog.create({
    actor: actor.id,
    action: 'NOTIFICATION_ROOM_BROADCAST',
    entityType: 'Incident',
    entityId: incidentId,
    metadata: { title: payload.title, priority: payload.priority },
  });
};

module.exports = {
  PRIORITIES,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  broadcast,
  sendAuthorityAlert,
  sendVolunteerAlert,
  sendCitizenAlert,
  sendIncidentRoomAlert,
};
