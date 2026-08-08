/**
 * routes/v1/chat.routes.js
 * Mounted at /api/v1/chat-rooms in routes/v1/index.js.
 *
 * Real-time events (documented, not REST — see config/socket.js and
 * sockets/chatHandlers.js):
 *   Client emits: 'chat:join' (roomId), 'chat:leave' (roomId),
 *                 'chat:typing' (roomId), 'chat:stopTyping' (roomId)
 *   Server emits: 'chat:message', 'chat:seen', 'chat:typing',
 *                 'chat:stopTyping', 'chat:participantAdded',
 *                 'chat:participantRemoved', 'chat:error'
 * REST is the only way to persist a room/message/seen-state; sockets are
 * for live delivery and the two purely-ephemeral typing events.
 */

const express = require('express');
const { body, param, query } = require('express-validator');

const chatController = require('../../controllers/chat.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect } = require('../../middlewares/auth');
const { uploadImages } = require('../../config/multer');
const sanitizeInput = require('../../middlewares/sanitizeInput');
const { ROOM_TYPES } = require('../../models/ChatRoom.model');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid chat room id');
const MAX_MESSAGE_ATTACHMENTS = 5;

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /chat-rooms:
 *   post:
 *     tags: [Chat]
 *     summary: Create a chat room
 *     description: "You're automatically included as a participant. 'direct' requires exactly 2 total participants and is deduplicated (409 if one already exists between the same pair). 'incident' requires an incident id."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomType: { type: string, enum: [incident, direct, support], default: incident }
 *               name: { type: string, maxLength: 150 }
 *               incident: { type: string, description: "Required when roomType is 'incident'" }
 *               participants: { type: array, items: { type: string }, description: "Other participants' user ids — you're added automatically" }
 *     responses:
 *       201:
 *         description: Room created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { room: { $ref: '#/components/schemas/ChatRoom' } } }
 *       400: { description: "Validation failed (wrong participant count, missing incident, inactive user)" }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       409: { description: "Direct room between this pair already exists" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  [
    body('roomType').optional().isIn(ROOM_TYPES),
    body('name').optional().isLength({ max: 150 }),
    body('incident').optional().isMongoId(),
    body('participants').optional().isArray(),
    body('participants.*').optional().isMongoId(),
  ],
  validateRequest,
  chatController.createRoom
);

/**
 * @swagger
 * /chat-rooms:
 *   get:
 *     tags: [Chat]
 *     summary: List my chat rooms
 *     description: Sorted by most recent activity (lastMessageAt) first.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated room list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { rooms: { type: array, items: { $ref: '#/components/schemas/ChatRoom' } } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  chatController.listRooms
);

/**
 * @swagger
 * /chat-rooms/{id}:
 *   get:
 *     tags: [Chat]
 *     summary: Get a chat room
 *     description: Participant or admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room, with participants populated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { room: { $ref: '#/components/schemas/ChatRoom' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, chatController.getRoom);

/**
 * @swagger
 * /chat-rooms/{id}/participants:
 *   post:
 *     tags: [Chat]
 *     summary: Add a participant
 *     description: Existing participant or admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties: { userId: { type: string } }
 *     responses:
 *       200:
 *         description: Participant added
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { room: { $ref: '#/components/schemas/ChatRoom' } } }
 *       400: { description: Target user is not a valid active account }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: Already a participant }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/participants',
  [idParamValidator, body('userId').isMongoId()],
  validateRequest,
  chatController.addParticipant
);

/**
 * @swagger
 * /chat-rooms/{id}/participants/{userId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Remove a participant (or leave, if userId is your own)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Participant removed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { room: { $ref: '#/components/schemas/ChatRoom' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "Only an admin can remove someone else" }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Would drop below the 2-participant minimum" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete(
  '/:id/participants/:userId',
  [idParamValidator, param('userId').isMongoId()],
  validateRequest,
  chatController.removeParticipant
);

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /chat-rooms/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: List messages (cursor-paginated)
 *     description: "Newest-first. Pass the previous response's meta.nextCursor to get older messages; omit cursor for the first page."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 30 }
 *     responses:
 *       200:
 *         description: "{ messages: [...], meta: { limit, nextCursor } }"
 *         content:
 *           application/json:
 *             example: { success: true, message: "Messages fetched", data: { messages: [{ _id: "507f1f77bcf86cd7994390a1", chatRoom: "507f1f77bcf86cd799439091", sender: { name: "Priya Sharma", role: "volunteer" }, content: "On my way to Block 14 now.", attachments: [], createdAt: "2026-08-06T11:00:00.000Z" }] }, meta: { limit: 30, nextCursor: null } }
 *       400: { description: Malformed cursor }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/:id/messages',
  [idParamValidator, query('limit').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  chatController.listMessages
);

/**
 * @swagger
 * /chat-rooms/{id}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message
 *     description: >
 *       Multipart form — text content and/or up to 5 image attachments (field name "photos").
 *       Images are compressed server-side (same pipeline as citizen report photos: resized,
 *       re-encoded, EXIF stripped) before upload to Cloudinary. Persists the message, then
 *       pushes it live to the room over Socket.IO ('chat:message'), and creates an in-app
 *       Notification for every other participant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, maxLength: 2000 }
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { message: { $ref: '#/components/schemas/Message' } } }
 *       400: { description: "No content and no attachments" }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/messages',
  [idParamValidator],
  validateRequest,
  uploadImages(MAX_MESSAGE_ATTACHMENTS),
  sanitizeInput, // multer parses `content` after global sanitizeInput already ran on an empty body — apply again here
  chatController.sendMessage
);

// ---------------------------------------------------------------------------
// Seen status
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /chat-rooms/{id}/seen:
 *   patch:
 *     tags: [Chat]
 *     summary: Mark room as seen
 *     description: "Bulk read-receipt — marks every message in the room not sent by you as read by you (standard chat semantics, not per-message acknowledgement). Pushes 'chat:seen' to the room over Socket.IO."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             example: { success: true, message: "Room marked as seen", data: { messagesMarkedSeen: 3 } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/:id/seen', [idParamValidator], validateRequest, chatController.markSeen);

module.exports = router;
