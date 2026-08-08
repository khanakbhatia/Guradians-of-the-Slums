/**
 * utils/generateToken.js
 * Access-token (JWT) signing/verification. Refresh tokens are handled
 * separately in utils/randomToken.js — they're opaque random values
 * hashed at rest, not JWTs, so a leaked DB dump can't be replayed.
 *
 * Algorithm is pinned to HS256 on both sign AND verify. jwt.verify()
 * without an explicit `algorithms` allowlist trusts whatever algorithm
 * the TOKEN ITSELF claims in its header — a classic attack swaps the
 * header to "alg: none" (some libraries historically accepted an
 * unsigned token) or, if the app also holds an RSA public key anywhere,
 * "alg: RS256" signed with that public key treated as an HMAC secret.
 * Pinning `algorithms: ['HS256']` makes jsonwebtoken reject anything
 * that doesn't match, regardless of what the token's own header claims.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALGORITHM = 'HS256';

/**
 * Signs a short-lived access token.
 * @param {{ id: string, role: string }} payload
 */
const signAccessToken = (payload) =>
  jwt.sign({ sub: payload.id, role: payload.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });

/**
 * Verifies an access token. Throws (jsonwebtoken's own errors:
 * TokenExpiredError / JsonWebTokenError) on failure — callers should
 * catch and translate to a 401 via the error middleware.
 */
const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });

module.exports = { signAccessToken, verifyAccessToken };
