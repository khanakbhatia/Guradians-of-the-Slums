/**
 * config/env.js
 * Loads and exposes environment variables in one place.
 * Import this instead of calling process.env directly elsewhere.
 */

const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  // Comma-separated additional allowed origins (e.g. a staging frontend
  // alongside production) — CLIENT_URL is always included automatically.
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  MONGO_URI: process.env.MONGO_URI,

  // ---- Access token (short-lived JWT, returned in the JSON body) ----
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',

  // ---- Refresh token (opaque random value, hashed at rest, httpOnly cookie) ----
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
  REFRESH_TOKEN_COOKIE_NAME: process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken',

  // ---- Email verification / password reset token TTLs ----
  EMAIL_VERIFICATION_TTL_HOURS: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS) || 24,
  PASSWORD_RESET_TTL_MINUTES: Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 30,
  REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',

  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // ---- Outbound email (verification + password reset links) ----
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@example.com',

  // ---- Logging ----
  // MORGAN_FORMAT is a Morgan format name ('dev', 'combined', etc.) — kept
  // distinct from WINSTON_LOG_LEVEL (an actual log level: error/warn/info/
  // http/debug) so the two unrelated concepts don't collide under one name.
  MORGAN_FORMAT: process.env.MORGAN_FORMAT || 'dev',
  WINSTON_LOG_LEVEL: process.env.WINSTON_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  LOG_RETENTION_DAYS: Number(process.env.LOG_RETENTION_DAYS) || 14,
  // Verbose per-query Mongoose logging — off by default. Query FILTERS can
  // contain user-supplied values (email, tokens) that shouldn't land in a
  // log file by default; this is an opt-in local-debugging switch, not
  // something to leave on in a shared environment.
  MONGO_DEBUG_LOGGING: process.env.MONGO_DEBUG_LOGGING === 'true',

  // ---- IBM service layer (services/ibm/*) — credentials only, no logic here.
  // Every one of these is unused until the "no AI" constraint on that layer
  // is lifted; isConfigured() checks in services/ibm/IBMServiceBase.js read
  // these to report readiness without making any actual API call.
  WATSONX_API_KEY: process.env.WATSONX_API_KEY,
  WATSONX_URL: process.env.WATSONX_URL,
  WATSONX_PROJECT_ID: process.env.WATSONX_PROJECT_ID,

  GRANITE_MODEL_ID: process.env.GRANITE_MODEL_ID,

  BEEAI_ENDPOINT: process.env.BEEAI_ENDPOINT,
  BEEAI_API_KEY: process.env.BEEAI_API_KEY,

  RAG_VECTOR_STORE_URL: process.env.RAG_VECTOR_STORE_URL,
  RAG_API_KEY: process.env.RAG_API_KEY,
  RAG_COLLECTION_NAME: process.env.RAG_COLLECTION_NAME,

  DATAPREP_ENDPOINT: process.env.DATAPREP_ENDPOINT,
  DATAPREP_API_KEY: process.env.DATAPREP_API_KEY,
};
