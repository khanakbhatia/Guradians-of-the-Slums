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

  const isAssignedAwaitingAccept = task.status === 'assigned' && !task.acceptedAt && String(task.assignedVolunteer) === String(volunteer._id);
  if (task.status !== 'open' && !isAssignedAwaitingAccept) {
    throw new ApiError(409, `Task is "${task.status}" — cannot be accepted`);
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

const listTasks = async (query, user) => {
  const filter = {};
  const wantsOpenBrowse = user.role === 'volunteer' && (query.open === 'true' || query.status === 'open');

  if (user.role === 'volunteer' && !wantsOpenBrowse) {
    const volunteer = await Volunteer.findOne({ user: user.id });
    if (!volunteer) return [];
    filter.assignedVolunteer = volunteer._id;
  } else if (query.assignedVolunteer) {
    filter.assignedVolunteer = query.assignedVolunteer;
  }

  if (query.status) {
    filter.status = query.status;
  }

  // Nearby/open browsing for volunteers: unassigned tasks near a point,
  // using Task.location's 2dsphere index. This is the "nearby requests"
  // widget's backing query — previously volunteers could only ever see
  // tasks already assigned to them, so there was no way to discover open
  // tasks to accept.
  if (wantsOpenBrowse && query.lng !== undefined && query.lat !== undefined) {
    const lng = Number(query.lng);
    const lat = Number(query.lat);
    const radiusKm = query.radiusKm !== undefined ? Number(query.radiusKm) : 15;
    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      filter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Math.max(0, radiusKm) * 1000,
        },
      };
    }
  }

  const cursor = Task.find(filter).populate('riskZone');
  // $nearSphere already returns nearest-first; an explicit sort would
  // conflict with it, so only sort by recency for the non-geo query shape.
  if (!filter.location) cursor.sort({ createdAt: -1 });
  return cursor.lean();
};

const createTask = async (payload, authorityUserId) => {
  const task = await Task.create({
    title: payload.title,
    description: payload.description,
    incident: payload.incident,
    riskZone: payload.riskZone ?? null,
    taskType: payload.taskType,
    priority: payload.priority ?? 'medium',
    requiredSkills: payload.requiredSkills ?? [],
    location: payload.location,
    estimatedTimeMinutes: payload.estimatedTimeMinutes,
    createdByAuthority: payload.createdByAuthority ?? null,
  });

  await ActivityLog.create({
    actor: authorityUserId,
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: task._id,
    metadata: { incidentId: payload.incident },
  });

  return task;
};

module.exports = { getTaskById, acceptTask, rejectTask, completeTask, listTasks, createTask };
