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

// Global baseline — applied to the whole API in app.js. Generous enough
// that no legitimate client should ever hit it; exists purely as a floor
// against basic scraping/DoS on endpoints that don't have their own
// tighter limiter (most of the API besides auth).
const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 600,
});

module.exports = { loginLimiter, registerLimiter, emailActionLimiter, globalLimiter };
