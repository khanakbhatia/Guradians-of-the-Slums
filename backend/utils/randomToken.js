/**
 * utils/randomToken.js
 * Opaque random tokens used for refresh tokens, email verification links,
 * and password reset links. The RAW value is what gets emailed/cookied to
 * the client; only its SHA-256 HASH is ever stored in MongoDB — so a
 * database leak alone can't be used to log in, verify an email, or reset
 * a password.
 */

const crypto = require('crypto');

/** Returns a URL-safe raw token (sent to the client, never persisted). */
const generateRawToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

/** Deterministic hash of a raw token, safe to store and compare against. */
const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

module.exports = { generateRawToken, hashToken };
