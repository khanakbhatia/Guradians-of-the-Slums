/**
 * services/user.service.js
 * Business logic for the Users resource (profile, avatar, admin lookups).
 * Register/Login/Logout stay in auth.service.js — this file is
 * everything that operates on an *already authenticated* identity.
 */

const User = require('../models/User.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { isOwnerOrAdmin } = require('../utils/ownership');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');
const cloudinaryUpload = require('./cloudinaryUpload.service');
const { logoutAllDevices } = require('./auth.service');

// Fields a user may change about themselves via PATCH /users/me.
// Deliberately excludes email, role, password (each has its own
// dedicated, more carefully-guarded flow) and isActive/isEmailVerified
// (system-controlled).
const SELF_UPDATABLE_FIELDS = ['name', 'phone', 'preferredLanguage', 'location'];

// Fields visible to a requester who is neither the profile owner nor an admin.
const PUBLIC_PROFILE_FIELDS = ['_id', 'name', 'avatar', 'role', 'preferredLanguage', 'createdAt'];

const SEARCHABLE_FILTER_FIELDS = ['role', 'isActive', 'isEmailVerified'];
const SEARCHABLE_SORT_FIELDS = ['createdAt', 'name', 'lastLoginAt'];

// ---------------------------------------------------------------------------

const getOwnProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const updateProfile = async (userId, updates) => {
  const patch = {};
  for (const field of SELF_UPDATABLE_FIELDS) {
    if (updates[field] !== undefined) patch[field] = updates[field];
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, `No updatable fields provided. Allowed: ${SELF_UPDATABLE_FIELDS.join(', ')}`);
  }

  const user = await User.findByIdAndUpdate(userId, patch, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');

  await ActivityLog.create({
    actor: userId,
    action: 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: userId,
    metadata: { fields: Object.keys(patch) },
  });

  return user;
};

const updateAvatar = async (userId, fileBuffer) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const previousAvatar = user.avatar;
  const uploaded = await cloudinaryUpload.uploadBuffer(fileBuffer, 'avatars');

  user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
  await user.save({ validateModifiedOnly: true });

  // Best-effort cleanup of the old asset; failure here shouldn't fail the request.
  if (previousAvatar?.publicId) {
    cloudinaryUpload.deleteAsset(previousAvatar.publicId).catch(() => {});
  }

  await ActivityLog.create({
    actor: userId,
    action: 'AVATAR_UPDATED',
    entityType: 'User',
    entityId: userId,
  });

  return user;
};

/**
 * Returns the target user, projected down to public fields unless the
 * requester is an admin or the owner themself (data-minimization by default).
 */
const getUserById = async (requester, targetId) => {
  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  if (isOwnerOrAdmin(requester, targetId)) return target;

  const publicView = {};
  for (const field of PUBLIC_PROFILE_FIELDS) {
    publicView[field] = target[field];
  }
  return publicView;
};

/** Soft delete: deactivates the account and revokes every session, but keeps the row (audit trail, FK integrity). */
const deactivateUser = async (targetId, actorId) => {
  const user = await User.findById(targetId);
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = false;
  await user.save({ validateModifiedOnly: true });
  await logoutAllDevices(targetId);

  await ActivityLog.create({
    actor: actorId,
    action: 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: targetId,
    performedBySystem: !actorId,
  });

  return user;
};

const searchUsers = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, SEARCHABLE_SORT_FIELDS, { createdAt: -1 });
  const filter = parseFilters(query, SEARCHABLE_FILTER_FIELDS);

  // Free-text search across name/email — separate from the bracket-filter
  // convention since it's a text match, not an equality/range filter.
  if (query.q) {
    const regex = new RegExp(query.q.trim(), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, totalItems] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

module.exports = {
  SELF_UPDATABLE_FIELDS,
  getOwnProfile,
  updateProfile,
  updateAvatar,
  getUserById,
  deactivateUser,
  searchUsers,
};
