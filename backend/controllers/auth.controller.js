/**
 * controllers/auth.controller.js
 * Thin HTTP layer: parse req, call services/auth.service, shape response.
 * Refresh-token cookie handling lives here (service layer never touches res).
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const authService = require('../services/auth.service');

const REFRESH_COOKIE_PATH = '/api/v1/auth'; // scope the cookie to auth endpoints only

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

const setRefreshCookie = (res, rawRefreshToken) => {
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
};

const requestMeta = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });

// ---------------------------------------------------------------------------

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const user = await authService.registerUser({ name, email, password, role, phone });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user },
        'Registration successful — check your email to verify your account'
      )
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, rawRefreshToken } = await authService.loginUser(
    { email, password },
    requestMeta(req)
  );

  setRefreshCookie(res, rawRefreshToken);
  res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Logged in successfully'));
});

const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
  const { user, accessToken, rawRefreshToken } = await authService.refreshTokens(
    incomingToken,
    requestMeta(req)
  );

  setRefreshCookie(res, rawRefreshToken);
  res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Token refreshed'));
});

const logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
  if (req.user) {
    await authService.logoutUser(req.user.id, incomingToken);
  }
  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out'));
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user.id);
  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out on all devices'));
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: req.user }, 'Current user'));
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  // Always the same response, whether or not the email exists — prevents account enumeration.
  res
    .status(200)
    .json(new ApiResponse(200, null, 'If that email is registered, a reset link has been sent'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json(new ApiResponse(200, null, 'Password reset successfully — please log in again'));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const user = await authService.verifyEmail(token);
  res.status(200).json(new ApiResponse(200, { user }, 'Email verified successfully'));
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'If that email needs verifying, a new link has been sent'));
});

/** Admin-only: create a user with any role, including 'admin'. */
const createUserAsAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!role) {
    throw new ApiError(400, 'role is required');
  }
  const user = await authService.createUserAsAdmin({ name, email, password, role, phone });
  res.status(201).json(new ApiResponse(201, { user }, 'User created'));
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  createUserAsAdmin,
};
