/**
 * tests/aiService.test.js
 * Integration coverage for services/ibm/* against a real HTTP server
 * (a lightweight in-process stand-in for the Python ai_service) rather
 * than mocked fetch calls — this exercises the actual request-building,
 * response-mapping, retry, and error-normalization logic in
 * services/ibm/aiServiceClient.js and services/ibm/mappers.js end to
 * end. Mongoose models are mocked the same way tests/task.test.js does
 * it (no live MongoDB needed).
 */

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

const http = require('http');

const RISK_SCORE_RESPONSE = {
  area_id: 'BLOCK-14',
  flood_risk: {
    risk_type: 'flood',
    score: 0.78,
    level: 'high',
    confidence: 0.86,
    explanation: {
      why: 'High rainfall and poor drainage',
      human_readable_reasoning: 'Recent rainfall exceeds drainage capacity.',
      confidence: 0.86,
      feature_contributions: [
        { feature_name: 'drainage_capacity', value: 0.4, contribution: 0.4, weight: 0.4, direction: 'increases_risk', explanation: 'Drainage is undersized.' },
      ],
      visual_overlays: [],
    },
  },
  fire_risk: {
    risk_type: 'fire',
    score: 0.1,
    level: 'low',
    confidence: 0.7,
    explanation: { why: 'n/a', human_readable_reasoning: 'n/a', confidence: 0.7, feature_contributions: [], visual_overlays: [] },
  },
  overall_risk: {
    risk_type: 'overall',
    score: 0.78,
    level: 'high',
    confidence: 0.86,
    explanation: {
      why: 'Flood risk dominates',
      human_readable_reasoning: 'Overall risk driven by flood risk.',
      confidence: 0.86,
      feature_contributions: [
        { feature_name: 'drainage_capacity', value: 0.4, contribution: 0.4, weight: 0.4, direction: 'increases_risk', explanation: 'Drainage is undersized.' },
      ],
      visual_overlays: [],
    },
  },
  confidence_score: 0.86,
  model_version: '1.0.0-test',
};

const EXPLAIN_RESPONSE = {
  area_id: 'BLOCK-14',
  explanations: {
    flood: RISK_SCORE_RESPONSE.flood_risk.explanation,
    fire: RISK_SCORE_RESPONSE.fire_risk.explanation,
    overall: RISK_SCORE_RESPONSE.overall_risk.explanation,
  },
  visual_overlays: [],
};

const REPORT_RESPONSE = {
  output_type: 'authority_briefing',
  generated_text: 'Rising water levels observed near the primary drainage channel. Evacuation of low-lying blocks is recommended.',
  grounded: true,
  model_id: 'ibm/granite4:latest',
  citations: [{ citation_id: 'c1', chunk_id: 'chunk-0042', document_id: 'doc1', title: 'Municipal Flood SOP 2023', source_type: 'government_sop', source_uri: null, score: 0.9 }],
  retrieved_contexts: [],
};

const ASSIGN_RESPONSE = {
  incident_id: 'incident1',
  incident_severity: 'high',
  ranked_volunteers: [
    {
      rank: 1,
      volunteer_id: 'vol1',
      name: 'Asha',
      score: 0.91,
      confidence: 0.8,
      reason: 'Nearest available volunteer with matching medical skill',
      matched_skills: ['medical'],
      missing_skills: [],
      contributions: [],
    },
    {
      rank: 2,
      volunteer_id: 'vol2',
      name: 'Ravi',
      score: 0.65,
      confidence: 0.6,
      reason: 'Available but further away',
      matched_skills: ['medical'],
      missing_skills: [],
      contributions: [],
    },
  ],
  scoring_method: 'weighted-explainable-v1-test',
};

const CHAT_RESPONSE = {
  incident_id: 'incident1',
  status: 'completed',
  final_answer: 'Coordinated response plan generated.',
  agent_results: [],
  workflow_steps: [],
  agents: [],
  task_delegations: [],
  shared_memory: [],
  reasoning_flow: [],
  failures: [],
};

