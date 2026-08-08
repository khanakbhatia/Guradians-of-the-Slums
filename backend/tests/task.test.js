/**
 * tests/task.test.js
 * Task accept/reject/complete — the skill-matching "dummy matching only"
 * logic, availability auto-cycling, and trust-score bump. Tests the
 * service directly since this is business logic, not routing.
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const Task = require('../models/Task.model');
const Volunteer = require('../models/Volunteer.model');
const ActivityLog = require('../models/ActivityLog.model');
const taskService = require('../services/task.service');

const VOLUNTEER_USER_ID = '507f1f77bcf86cd799439211';

describe('task.service', () => {
  let taskDoc;
  let volunteerDoc;

  beforeEach(() => {
    ActivityLog.create = jest.fn().mockResolvedValue({});

    taskDoc = {
      _id: 'task1',
      status: 'open',
      requiredSkills: ['medical'],
      assignedVolunteer: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    volunteerDoc = {
      _id: 'vol1',
      skills: ['medical'],
      availability: 'offline',
      trustScore: 50,
      completedTasksCount: 0,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    Task.findById = jest.fn().mockResolvedValue(taskDoc);
    Volunteer.findOne = jest.fn().mockResolvedValue(volunteerDoc);
  });

  describe('acceptTask', () => {
    it('accepts a task when the volunteer has a matching skill', async () => {
      const result = await taskService.acceptTask('task1', VOLUNTEER_USER_ID);
      expect(result.status).toBe('assigned');
      expect(result.assignedVolunteer).toBe('vol1');
      expect(volunteerDoc.availability).toBe('busy');
    });

    it('rejects acceptance when the volunteer lacks any required skill', async () => {
      volunteerDoc.skills = ['logistics'];
      await expect(taskService.acceptTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 409 });
      expect(taskDoc.status).toBe('open'); // unchanged
    });

    it('allows acceptance regardless of skills when the task requires none', async () => {
      taskDoc.requiredSkills = [];
      volunteerDoc.skills = ['logistics'];
      const result = await taskService.acceptTask('task1', VOLUNTEER_USER_ID);
      expect(result.status).toBe('assigned');
    });

    it('rejects acceptance of a task that is not open', async () => {
      taskDoc.status = 'assigned';
      await expect(taskService.acceptTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 403 when the caller has no volunteer profile', async () => {
      Volunteer.findOne = jest.fn().mockResolvedValue(null);
      await expect(taskService.acceptTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('rejectTask', () => {
    beforeEach(() => {
      taskDoc.status = 'assigned';
      taskDoc.assignedVolunteer = 'vol1';
      volunteerDoc.availability = 'busy';
    });

    it('reverts the task to open and the volunteer to available', async () => {
      const result = await taskService.rejectTask('task1', VOLUNTEER_USER_ID, 'Double-booked');
      expect(result.status).toBe('open');
      expect(result.assignedVolunteer).toBeNull();
      expect(volunteerDoc.availability).toBe('available');
    });

    it('rejects when the task is not assigned to this volunteer', async () => {
      taskDoc.assignedVolunteer = 'someone-else';
      await expect(taskService.rejectTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects when the task has already moved past "assigned"', async () => {
      taskDoc.status = 'in_progress';
      await expect(taskService.rejectTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('completeTask', () => {
    beforeEach(() => {
      taskDoc.status = 'assigned';
      taskDoc.assignedVolunteer = 'vol1';
    });

    it('completes the task and bumps trustScore/completedTasksCount deterministically', async () => {
      const result = await taskService.completeTask('task1', VOLUNTEER_USER_ID);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(volunteerDoc.completedTasksCount).toBe(1);
      expect(volunteerDoc.trustScore).toBe(52); // 50 + flat 2, not a computed score
      expect(volunteerDoc.availability).toBe('available');
    });

    it('caps trustScore at 100', async () => {
      volunteerDoc.trustScore = 99;
      const result = await taskService.completeTask('task1', VOLUNTEER_USER_ID);
      expect(result.status).toBe('completed');
      expect(volunteerDoc.trustScore).toBe(100);
    });

    it('rejects completing a task not assigned to this volunteer', async () => {
      taskDoc.assignedVolunteer = 'someone-else';
      await expect(taskService.completeTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects completing an already-completed task', async () => {
      taskDoc.status = 'completed';
      await expect(taskService.completeTask('task1', VOLUNTEER_USER_ID)).rejects.toMatchObject({ statusCode: 409 });
    });
  });
});
