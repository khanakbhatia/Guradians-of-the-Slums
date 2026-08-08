/**
 * tests/riskZone.test.js
 * The riskLevel-from-riskScore derivation (models/RiskZone.model.js's
 * pre('save') hook) and the score-vs-metadata separation in
 * services/riskZone.service.js. Uses a REAL Mongoose document (not a
 * plain object mock) so the actual schema hook runs, not a stand-in for it.
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const RiskZone = require('../models/RiskZone.model');
const ActivityLog = require('../models/ActivityLog.model');
const riskZoneService = require('../services/riskZone.service');

/** Runs the schema's real pre('save') hook against a document without a live DB connection. */
const runDeriveRiskLevelHook = (doc) =>
  new Promise((resolve) => {
    const hook = RiskZone.schema.s.hooks._pres.get('save').find((h) => h.fn.name === 'deriveRiskLevel');
    hook.fn.call(doc, resolve);
  });

const makeZoneDoc = (overrides = {}) => {
  const doc = new RiskZone({
    blockId: 'BLOCK-TEST',
    settlement: 'Test Settlement',
    hazardType: 'flood',
    riskScore: 50,
    confidence: 0.5,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    ...overrides,
  });
  doc.isNew = false;
  doc.save = jest.fn().mockImplementation(async function () {
    await runDeriveRiskLevelHook(this);
    return this;
  });
  return doc;
};

describe('RiskZone riskLevel derivation (real schema hook)', () => {
  it.each([
    [95, 'critical'],
    [80, 'critical'],
    [79, 'high'],
    [60, 'high'],
    [59, 'moderate'],
    [30, 'moderate'],
    [29, 'low'],
    [0, 'low'],
  ])('riskScore %i derives riskLevel "%s"', async (riskScore, expectedLevel) => {
    const doc = makeZoneDoc({ riskScore });
    await runDeriveRiskLevelHook(doc);
    expect(doc.riskLevel).toBe(expectedLevel);
  });
});

describe('riskZone.service — score vs. metadata separation', () => {
  let zoneDoc;

  beforeEach(() => {
    ActivityLog.create = jest.fn().mockResolvedValue({});
    zoneDoc = makeZoneDoc({ riskScore: 20 }); // starts "low"
    RiskZone.findById = jest.fn().mockResolvedValue(zoneDoc);
  });

  it('updateRiskScore re-derives riskLevel via the real hook', async () => {
    const result = await riskZoneService.updateRiskScore('zone1', { riskScore: 85 }, 'actor1');
    expect(result.riskScore).toBe(85);
    expect(result.riskLevel).toBe('critical');
  });

  it('updateRiskScore sets lastAnalyzedAt', async () => {
    const result = await riskZoneService.updateRiskScore('zone1', { riskScore: 60 }, 'actor1');
    expect(result.lastAnalyzedAt).toBeInstanceOf(Date);
  });

  it('throws 404 for a nonexistent zone', async () => {
    RiskZone.findById = jest.fn().mockResolvedValue(null);
    await expect(riskZoneService.updateRiskScore('missing', { riskScore: 50 }, 'actor1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
