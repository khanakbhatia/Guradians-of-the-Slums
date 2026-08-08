/**
 * middlewares/auth.js
 * `protect`  — verifies the access-token JWT, loads the user, attaches req.user.
 * `authorize` — RBAC gate; use after `protect` with one or more allowed roles.
 */

const { verifyAccessToken } = require('../utils/generateToken');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const extractBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new ApiError(401, 'Not authenticated — missing access token');
  }

  // Throws JsonWebTokenError / TokenExpiredError on bad/expired tokens;
  // both are translated to 401 by the centralized errorHandler.
  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, 'User for this token no longer exists');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }
  if (user.changedPasswordAfter(decoded.iat)) {
    throw new ApiError(401, 'Password was changed after this token was issued — please log in again');
  }

  req.user = user; // full Mongoose doc; controllers can .save() directly if needed
  next();
});

/**
 * Usage: router.get('/admin-only', protect, authorize('admin'), handler)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    // Defensive: authorize() must always run after protect()
    throw new ApiError(401, 'Not authenticated');
  }
  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, `Role "${req.user.role}" is not permitted to perform this action`);
  }
  next();
};

module.exports = { protect, authorize };
