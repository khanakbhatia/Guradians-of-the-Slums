/**
 * config/swagger.js
 * Generates the OpenAPI 3.0 spec from JSDoc `@swagger` comments scattered
 * across routes/v1/*.js and docs/swaggerComponents.js. Mounted in app.js
 * at /api/docs (UI) and /api/docs.json (raw spec).
 */

const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const AUTHENTICATION_GUIDE = `
Disaster-response coordination platform — auth, users, risk zones, incidents, tasks, and real-time coordination.

## Authentication

Every endpoint except \`POST /auth/register\`, \`POST /auth/login\`, \`POST /auth/refresh-token\`, \`POST /auth/forgot-password\`, \`POST /auth/reset-password/{token}\`, \`GET /auth/verify-email/{token}\`, and \`POST /auth/resend-verification\` requires an access token.

**Getting a token**
1. \`POST /auth/register\` with \`role\` set to one of \`citizen\`, \`volunteer\`, or \`authority\` (\`admin\` accounts are provisioned separately, not self-registered).
2. \`POST /auth/login\` with \`email\`/\`password\`. The response body contains \`accessToken\` (a short-lived JWT, ~15 minutes) — everything you send after this goes in an \`Authorization: Bearer <accessToken>\` header. A second token, the refresh token, is set automatically as an httpOnly cookie; you never handle it directly in JavaScript.
3. When the access token expires, call \`POST /auth/refresh-token\` (the refresh-token cookie is sent automatically by the browser/HTTP client) to get a new \`accessToken\`. The refresh token itself rotates on every use — the old one stops working the moment a new one is issued.
4. \`POST /auth/logout\` revokes the current device's refresh token; \`POST /auth/logout-all\` revokes every session.

**Roles**: \`citizen\`, \`volunteer\`, \`authority\`, \`admin\` — most write endpoints are restricted to a subset of these; each endpoint's description states which.

## Error Codes

Every error response uses the same envelope: \`{ success: false, message, errors?: [{ field, message }] }\`. \`errors\` is only present on \`422\` validation failures.

| Status | Meaning | Typical cause |
|---|---|---|
| \`400\` | Bad request | Malformed query param/cursor, missing required file, malformed JSON body |
| \`401\` | Not authenticated | Missing, invalid, or expired access token |
| \`403\` | Not authorized | Authenticated, but wrong role or not the resource's owner |
| \`404\` | Not found | Resource id doesn't exist |
| \`409\` | Conflict | Duplicate unique field, invalid state transition, dependent records blocking a delete |
| \`413\` | Payload too large | File over its category's size ceiling, or a requested log file too large to read in full |
| \`422\` | Validation failed | One or more fields failed \`express-validator\` rules — see \`errors[]\` for which |
| \`429\` | Rate limited | Too many requests in the current window — see that endpoint's rate-limit note |
| \`500\` | Internal error | Unhandled server-side failure — logged server-side, generic message returned to the client |
| \`501\` | Not implemented | AI service wrapper endpoints (\`/ai/*\`) before their underlying logic is implemented |
`.trim();

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Guardians Platform API',
      version: '1.0.0',
      description: AUTHENTICATION_GUIDE,
    },
    servers: [{ url: `${env.CLIENT_URL.includes('localhost') ? `http://localhost:${env.PORT}` : ''}/api/v1`, description: 'v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /auth/login or /auth/refresh-token',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Registration, login, tokens, password/email flows' },
      { name: 'Users', description: 'Profile, admin lookup, search, deactivation' },
      { name: 'Incidents', description: 'Incident CRUD, geospatial lookup, status lifecycle, history/timeline' },
      { name: 'RiskZones', description: 'Risk zone CRUD, score updates, heatmap/GeoJSON map exports, geospatial lookup' },
      { name: 'Volunteers', description: 'Volunteer registration, profile, availability, statistics, leaderboard' },
      { name: 'Tasks', description: 'Task actions (accept/reject/complete) — full CRUD is a separate future set' },
      { name: 'CitizenReports', description: 'Crowdsourced hazard reports — creation, image upload, verification workflow, history' },
      { name: 'Notifications', description: 'Personal notifications, unread counts, and role/geo/room-scoped real-time broadcasts over Socket.IO' },
      { name: 'Chat', description: 'Chat rooms and messages — image attachments, cursor-paginated history, seen status. Typing indicators are Socket.IO-only, documented in the route file header.' },
      { name: 'Admin', description: 'Dashboard, analytics, statistics, approval queues, user suspension, system logs, live activity feed' },
      { name: 'AI', description: "M3's API surface over services/ibm/* — every route calls a real IBM wrapper method; wrapper internals are still architecture-only (501) until AI logic is implemented." },
      { name: 'Media', description: 'Centralized upload surfaces (satellite imagery, general citizen images, documents) with validation, category-aware compression, Cloudinary storage, and metadata tracking' },
    ],
  },
  // Every file with @swagger JSDoc blocks — route files plus the shared
  // component/schema definitions.
  apis: ['./routes/v1/*.js', './docs/swaggerComponents.js'],
};

module.exports = swaggerJsdoc(options);
