/**
 * app.js
 * Express application setup: global middleware, routes, error handling.
 * No server/socket binding here — that belongs in server.js.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const requestId = require('./middlewares/requestId');
const requestLogger = require('./middlewares/requestLogger');
const sanitizeInput = require('./middlewares/sanitizeInput');
const { globalLimiter } = require('./middlewares/rateLimiter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Only trust the first hop in front of the app (a single reverse proxy /
// load balancer). Needed so req.ip and the rate limiter see the real
// client IP from X-Forwarded-For instead of the proxy's own address —
// but trusting an unbounded number of hops lets a client forge that
// header and spoof their way past IP-based rate limiting, so this is
// deliberately "1", not `true`.
app.set('trust proxy', 1);

// ---- Security & parsing middleware ----

// Full Helmet defaults (including CSP) globally. The one HTML surface
// this API serves — Swagger UI at /api/docs — gets its CSP explicitly
// relaxed below, scoped to just that route, rather than disabling CSP
// for the whole app to accommodate one page.
app.use(helmet());

const corsOrigins = [env.CLIENT_URL, ...env.ALLOWED_ORIGINS];
app.use(
  cors({
    origin: corsOrigins,
    credentials: true, // required for the refresh-token cookie
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600, // cache preflight responses for 10 minutes
  })
);

app.use(express.json({ limit: '100kb' })); // generous for any JSON payload this API accepts; file uploads go through multer separately, with their own limits
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// NoSQL injection defense — strips any request key starting with "$" or
// containing "." from body/query/params, so a payload like
// { "email": { "$ne": null } } can't manipulate a Mongo query filter.
app.use(mongoSanitize());

// HTTP Parameter Pollution defense — collapses duplicate query params
// (?role=citizen&role=admin) to the last value instead of an array a
// naive filter build might not expect.
app.use(hpp());

// Stored-XSS defense — see middlewares/sanitizeInput.js. Runs after body
// parsing (needs req.body populated) but only reaches JSON/urlencoded
// bodies here; multipart routes re-apply it locally after multer parses
// their text fields (see routes/v1/chat.routes.js, media.routes.js).
app.use(sanitizeInput);

// Global rate-limit floor — see middlewares/rateLimiter.js. Auth routes
// layer their own tighter limiters on top of this.
app.use(globalLimiter);

// Request correlation + logging — requestId must run first so req.id is
// available to requestLogger (and to every downstream security/admin log entry).
app.use(requestId);
app.use(requestLogger);

// API documentation (unversioned — describes whichever versions exist).
// Swagger UI needs inline styles/scripts a default CSP blocks — relaxed
// here, scoped to just this route, not the whole app.
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Guardians Platform API Docs' })
);
app.get('/api/docs.json', (req, res) => res.status(200).json(swaggerSpec));

// Local upload fallback for environments without Cloudinary credentials.
// Stored filenames are generated server-side; no user-controlled paths are exposed.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

// Routes
app.use('/api', routes); // unversioned: /api/health
app.use('/api/v1', require('./routes/v1'));

// 404 + centralized error handling (must stay last, in this order)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
