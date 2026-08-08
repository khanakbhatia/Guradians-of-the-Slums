/**
 * middlewares/adminAuditLogger.js
 * Logs every request made under the admin namespace (routes/v1/admin.routes.js)
 * to its own admin/ log channel — independent of whether the underlying
 * service remembers to write an ActivityLog entry. ActivityLog captures
 * WHAT changed (business-level); this captures WHO-hit-WHAT-endpoint-WHEN
 * regardless of outcome, including admin GETs that ActivityLog never sees.
 *
 * Mounted after protect + authorize('admin'), so req.user is always
 * present here. Logs on response finish so the final status code and
 * duration are captured, not just the incoming request.
 */

const { adminLogger } = require('../utils/logger');

const adminAuditLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    adminLogger.info('admin request', {
      requestId: req.id,
      adminId: req.user?.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    });
  });

  next();
};

module.exports = adminAuditLogger;
