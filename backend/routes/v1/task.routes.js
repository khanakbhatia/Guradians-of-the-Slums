/**
 * routes/v1/task.routes.js
 * Mounted at /api/v1/tasks. Volunteer action endpoints (accept/reject/
 * complete), a minimal GET by id, list (with open/nearby browsing for
 * volunteers), and authority/admin task creation. Update/delete Task is
 * still a separate future turn, same pattern as RiskZone/Incident.
 */

const express = require('express');
const { body, param } = require('express-validator');

const taskController = require('../../controllers/task.controller');
const validateRequest = require('../../middlewares/validateRequest');
const { protect, authorize } = require('../../middlewares/auth');
const { TASK_TYPES, PRIORITIES } = require('../../models/Task.model');
const { SKILLS } = require('../../models/Volunteer.model');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks
 *     description: "Authorities/admins see all tasks (optionally filtered by status/assignedVolunteer). Volunteers normally see only tasks assigned to them; passing ?open=true (or ?status=open) instead lists unassigned open tasks for them to browse/accept, optionally sorted nearest-first with ?lng=&lat=&radiusKm= (defaults 15km) — the 'nearby requests' widget's backing query."
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, assigned, in_progress, completed, cancelled] }
 *       - in: query
 *         name: open
 *         schema: { type: boolean }
 *         description: "Volunteer-only shortcut for status=open without the assignedVolunteer restriction."
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 15 }
 *     responses:
 *       200:
 *         description: Tasks fetched
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 */
router.get('/', taskController.listTasks);

/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create Task
 *     description: "authority/admin only. Posts a new relief task against an incident; starts 'open' for volunteers to accept."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, incident, taskType, location]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               incident: { type: string }
 *               riskZone: { type: string }
 *               taskType: { type: string }
 *               priority: { type: string }
 *               requiredSkills: { type: array, items: { type: string } }
 *               estimatedTimeMinutes: { type: number }
 *               location:
 *                 type: object
 *                 properties:
 *                   coordinates: { type: array, items: { type: number }, example: [72.8777, 19.0760] }
 *     responses:
 *       201:
 *         description: Task created
 *       401: { $ref: '#/components/responses/UnauthorizedError' }
 *       403: { $ref: '#/components/responses/ForbiddenError' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/',
  authorize('authority', 'admin'),
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('incident').isMongoId(),
    body('riskZone').optional().isMongoId(),
    body('taskType').isIn(TASK_TYPES),
    body('priority').optional().isIn(PRIORITIES),
    body('requiredSkills').optional().isArray(),
    body('requiredSkills.*').optional().isIn(SKILLS),
    body('location.coordinates').isArray({ min: 2, max: 2 }),
    body('description').optional().isLength({ max: 1000 }),
    body('estimatedTimeMinutes').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  taskController.createTask
);

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
