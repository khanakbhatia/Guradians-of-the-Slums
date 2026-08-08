/**
 * middlewares/notFound.js
 * Catches requests to undefined routes. Register after all routes, before errorHandler.
 */

const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found - ${req.originalUrl}`));
};

module.exports = notFound;
