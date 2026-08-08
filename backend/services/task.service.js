/**
 * services/task.service.js
 * PARTIAL — only what Accept/Reject/Complete Task need (per this turn's
 * scope: volunteer actions, not full Task CRUD). getTaskById is exposed
 * for a minimal read; create/update/delete/list Task are a separate,
 * later resource turn, same as RiskZone and Incident got their own.
 *
 * "Dummy matching only" — the only eligibility rule enforced at accept
 * time is a flat skill-overlap check against Task.requiredSkills. No
 * scoring, ranking, or distance-weighting. That intelligence is deferred.
 */

const Task = require('../models/Task.model');
const Volunteer = require('../models/Volunteer.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');

const TRUST_SCORE_BUMP_ON_COMPLETE = 2; // flat, deterministic — not a computed/weighted score

const getTaskById = async (id) => {
  const task = await Task.findById(id);
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
};

const getOwnVolunteerRecord = async (userId) => {
  const volunteer = await Volunteer.findOne({ user: userId });
  if (!volunteer) {
    throw new ApiError(403, 'No volunteer profile for this account — register one before acting on tasks');
  }
  return volunteer;
};

/**
 * Dummy eligibility check: does this volunteer have at least one of the
 * task's required skills? Skipped entirely if the task lists no required
 * skills. This is the whole "matching" logic for now.
 */
const hasMatchingSkill = (volunteer, task) => {
  if (!task.requiredSkills || task.requiredSkills.length === 0) return true;
  return task.requiredSkills.some((skill) => volunteer.skills.includes(skill));
};

// ---------------------------------------------------------------------------
// Accept
// ---------------------------------------------------------------------------

const acceptTask = async (taskId, userId) => {
  const [task, volunteer] = await Promise.all([getTaskById(taskId), getOwnVolunteerRecord(userId)]);

  if (task.status !== 'open') {
    throw new ApiError(409, `Task is "${task.status}", not "open" — cannot be accepted`);
  }
  if (!hasMatchingSkill(volunteer, task)) {
    throw new ApiError(
      409,
      `You don't have any of the required skills for this task (${task.requiredSkills.join(', ')})`
    );
  }

  task.status = 'assigned';
  task.assignedVolunteer = volunteer._id;
  task.acceptedAt = new Date();
  await task.save();

  volunteer.availability = 'busy';
  await volunteer.save({ validateModifiedOnly: true });

  await ActivityLog.create({
    actor: userId,
    action: 'TASK_ACCEPTED',
    entityType: 'Task',
    entityId: task._id,
    metadata: { volunteerId: volunteer._id },
  });

  return task;
};

// ---------------------------------------------------------------------------
// Reject — only valid before work has started (status 'assigned'); once
// 'in_progress', backing out goes through a future cancel/reassign flow,
// not a simple reject.
// ---------------------------------------------------------------------------

const rejectTask = async (taskId, userId, reason) => {
  const [task, volunteer] = await Promise.all([getTaskById(taskId), getOwnVolunteerRecord(userId)]);

  if (String(task.assignedVolunteer) !== String(volunteer._id)) {
    throw new ApiError(403, 'This task is not assigned to you');
  }
  if (task.status !== 'assigned') {
    throw new ApiError(409, `Task is "${task.status}" — can only reject a task that is "assigned" and not yet started`);
  }

  task.status = 'open';
  task.assignedVolunteer = null;
  task.acceptedAt = null;
  await task.save();

  volunteer.availability = 'available';
  await volunteer.save({ validateModifiedOnly: true });

  await ActivityLog.create({
    actor: userId,
    action: 'TASK_REJECTED',
    entityType: 'Task',
    entityId: task._id,
    metadata: { volunteerId: volunteer._id, reason: reason || null },
  });

  return task;
};

// ---------------------------------------------------------------------------
// Complete
// ---------------------------------------------------------------------------

const completeTask = async (taskId, userId) => {
  const [task, volunteer] = await Promise.all([getTaskById(taskId), getOwnVolunteerRecord(userId)]);

  if (String(task.assignedVolunteer) !== String(volunteer._id)) {
    throw new ApiError(403, 'This task is not assigned to you');
  }
  if (!['assigned', 'in_progress'].includes(task.status)) {
    throw new ApiError(409, `Task is "${task.status}" — can only complete a task that is "assigned" or "in_progress"`);
  }

  const now = new Date();
  if (!task.startedAt) task.startedAt = now;
  task.completedAt = now;
  task.status = 'completed';
  await task.save();

  volunteer.availability = 'available';
  volunteer.completedTasksCount += 1;
  volunteer.trustScore = Math.min(volunteer.trustScore + TRUST_SCORE_BUMP_ON_COMPLETE, 100);
  await volunteer.save({ validateModifiedOnly: true });

  await ActivityLog.create({
    actor: userId,
    action: 'TASK_COMPLETED',
    entityType: 'Task',
    entityId: task._id,
    metadata: { volunteerId: volunteer._id, newCompletedCount: volunteer.completedTasksCount },
  });

  return task;
};

module.exports = { getTaskById, acceptTask, rejectTask, completeTask };
