/**
 * middlewares/sanitizeInput.js
 * Recursively HTML-entity-escapes every string value in req.body. This is
 * a stored-XSS defense: a malicious <script> tag saved in, say, a citizen
 * report's description or a chat message becomes inert text
 * ("&lt;script&gt;...") rather than executable markup if a frontend ever
 * renders it without its own escaping.
 *
 * Deliberately escapes rather than strips tags — a tag-stripping parser
 * mis-parses legitimate text containing "<" (e.g. "<3 volunteers needed",
 * "value < 10") as a malformed tag and can silently truncate everything
 * after it. Escaping can't lose data that way: every character survives,
 * just neutralized.
 *
 * Applied to req.body only — query/param values are simple typed fields
 * already covered by express-validator + express-mongo-sanitize, not
 * free text a stored-XSS payload would hide in.
 */

const { escapeHtml } = require('xss');

const sanitizeValue = (value) => {
  if (typeof value === 'string') return escapeHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};

module.exports = sanitizeInput;
