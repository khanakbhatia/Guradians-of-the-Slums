/**
 * routes/v1/user.routes.js
 * Mounted at /api/v1/users in routes/v1/index.js.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const userController = require('../../controllers/user.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { uploadImage } = require('../../config/multer');

const router = express.Router();

// Every route below requires authentication.
router.use(protect);

// ---------------------------------------------------------------------------
// Self-service (any authenticated user)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my own profile
 *     responses:
 *       200:
 *         description: Full profile of the authenticated user
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
router.get('/me', userController.getProfile);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update my own profile
 *     description: Only name, phone, preferredLanguage, and location are updatable here. Email, role, and password each require their own dedicated flow and are silently ignored if sent.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               phone: { type: string }
 *               preferredLanguage: { type: string, example: "hi" }
 *               location:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates:
 *                     type: array
 *                     items: { type: number }
 *                     example: [72.8777, 19.0760]
 *     responses:
 *       200:
 *         description: Updated profile
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
 *         description: No updatable fields provided
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().isMobilePhone('any'),
    body('preferredLanguage').optional().isLength({ min: 2, max: 10 }),
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('location.coordinates must be [longitude, latitude]'),
  ],
  validateRequest,
  userController.updateProfile
);

/**
 * @swagger
 * /users/me/avatar:
 *   patch:
 *     tags: [Users]
 *     summary: Upload/replace my avatar
 *     description: Replaces the current avatar on Cloudinary; the previous image is deleted. Max 2MB, JPEG/PNG/WebP only.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar updated
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
 *         description: Missing file, wrong type, or over the 2MB limit
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.patch('/me/avatar', uploadImage.single('avatar'), userController.updateAvatar);

/**
 * @swagger
 * /users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate my own account
 *     description: Soft delete — the record is kept (audit trail, referential integrity) but marked inactive, and every session is revoked.
 *     responses:
 *       204:
 *         description: Account deactivated, no content returned
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/me', userController.deleteOwnAccount);

// ---------------------------------------------------------------------------
// Admin-only search — must be declared BEFORE /:id so "search" isn't parsed as an id
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Search/list users (admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-createdAt" }
 *         description: "Comma-separated fields, prefix with \"-\" for descending. Allowed: createdAt, name, lastLoginAt."
 *       - in: query
 *         name: role
 *         schema: { type: string, example: "volunteer,authority" }
 *         description: Exact match, comma-separated for IN
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text search across name and email
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/User' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get(
  '/',
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  userController.searchUsers
);

// ---------------------------------------------------------------------------
// Lookup / delete by id
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id
 *     description: Returns the full profile if the requester is the owner or an admin; otherwise a reduced public projection (name, avatar, role, preferredLanguage — no email/phone).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User (full or public projection depending on requester)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       oneOf:
 *                         - { $ref: '#/components/schemas/User' }
 *                         - { $ref: '#/components/schemas/PublicUser' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user id')],
  validateRequest,
  userController.getUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user by id (admin only)
 *     description: Soft delete — see /users/me DELETE for the same semantics applied to another account.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: User deactivated, no content returned
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid user id')],
  validateRequest,
  userController.deleteUser
);

module.exports = router;
