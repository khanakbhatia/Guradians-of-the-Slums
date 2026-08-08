/**
 * utils/cursorPagination.js
 * Cursor pagination for high-volume, append-only collections — Message is
 * the first consumer. Offset pagination (utils/queryBuilder.js) skips or
 * duplicates rows on a collection that grows while a user is paging
 * through it; a compound (createdAt, _id) cursor doesn't have that problem
 * and doesn't require a COUNT query either.
 */

const ApiError = require('./ApiError');

/** Encodes a document's sort position into an opaque, URL-safe cursor string. */
const encodeCursor = (doc) => {
  const payload = JSON.stringify({ createdAt: doc.createdAt, id: String(doc._id) });
  return Buffer.from(payload, 'utf8').toString('base64url');
};

/** Decodes a cursor string back into { createdAt, id }. Throws 400 on a malformed cursor. */
const decodeCursor = (cursor) => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!decoded.createdAt || !decoded.id) throw new Error('missing fields');
    return { createdAt: new Date(decoded.createdAt), id: decoded.id };
  } catch (err) {
    throw new ApiError(400, 'Malformed pagination cursor');
  }
};

/**
 * Builds a Mongo filter for "strictly older than this cursor position",
 * sorted newest-first — the standard shape for a reverse-chronological
 * feed (chat history, activity log, notification feed).
 */
const buildCursorFilter = (cursor) => {
  if (!cursor) return {};
  const { createdAt, id } = decodeCursor(cursor);
  return {
    $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }],
  };
};

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const parseCursorLimit = (query) => Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

module.exports = { encodeCursor, decodeCursor, buildCursorFilter, parseCursorLimit };
