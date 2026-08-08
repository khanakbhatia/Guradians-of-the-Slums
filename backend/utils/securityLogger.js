/**
 * utils/securityLogger.js
 * One helper, called from a small number of middleware touchpoints
 * (middlewares/errorHandler.js for 401/403, middlewares/rateLimiter.js
 * for 429) rather than scattered explicit calls through business logic —
 * that way every current and future auth/authz failure gets captured
 * automatically, with no risk of a new route forgetting to log it.
 */

const { securityLoggerChannel } = require('./logger');

/**
 * @param {string} eventType - e.g. 'AUTH_FAILURE', 'FORBIDDEN', 'RATE_LIMITED'
 * @param {import('express').Request} req
 * @param {object} [details] - extra context (e.g. { reason })
 */
const logSecurityEvent = (eventType, req, details = {}) => {
  // Defensive: `message` and `level` are reserved on a Winston log record —
  // silently colliding with them (as happened once already, from
  // errorHandler.js passing { message }) corrupts the log entry rather than
  // erroring, so it's cheap insurance to rename them here rather than trust
  // every call site to remember.
  const { message: collidingMessage, level: collidingLevel, ...safeDetails } = details;

  securityLoggerChannel.warn(eventType, {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || null,
    userAgent: req.headers['user-agent'] || null,
    ...safeDetails,
    ...(collidingMessage !== undefined ? { reason: collidingMessage } : {}),
    ...(collidingLevel !== undefined ? { detailsLevel: collidingLevel } : {}),
  });
};

module.exports = { logSecurityEvent };
