/**
 * middlewares/rateLimiter.js
 * Brute-force protection for auth endpoints. Not in the originally listed
 * stack, but login/forgot-password/verification-resend are unsafe to ship
 * without rate limiting — express-rate-limit is the standard, minimal fit.
 */

const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('../utils/securityLogger');

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('RATE_LIMITED', req);
    res.status(429).json({
      success: false,
      message: 'Too many requests — please try again later',
    });
  },
};

// Login: generous enough for typos, tight enough to blunt credential stuffing.
const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

// Registration: slow down bulk fake-account creation.
const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,
});

// Forgot-password / resend-verification: prevent email-bombing a victim address.
const emailActionLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Global baseline — applied to the whole API in app.js. Exists purely as a
// floor against basic scraping/DoS on endpoints that don't have their own
// tighter limiter (most of the API besides auth).
//
// The previous ceiling of 600/15min (= 40 req/min) was BELOW what the app's
// own dashboards generate: the authority dashboard alone polls ~7 requests
// every 5s (~84 req/min, since the overview stat strip fans out into 4
// parallel count queries), so a single legitimate user exhausted the budget
// in about 30 seconds. Every widget then started receiving 429s and hung on
// its loading skeleton — which looked like "the widgets are broken" but was
// really the API refusing its own frontend. Raised to comfortably clear
// several concurrent dashboards, and made tunable per environment.
const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 5000,
  // Never rate-limit the health probe — orchestrators and the admin
  // dashboard's system-status widget poll it, and a 429 there would be
  // misread as the service being down.
  skip: (req) => req.path === '/health',
});

module.exports = { loginLimiter, registerLimiter, emailActionLimiter, globalLimiter };
