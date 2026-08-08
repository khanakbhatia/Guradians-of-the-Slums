/**
 * routes/v1/task.routes.js
 * PARTIAL — mounted at /api/v1/tasks. Only the volunteer action endpoints
 * (accept/reject/complete) plus a minimal GET by id, per this turn's scope.
 * Full Task CRUD (create/update/delete/list, authority-side task posting)
 * is a separate future turn, same pattern as RiskZone/Incident.
 */

const express = require('express');
const { body, param } = require('express-validator');

const taskController = require('../../controllers/task.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.use(protect);

const idParamValidator = param('id').isMongoId().withMessage('Invalid task id');

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get Task (minimal read — full Task CRUD is a separate future endpoint set)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { task: { $ref: '#/components/schemas/Task' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:id', [idParamValidator], validateRequest, taskController.getTask);

/**
 * @swagger
 * /tasks/{id}/accept:
 *   post:
 *     tags: [Tasks]
 *     summary: Accept Task
 *     description: "volunteer only. Task must be 'open'. Dummy matching only — requires the caller to have at least one of the task's requiredSkills (flat overlap check, no scoring). On success, the volunteer's availability is automatically set to 'busy'."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task accepted, now 'assigned' to the caller
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { task: { $ref: '#/components/schemas/Task' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "No volunteer profile for this account, or wrong role" }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Task is not open, or caller lacks a required skill" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/accept',
  authorize('volunteer'),
  [idParamValidator],
  validateRequest,
  taskController.acceptTask
);

/**
 * @swagger
 * /tasks/{id}/reject:
 *   post:
 *     tags: [Tasks]
 *     summary: Reject Task
 *     description: "volunteer only. Only valid while the task is 'assigned' to the caller and not yet started — reverts the task to 'open' and the volunteer's availability back to 'available'."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 300 }
 *     responses:
 *       200:
 *         description: Task rejected, back to 'open'
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { task: { $ref: '#/components/schemas/Task' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "Task is not assigned to the caller" }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Task is not in the 'assigned' state" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/reject',
  authorize('volunteer'),
  [idParamValidator, body('reason').optional().isLength({ max: 300 })],
  validateRequest,
  taskController.rejectTask
);

/**
 * @swagger
 * /tasks/{id}/complete:
 *   post:
 *     tags: [Tasks]
 *     summary: Complete Task
 *     description: "volunteer only. Valid from 'assigned' or 'in_progress'. Sets completedAt (and startedAt if it was never set), bumps the volunteer's completedTasksCount and trustScore by a flat +2 (deterministic, not AI-scored), and resets availability to 'available'."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: object, properties: { task: { $ref: '#/components/schemas/Task' } } }
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { description: "Task is not assigned to the caller" }
 *       404: { $ref: '#/components/responses/NotFoundError' }
 *       409: { description: "Task is not in an in-progress/assigned state" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:id/complete',
  authorize('volunteer'),
  [idParamValidator],
  validateRequest,
  taskController.completeTask
);

module.exports = router;
