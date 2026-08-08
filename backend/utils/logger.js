/**
 * utils/logger.js
 * Central Winston logging setup. Five separate channels, each its own
 * daily-rotating file under /logs, kept apart on purpose rather than one
 * giant interleaved log:
 *
 *   logs/app-%DATE%.log        - combined application log (info and above)
 *   logs/error-%DATE%.log      - errors only, mirrored from the app log
 *   logs/http-%DATE%.log       - HTTP access log (Morgan output — see middlewares/requestLogger.js)
 *   logs/security-%DATE%.log   - auth failures, 401/403s, rate-limit trips (see utils/securityLogger.js)
 *   logs/database-%DATE%.log   - Mongo connection lifecycle + opt-in query debug (see config/db.js)
 *   logs/admin-%DATE%.log      - every request made by an admin (see middlewares/adminAuditLogger.js)
 *
 * Rationale for splitting: a security review or an on-call engineer
 * chasing a DB issue shouldn't have to grep through routine HTTP access
 * lines to find what they need. Each file rotates daily and is capped at
 * LOG_RETENTION_DAYS so disk usage doesn't grow unbounded.
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const env = require('../config/env');

const LOG_DIR = path.join(__dirname, '..', 'logs');

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const dailyRotateFile = (filenamePrefix, level) =>
  new winston.transports.DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${filenamePrefix}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${env.LOG_RETENTION_DAYS}d`,
    level,
    format: jsonFormat,
  });

/**
 * Builds a labeled Winston logger writing to its own rotating file, plus
 * console output in non-production (colorized, human-readable).
 */
const buildChannelLogger = (filenamePrefix, defaultLevel) => {
  const transports = [dailyRotateFile(filenamePrefix, defaultLevel)];
  if (!['production', 'test'].includes(env.NODE_ENV)) {
    transports.push(new winston.transports.Console({ format: consoleFormat }));
  }
  return winston.createLogger({
    level: env.WINSTON_LOG_LEVEL,
    defaultMeta: { channel: filenamePrefix },
    transports,
    exitOnError: false,
  });
};

// ---- Application logger (app-%DATE%.log + error-%DATE%.log) ----
const logger = winston.createLogger({
  level: env.WINSTON_LOG_LEVEL,
  defaultMeta: { channel: 'app' },
  transports: [
    dailyRotateFile('app', env.WINSTON_LOG_LEVEL),
    dailyRotateFile('error', 'error'),
    ...(!['production', 'test'].includes(env.NODE_ENV) ? [new winston.transports.Console({ format: consoleFormat })] : []),
  ],
  exitOnError: false,
});

// ---- Dedicated channels ----
const httpLogger = buildChannelLogger('http', 'http');
const securityLoggerChannel = buildChannelLogger('security', 'warn');
const databaseLogger = buildChannelLogger('database', 'info');
const adminLogger = buildChannelLogger('admin', 'info');

module.exports = { logger, httpLogger, securityLoggerChannel, databaseLogger, adminLogger, LOG_DIR };