let server;
let baseURL;
let requestLog;

const startMockAIService = () =>
  new Promise((resolve) => {
    requestLog = [];
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        requestLog.push({ path: req.url, body: body ? JSON.parse(body) : {} });
        res.setHeader('Content-Type', 'application/json');

        if (req.url === '/risk-score') return res.end(JSON.stringify(RISK_SCORE_RESPONSE));
        if (req.url === '/explain') return res.end(JSON.stringify(EXPLAIN_RESPONSE));
        if (req.url === '/report') return res.end(JSON.stringify(REPORT_RESPONSE));
        if (req.url === '/assign') return res.end(JSON.stringify(ASSIGN_RESPONSE));
        if (req.url === '/chat') return res.end(JSON.stringify(CHAT_RESPONSE));

        res.statusCode = 404;
        return res.end(JSON.stringify({ error: { type: 'NotFound', message: 'unknown route', path: req.url } }));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseURL = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

const stopMockAIService = () => new Promise((resolve) => server.close(resolve));

describe('services/ibm/* against a real ai_service-shaped HTTP server', () => {
  let watsonxService;
  let graniteService;
  let beeAIService;
  let AIServiceClient;

  beforeAll(async () => {
    await startMockAIService();
    process.env.AI_SERVICE_URL = baseURL;
    // Re-require after setting env so the module-level singleton picks up the mock's URL.
    jest.resetModules();
    ({ AIServiceClient } = require('../services/ibm/aiServiceClient'));
    const WatsonxService = require('../services/ibm/watsonx.service');
    const GraniteService = require('../services/ibm/granite.service');
    const BeeAIService = require('../services/ibm/beeai.service');
    watsonxService = new WatsonxService();
    graniteService = new GraniteService();
    beeAIService = new BeeAIService();
  });

  afterAll(async () => {
    await stopMockAIService();
  });

  beforeEach(() => {
    requestLog.length = 0;
  });

  it('WatsonxService.analyzeRisk calls POST /risk-score and maps the response', async () => {
    const result = await watsonxService.analyzeRisk({ riskZoneId: 'BLOCK-14' });

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].path).toBe('/risk-score');
    expect(requestLog[0].body.area_id).toBe('BLOCK-14');
    expect(requestLog[0].body.rainfall).toBeDefined();

    expect(result.riskScore).toBe(78);
    expect(result.riskLevel).toBe('high');
    expect(result.confidence).toBe(0.86);
    expect(result.contributingFactors).toEqual([{ factor: 'drainage_capacity', weight: 0.4 }]);
    expect(result.rawModelOutput.modelVersion).toBe('1.0.0-test');
  });

  it('GraniteService.analyzeRisk calls POST /explain and returns an explanation-shaped payload', async () => {
    const result = await graniteService.analyzeRisk({ riskZoneId: 'BLOCK-14' });

    expect(requestLog[0].path).toBe('/explain');
    expect(result.areaId).toBe('BLOCK-14');
    expect(result.explanations.overall.humanReadableReasoning).toBeDefined();
  });

  it('GraniteService.generateReport calls POST /report and maps the response', async () => {
    const result = await graniteService.generateReport({
      incidentContext: 'Flooding near Block 14 drainage channel',
      audience: 'authority',
    });

    expect(requestLog[0].path).toBe('/report');
    expect(requestLog[0].body.output_type).toBe('authority_briefing');
    expect(requestLog[0].body.incident_context).toContain('Block 14');

    expect(result.body).toContain('Evacuation');
    expect(result.citations).toEqual([{ source: 'Municipal Flood SOP 2023', excerpt: 'chunk-0042' }]);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('GraniteService.generateReport rejects (422) when incidentContext is missing, without calling ai_service', async () => {
    await expect(graniteService.generateReport({})).rejects.toMatchObject({ statusCode: 422 });
    expect(requestLog).toHaveLength(0);
  });

  it('BeeAIService.generateReport delegates to the same /report call as GraniteService', async () => {
    const result = await beeAIService.generateReport({ incidentContext: 'Flooding near Block 14' });
    expect(requestLog[0].path).toBe('/report');
    expect(result.title).toBe('Authority Briefing');
  });

  it('BeeAIService.analyzeRisk calls /risk-score alone when no incidentId is given', async () => {
    const result = await beeAIService.analyzeRisk({ riskZoneId: 'BLOCK-14' });

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].path).toBe('/risk-score');
    expect(result.riskScore).toBe(78);
    expect(result.rawModelOutput.orchestration).toBeNull();
  });

  it('BeeAIService.analyzeRisk calls /risk-score AND /chat when incidentId is given', async () => {
    const result = await beeAIService.analyzeRisk({ riskZoneId: 'BLOCK-14', incidentId: 'incident1' });

    const paths = requestLog.map((r) => r.path);
    expect(paths).toEqual(expect.arrayContaining(['/risk-score', '/chat']));
    expect(result.riskScore).toBe(78);
    expect(result.rawModelOutput.orchestration.finalAnswer).toBe('Coordinated response plan generated.');
  });

  it('BeeAIService.assignVolunteer loads Task/Volunteer from Mongoose, calls POST /assign, and maps the ranked list', async () => {
    const Task = require('../models/Task.model');
    const Volunteer = require('../models/Volunteer.model');

    const taskDoc = {
      _id: 'task1',
      requiredSkills: ['medical'],
      location: { type: 'Point', coordinates: [72.85, 19.05] },
      incident: { _id: 'incident1', severity: 'high' },
    };
    Task.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(taskDoc) });
    Volunteer.find = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: 'vol1', name: 'Asha', skills: ['medical'], availability: 'available', trustScore: 80, currentLocation: { type: 'Point', coordinates: [72.86, 19.06] } },
          { _id: 'vol2', name: 'Ravi', skills: ['medical'], availability: 'available', trustScore: 60, currentLocation: { type: 'Point', coordinates: [72.9, 19.1] } },
        ]),
      }),
    });

    const result = await beeAIService.assignVolunteer({ taskId: 'task1' });

    expect(requestLog[0].path).toBe('/assign');
    expect(requestLog[0].body.required_skills).toContain('medical');
    expect(requestLog[0].body.incident_severity).toBe('high');

    expect(result.recommendedVolunteerId).toBe('vol1');
    expect(result.rationale).toContain('medical skill');
    expect(result.alternates).toEqual([{ volunteerId: 'vol2', score: 0.65 }]);
  });

  it('propagates a clear, retryable-aware error when ai_service is unreachable', async () => {
    const deadClient = new AIServiceClient({ baseURL: 'http://127.0.0.1:1', maxRetries: 0, timeoutMs: 500 });
    await expect(deadClient.postJSON('/risk-score', {})).rejects.toMatchObject({ statusCode: 503 });
  });

  it('retries on a 500 and eventually succeeds once the server recovers', async () => {
    let calls = 0;
    const flaky = http.createServer((req, res) => {
      calls += 1;
      res.setHeader('Content-Type', 'application/json');
      if (calls === 1) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: { type: 'Boom', message: 'transient failure' } }));
      }
      return res.end(JSON.stringify(RISK_SCORE_RESPONSE));
    });
    await new Promise((resolve) => flaky.listen(0, '127.0.0.1', resolve));
    const { port } = flaky.address();

    const client = new AIServiceClient({ baseURL: `http://127.0.0.1:${port}`, maxRetries: 2, retryDelayMs: 10, timeoutMs: 2000 });
    const response = await client.postJSON('/risk-score', { area_id: 'x' });

    expect(calls).toBe(2);
    expect(response.area_id).toBe('BLOCK-14');
    await new Promise((resolve) => flaky.close(resolve));
  });
});
