/**
 * middlewares/errorHandler.js
 * Centralized error-handling middleware. Must be registered last in app.js.
 * Normalizes ApiError instances, Mongoose errors, and JWT errors into one
 * consistent response shape. Also the single touchpoint that logs every
 * 401/403 as a security event (see utils/securityLogger.js) and every
 * 500 to the app/error log channel — callers don't need to remember to
 * log anything themselves.
 */

const env = require('../config/env');
const { logger } = require('../utils/logger');
const { logSecurityEvent } = require('../utils/securityLogger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already in use` : 'Duplicate value';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer upload errors (file too large, too many files, unexpected field name)
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message;
  }

  // Every 401/403, from any route, any cause — automatic, not opt-in per route.
  if (statusCode === 401 || statusCode === 403) {
    // NOTE: pass `reason`, never `message` here — `message` collides with
    // Winston's own reserved field on the log record and corrupts the entry.
    logSecurityEvent(statusCode === 401 ? 'AUTH_FAILURE' : 'FORBIDDEN', req, { reason: message });
  }

  if (statusCode === 500) {
    logger.error(message, { requestId: req.id, method: req.method, path: req.originalUrl, stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length ? { errors } : {}),
    ...(env.NODE_ENV !== 'production' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
