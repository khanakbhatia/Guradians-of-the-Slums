/**
 * services/volunteer.service.js
 * Pure database operations — no AI/matching intelligence here. Anywhere
 * "matching" comes up (e.g. task eligibility in task.service.js) it's a
 * flat rule (skill overlap, availability flag), not a scored/ranked
 * algorithm — that's explicitly deferred to a future AI pass.
 */

const Volunteer = require('../models/Volunteer.model');
const User = require('../models/User.model');
const Task = require('../models/Task.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');

const REGISTER_FIELDS = ['skills', 'ngoAffiliation', 'serviceRadiusKm', 'currentLocation'];
const PROFILE_UPDATE_FIELDS = ['skills', 'ngoAffiliation', 'serviceRadiusKm'];
// verified, trustScore, rating, completedTasksCount are system/admin-controlled —
// deliberately excluded from self-service update, same pattern as every
// other resource's "generic update can't touch system fields" rule.

const AVAILABILITY_UPDATE_FIELDS = ['availability', 'currentLocation'];

const LIST_FILTER_FIELDS = ['skills', 'availability', 'verified'];
const LIST_SORT_FIELDS = ['trustScore', 'completedTasksCount', 'createdAt'];

const PUBLIC_PROFILE_POPULATE = { path: 'user', select: 'name avatar preferredLanguage' };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const registerVolunteer = async (userId, userRole, payload) => {
  if (userRole !== 'volunteer') {
    throw new ApiError(403, 'Only accounts with role "volunteer" can register a volunteer profile');
  }

  const existing = await Volunteer.findOne({ user: userId }).lean();
  if (existing) {
    throw new ApiError(409, 'A volunteer profile already exists for this account');
  }

  const data = {};
  for (const field of REGISTER_FIELDS) {
    if (payload[field] !== undefined) data[field] = payload[field];
  }
  data.user = userId;

  const volunteer = await Volunteer.create(data);

  await ActivityLog.create({
    actor: userId,
    action: 'VOLUNTEER_REGISTERED',
    entityType: 'User',
    entityId: userId,
    metadata: { skills: volunteer.skills },
  });

  return volunteer;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const getOwnVolunteerProfile = async (userId) => {
  let volunteer = await Volunteer.findOne({ user: userId }).populate(PUBLIC_PROFILE_POPULATE);
  if (!volunteer) {
    const user = await User.findById(userId);
    if (user && user.role === 'volunteer') {
      volunteer = await Volunteer.create({
        user: userId,
        skills: ['other'],
        availability: 'available',
      });
      volunteer = await Volunteer.findOne({ user: userId }).populate(PUBLIC_PROFILE_POPULATE);
    } else {
      throw new ApiError(404, 'No volunteer profile found for this account — register one first');
    }
  }
  return volunteer;
};

const updateOwnVolunteerProfile = async (userId, payload) => {
  const patch = {};
  for (const field of PROFILE_UPDATE_FIELDS) {
    if (payload[field] !== undefined) patch[field] = payload[field];
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, `No updatable fields provided. Allowed: ${PROFILE_UPDATE_FIELDS.join(', ')}`);
  }

  const volunteer = await Volunteer.findOneAndUpdate({ user: userId }, patch, {
    new: true,
    runValidators: true,
  }).populate(PUBLIC_PROFILE_POPULATE);
  if (!volunteer) throw new ApiError(404, 'No volunteer profile found for this account');

  await ActivityLog.create({
    actor: userId,
    action: 'VOLUNTEER_PROFILE_UPDATED',
    entityType: 'User',
    entityId: userId,
    metadata: { fields: Object.keys(patch) },
  });

  return volunteer;
};

const getVolunteerById = async (id) => {
  const volunteer = await Volunteer.findById(id).populate(PUBLIC_PROFILE_POPULATE);
  if (!volunteer) throw new ApiError(404, 'Volunteer not found');
  return volunteer;
};

