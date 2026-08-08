/**
 * routes/v1/auth.routes.js
 * Mounted at /api/v1/auth in routes/v1/index.js.
 */

const express = require('express');
const { body, param } = require('express-validator');

const authController = require('../../controllers/auth.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { loginLimiter, registerLimiter, emailActionLimiter } = require('../../middlewares/rateLimiter');
const { SELF_REGISTERABLE_ROLES } = require('../../services/auth.service');

const router = express.Router();

// ---- Shared validators ----
const emailValidator = body('email').isEmail().withMessage('A valid email is required').normalizeEmail();

const passwordValidator = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must contain a lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain a number');

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new account
 *     description: Self-registration is limited to citizen, volunteer, and authority roles. Admin accounts are provisioned separately via /auth/admin/users.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100, example: "Priya Sharma" }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8, description: "Must contain an uppercase letter, lowercase letter, and a number" }
 *               role: { type: string, enum: [citizen, volunteer, authority] }
 *               phone: { type: string, example: "+919876543210" }
 *     responses:
 *       201:
 *         description: Registered — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many registration attempts from this IP
 */
router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    emailValidator,
    passwordValidator,
    body('role')
      .isIn(SELF_REGISTERABLE_ROLES)
      .withMessage(`role must be one of: ${SELF_REGISTERABLE_ROLES.join(', ')}`),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  ],
  validateRequest,
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive an access token
 *     description: On success, a short-lived JWT access token is returned in the response body, and a rotating refresh token is set as an httpOnly cookie.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     accessToken: { type: string, description: "JWT, ~15 minute lifetime" }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       403:
 *         description: Account deactivated
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many login attempts
 */
router.post(
  '/login',
  loginLimiter,
  [emailValidator, body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  authController.login
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh-token cookie for a new access token
 *     description: Reads the httpOnly refreshToken cookie, rotates it (old value is invalidated), and returns a new access token plus a new refresh-token cookie.
 *     security: []
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     accessToken: { type: string }
 *       401:
 *         description: Missing, invalid, expired, or already-used refresh token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     description: Always returns 200 regardless of whether the email is registered, to avoid leaking account existence.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Generic confirmation (sent regardless of account existence)
 *         content:
 *           application/json:
 *             example: { success: true, message: "If that email is registered, a reset link has been sent", data: null }
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many reset requests for this window
 */
router.post(
  '/forgot-password',
  emailActionLimiter,
  [emailValidator],
  validateRequest,
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using the token emailed by /forgot-password
 *     description: On success, every existing session (all devices) is invalidated — the user must log in again.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Raw token from the reset-password email link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, format: password, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset — all sessions invalidated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Password reset successfully — please log in again", data: null }
 *       400:
 *         description: Token is invalid, malformed, or expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/reset-password/:token',
  [param('token').isHexadecimal().withMessage('Malformed token'), passwordValidator],
  validateRequest,
  authController.resetPassword
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Verify an email address
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Raw token from the verification email link
 *     responses:
 *       200:
 *         description: Email verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Token is invalid, malformed, or expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get(
  '/verify-email/:token',
  [param('token').isHexadecimal().withMessage('Malformed token')],
  validateRequest,
  authController.verifyEmail
);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend the email verification link
 *     description: Always returns 200 regardless of account existence or current verification status.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Generic confirmation
 *         content:
 *           application/json:
 *             example: { success: true, message: "If that email needs verifying, a new link has been sent", data: null }
 *       429:
 *         description: Too many resend requests for this window
 */
router.post(
  '/resend-verification',
  emailActionLimiter,
  [emailValidator],
  validateRequest,
  authController.resendVerification
);

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out on the current device
 *     description: Revokes the refresh token presented in the cookie; other devices/sessions remain active.
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             example: { success: true, message: "Logged out", data: null }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Log out on every device
 *     description: Revokes all refresh tokens for this user.
 *     responses:
 *       200:
 *         description: Logged out everywhere
 *         content:
 *           application/json:
 *             example: { success: true, message: "Logged out on all devices", data: null }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout-all', protect, authController.logoutAll);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/me', protect, authController.getMe);

// ---------------------------------------------------------------------------
// Admin-only: provision a user with any role (including 'admin')
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /auth/admin/users:
 *   post:
 *     tags: [Auth]
 *     summary: Admin-only — create a user with any role, including 'admin'
 *     description: The only way an admin account comes into existence outside a seed script. Admin-provisioned accounts skip the email-verification requirement.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               role: { type: string, enum: [citizen, volunteer, authority, admin] }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Email already registered
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post(
  '/admin/users',
  protect,
  authorize('admin'),
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    emailValidator,
    passwordValidator,
    body('role').isIn(['citizen', 'volunteer', 'authority', 'admin']),
    body('phone').optional().isMobilePhone('any'),
  ],
  validateRequest,
  authController.createUserAsAdmin
);

module.exports = router;
