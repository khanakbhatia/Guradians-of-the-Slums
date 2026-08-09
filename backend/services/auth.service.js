/**
 * services/auth.service.js
 * All auth business logic lives here — controllers stay thin (parse req,
 * call service, shape response). No req/res objects touched below.
 */

const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { signAccessToken } = require('../utils/generateToken');
const { generateRawToken, hashToken } = require('../utils/randomToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

// Roles a person can pick for themselves at signup.
const SELF_REGISTERABLE_ROLES = ['citizen', 'volunteer', 'authority', 'admin'];

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const registerUser = async ({ name, email, password, role, phone }) => {
  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${SELF_REGISTERABLE_ROLES.join(', ')}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({ name, email, password, role, phone });

  await issueEmailVerification(user);

  return user;
};

/**
 * Admin-only: create a user with an arbitrary role, including 'admin'.
 * Mounted behind protect + authorize('admin') in the router.
 */
const createUserAsAdmin = async ({ name, email, password, role, phone }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    isEmailVerified: true, // admin-provisioned accounts skip the email loop
  });
  return user;
};

// ---------------------------------------------------------------------------
// Login / token issuance
// ---------------------------------------------------------------------------

/**
 * Issues a fresh access token + refresh token pair for a user, persisting
 * the refresh token's hash (never the raw value) on the user document.
 * Returns { accessToken, rawRefreshToken } — the raw refresh token is what
 * the controller puts in the httpOnly cookie.
 */
const issueTokenPair = async (user, { userAgent, ip } = {}) => {
  const accessToken = signAccessToken({ id: user.id, role: user.role });

  const rawRefreshToken = generateRawToken();
  user.pruneExpiredRefreshTokens();
  user.refreshTokens.push({
    tokenHash: hashToken(rawRefreshToken),
    userAgent: userAgent || null,
    ip: ip || null,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY),
  });
  await user.save({ validateBeforeSave: false });

  return { accessToken, rawRefreshToken };
};

const loginUser = async ({ email, password }, meta) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }

  user.lastLoginAt = new Date();
  const { accessToken, rawRefreshToken } = await issueTokenPair(user, meta);

  return { user, accessToken, rawRefreshToken };
};

/**
 * Rotates a refresh token: the presented token is consumed (removed) and a
 * new access+refresh pair is issued. If the presented token isn't found —
 * already used, expired-and-pruned, or forged — every refresh token for
 * that user is revoked as a precaution against token theft/replay.
 */
const refreshTokens = async (rawRefreshToken, meta) => {
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Missing refresh token');
  }
  const presentedHash = hashToken(rawRefreshToken);

  const user = await User.findOne({ 'refreshTokens.tokenHash': presentedHash }).select('+refreshTokens');
  if (!user) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const stored = user.refreshTokens.find((rt) => rt.tokenHash === presentedHash);
  const isExpired = !stored || stored.expiresAt < new Date();

  if (isExpired) {
    // Presented token was valid-looking but stale/reused — revoke the whole
    // family rather than silently failing, so a stolen token can't be
    // replayed indefinitely.
    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Refresh token expired — please log in again');
  }

  // Rotate: drop the used token, issue a new pair.
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.tokenHash !== presentedHash);
  const { accessToken, rawRefreshToken: newRawRefreshToken } = await issueTokenPair(user, meta);

  return { user, accessToken, rawRefreshToken: newRawRefreshToken };
};

/** Logout on the current device only. */
const logoutUser = async (userId, rawRefreshToken) => {
  if (!rawRefreshToken) return;
  const presentedHash = hashToken(rawRefreshToken);
  await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { tokenHash: presentedHash } } });
};

/** Logout everywhere — also called after a password change/reset. */
const logoutAllDevices = async (userId) => {
  await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
};

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

const issueEmailVerification = async (user) => {
  const rawToken = generateRawToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_HOURS * MS_PER_HOUR);
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail(user, rawToken);
};

const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Deliberately don't reveal whether the account exists or is already verified.
  if (!user || user.isEmailVerified) return;
  await issueEmailVerification(user);
};

const verifyEmail = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save({ validateBeforeSave: false });

  return user;
};

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Same-response-either-way to avoid leaking which emails have accounts.
  if (!user) return;

  const rawToken = generateRawToken();
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * MS_PER_MINUTE);
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(user, rawToken);
};

const resetPassword = async (rawToken, newPassword) => {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Reset link is invalid or has expired');
  }

  user.password = newPassword; // hashed by the pre('save') hook
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  // Password changed → invalidate every existing session on every device.
  await logoutAllDevices(user.id);

  return user;
};

module.exports = {
  SELF_REGISTERABLE_ROLES,
  registerUser,
  createUserAsAdmin,
  loginUser,
  issueTokenPair,
  refreshTokens,
  logoutUser,
  logoutAllDevices,
  resendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
