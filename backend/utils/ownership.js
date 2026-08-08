/**
 * utils/ownership.js
 * The "is this actor allowed to touch this resource" check — owner or
 * admin — was independently reimplemented with slightly different
 * variable names in citizenReport.service.js, media.service.js,
 * user.service.js, and chat.service.js. Centralizing it here means a
 * future change to the rule (e.g. adding an authority override for one
 * resource) happens in one place instead of four, and the four call
 * sites can't silently drift out of sync with each other.
 */

const ApiError = require('./ApiError');

/** @returns {boolean} true if actor owns the resource or is an admin */
const isOwnerOrAdmin = (actor, ownerId) => actor.role === 'admin' || String(actor.id) === String(ownerId);

/** Throws a 403 with `message` unless the actor owns the resource or is an admin. */
const assertOwnerOrAdmin = (actor, ownerId, message) => {
  if (!isOwnerOrAdmin(actor, ownerId)) {
    throw new ApiError(403, message);
  }
};

module.exports = { isOwnerOrAdmin, assertOwnerOrAdmin };