const listVolunteers = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, LIST_SORT_FIELDS, { trustScore: -1 });
  const filter = parseFilters(query, LIST_FILTER_FIELDS);

  const [volunteers, totalItems] = await Promise.all([
    Volunteer.find(filter).sort(sort).skip(skip).limit(limit).populate(PUBLIC_PROFILE_POPULATE).lean(),
    Volunteer.countDocuments(filter),
  ]);

  return { volunteers, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

// ---------------------------------------------------------------------------
// Availability — dedicated endpoint (mirrors Incident.status / RiskZone.score:
// a narrow, frequently-hit field gets its own route instead of overloading
// the generic profile PATCH).
// ---------------------------------------------------------------------------

const getAvailability = async (userId) => {
  let volunteer = await Volunteer.findOne({ user: userId }).select('availability currentLocation updatedAt');
  if (!volunteer) {
    await getOwnVolunteerProfile(userId);
    volunteer = await Volunteer.findOne({ user: userId }).select('availability currentLocation updatedAt');
  }
  return volunteer;
};

const updateAvailability = async (userId, payload) => {
  const patch = {};
  for (const field of AVAILABILITY_UPDATE_FIELDS) {
    if (payload[field] !== undefined) patch[field] = payload[field];
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, `No fields provided. Allowed: ${AVAILABILITY_UPDATE_FIELDS.join(', ')}`);
  }

  let volunteer = await Volunteer.findOneAndUpdate({ user: userId }, patch, {
    new: true,
    runValidators: true,
  }).select('availability currentLocation updatedAt');
  if (!volunteer) {
    await getOwnVolunteerProfile(userId);
    volunteer = await Volunteer.findOneAndUpdate({ user: userId }, patch, {
      new: true,
      runValidators: true,
    }).select('availability currentLocation updatedAt');
  }

  await ActivityLog.create({
    actor: userId,
    action: 'VOLUNTEER_AVAILABILITY_CHANGED',
    entityType: 'User',
    entityId: userId,
    metadata: patch,
  });

  return volunteer;
};

// ---------------------------------------------------------------------------
// Statistics — live counts from Task, not just the cached completedTasksCount
// on the Volunteer doc, so the numbers can't drift out of sync silently.
// ---------------------------------------------------------------------------

const getVolunteerStatistics = async (volunteerId) => {
  const volunteer = await Volunteer.findById(volunteerId).select('trustScore rating completedTasksCount availability');
  if (!volunteer) throw new ApiError(404, 'Volunteer not found');

  const statusCounts = await Task.aggregate([
    { $match: { assignedVolunteer: volunteer._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = { assigned: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const row of statusCounts) {
    if (row._id in byStatus) byStatus[row._id] = row.count;
  }

  return {
    trustScore: volunteer.trustScore,
    rating: volunteer.rating,
    availability: volunteer.availability,
    completedTasksCount: volunteer.completedTasksCount,
    currentTasksByStatus: byStatus,
  };
};

// ---------------------------------------------------------------------------
// Leaderboard — flat ranking by completedTasksCount then trustScore.
// No weighting/scoring model; that's the "AI handled later" part.
// ---------------------------------------------------------------------------

const getLeaderboard = async ({ limit = 10, skill } = {}) => {
  const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const filter = { completedTasksCount: { $gt: 0 } };
  if (skill) filter.skills = skill;

  return Volunteer.find(filter)
    .select('user skills trustScore completedTasksCount rating')
    .sort({ completedTasksCount: -1, trustScore: -1 })
    .limit(cappedLimit)
    .populate({ path: 'user', select: 'name avatar' })
    .lean();
};

module.exports = {
  registerVolunteer,
  getOwnVolunteerProfile,
  updateOwnVolunteerProfile,
  getVolunteerById,
  listVolunteers,
  getAvailability,
  updateAvailability,
  getVolunteerStatistics,
  getLeaderboard,
};
