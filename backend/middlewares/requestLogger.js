/**
 * middlewares/requestLogger.js
 * Morgan configured to stream into the dedicated http/ log channel
 * (utils/logger.js's httpLogger) instead of writing to stdout directly —
 * so access logs land in the same rotating-file system as everything
 * else, not a separate ad-hoc mechanism.
 *
 * Includes req.id (see middlewares/requestId.js, must run before this)
 * for cross-referencing a single request across the http/security/admin
 * log files, and the authenticated user id when available (this
 * middleware runs after protect on routes that have it, so req.user may
 * or may not be set depending on the route).
 */

const morgan = require('morgan');
const env = require('../config/env');
const { httpLogger } = require('../utils/logger');

morgan.token('id', (req) => req.id || '-');
morgan.token('user', (req) => req.user?.id || 'anonymous');

const FORMATS = {
  dev: ':id :method :url :status :response-time ms - :user',
  combined: ':id :remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
};

const requestLogger = morgan(FORMATS[env.MORGAN_FORMAT] || FORMATS.dev, {
  stream: { write: (message) => httpLogger.http(message.trim()) },
  skip: (req) => req.originalUrl.split('?')[0] === '/api/health', // req.path mutates as Express descends into the /api router — originalUrl stays stable
});

module.exports = requestLogger;
