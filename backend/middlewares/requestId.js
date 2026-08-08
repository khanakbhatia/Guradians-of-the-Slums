/**
 * middlewares/requestId.js
 * Attaches a unique id to every request (req.id) and echoes it back as
 * X-Request-Id. Ties together the http/security/admin log channels —
 * grep one request id across all three files to reconstruct exactly what
 * happened for a single request. Uses Node's built-in crypto.randomUUID,
 * no new dependency needed.
 */

const { randomUUID } = require('crypto');

const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

module.exports = requestId;
