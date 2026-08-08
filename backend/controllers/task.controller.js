/**
 * controllers/task.controller.js
 * PARTIAL — see services/task.service.js header. Only the volunteer
 * action endpoints (accept/reject/complete) plus a minimal get-by-id.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const taskService = require('../services/task.service');

const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  res.status(200).json(new ApiResponse(200, { task }, 'Task fetched'));
});

const acceptTask = asyncHandler(async (req, res) => {
  const task = await taskService.acceptTask(req.params.id, req.user.id);
  res.status(200).json(new ApiResponse(200, { task }, 'Task accepted'));
});

const rejectTask = asyncHandler(async (req, res) => {
  const task = await taskService.rejectTask(req.params.id, req.user.id, req.body.reason);
  res.status(200).json(new ApiResponse(200, { task }, 'Task rejected'));
});

const completeTask = asyncHandler(async (req, res) => {
  const task = await taskService.completeTask(req.params.id, req.user.id);
  res.status(200).json(new ApiResponse(200, { task }, 'Task completed'));
});

module.exports = { getTask, acceptTask, rejectTask, completeTask };
