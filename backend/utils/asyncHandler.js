/**
 * utils/asyncHandler.js
 * Wraps async route handlers/controllers so rejected promises are forwarded to next().
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
