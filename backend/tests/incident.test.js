/**
 * tests/incident.test.js
 * Incident status transition state machine — the most business-critical
 * logic in this resource. Tests services/incident.service.js directly
 * (mocking the Model) rather than going through HTTP, since this is
 * state-machine logic, not routing/validation logic.
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const Incident = require('../models/Incident.model');
const ActivityLog = require('../models/ActivityLog.model');
const incidentService = require('../services/incident.service');

const AUTHORITY = { id: '507f1f77bcf86cd799439201', role: 'authority' };
const ADMIN = { id: '507f1f77bcf86cd799439202', role: 'admin' };

describe('incident.service — status transitions', () => {
  let incidentDoc;

  beforeEach(() => {
    ActivityLog.create = jest.fn().mockResolvedValue({});
    incidentDoc = {
      _id: 'inc1',
      status: 'reported',
      statusHistory: [{ status: 'reported', changedAt: new Date(), changedBy: null, note: null }],
      resolvedAt: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    Incident.findById = jest.fn().mockResolvedValue(incidentDoc);
  });

  it('allows a valid transition (reported -> active) for an authority', async () => {
    const result = await incidentService.updateIncidentStatus('inc1', 'active', AUTHORITY);
    expect(result.status).toBe('active');
    expect(result.statusHistory).toHaveLength(2);
    expect(result.statusHistory[1].status).toBe('active');
  });

  it('rejects an invalid transition (reported -> resolved, skipping active) for an authority', async () => {
    await expect(incidentService.updateIncidentStatus('inc1', 'resolved', AUTHORITY)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(incidentDoc.status).toBe('reported'); // unchanged
  });

  it('allows an admin to force a transition a non-admin could not make', async () => {
    const result = await incidentService.updateIncidentStatus('inc1', 'resolved', ADMIN);
    expect(result.status).toBe('resolved');
  });

  it('sets resolvedAt when transitioning into "resolved" for the first time', async () => {
    expect(incidentDoc.resolvedAt).toBeNull();
    const result = await incidentService.updateIncidentStatus('inc1', 'resolved', ADMIN);
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  it('rejects any transition out of the terminal "archived" state', async () => {
    incidentDoc.status = 'archived';
    incidentDoc.statusHistory = [{ status: 'archived', changedAt: new Date() }];
    await expect(incidentService.updateIncidentStatus('inc1', 'active', AUTHORITY)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('throws 404 for a nonexistent incident', async () => {
    Incident.findById = jest.fn().mockResolvedValue(null);
    await expect(incidentService.updateIncidentStatus('does-not-exist', 'active', AUTHORITY)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
