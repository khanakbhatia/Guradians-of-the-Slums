/**
 * services/adminLogs.service.js
 * Read-only access to the six log channels written by utils/logger.js.
 * Admin-only (enforced in routes/v1/admin.routes.js) — these files can
 * contain IPs, user ids, and (for the database channel, when opted in)
 * raw query filters, so this is not for general consumption.
 *
 * Whole-file read + slice, not a true streaming tail — acceptable at the
 * log volumes a daily-rotated file reaches, but MAX_READABLE_BYTES guards
 * against loading something unexpectedly huge into memory.
 */

const fs = require('fs/promises');
const path = require('path');
const ApiError = require('../utils/ApiError');
const { LOG_DIR } = require('../utils/logger');

const CHANNELS = ['app', 'error', 'http', 'security', 'database', 'admin'];
const MAX_READABLE_BYTES = 20 * 1024 * 1024; // 20MB safety ceiling per file read
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const todayStr = () => new Date().toISOString().slice(0, 10);

const filenameFor = (channel, date) => `${channel}-${date}.log`;

/** Lists every log file currently on disk, grouped by channel, newest first. */
const listLogFiles = async () => {
  const entries = await fs.readdir(LOG_DIR).catch(() => []);
  const logFiles = entries.filter((f) => f.endsWith('.log'));

  const stats = await Promise.all(
    logFiles.map(async (filename) => {
      const filePath = path.join(LOG_DIR, filename);
      const stat = await fs.stat(filePath);
      const match = filename.match(/^([a-z]+)-(\d{4}-\d{2}-\d{2})\.log$/);
      return {
        filename,
        channel: match?.[1] || 'unknown',
        date: match?.[2] || null,
        sizeBytes: stat.size,
        lastModified: stat.mtime,
      };
    })
  );

  return stats.sort((a, b) => (a.date < b.date ? 1 : -1));
};

/**
 * Returns the last `lines` entries from one channel's log file for one
 * date, each parsed from JSON where possible (falls back to the raw
 * string for a line that isn't valid JSON — e.g. a partial write).
 */
const tailLog = async (channel, { date = todayStr(), lines = 100 } = {}) => {
  if (!CHANNELS.includes(channel)) {
    throw new ApiError(400, `Unknown log channel "${channel}". Valid channels: ${CHANNELS.join(', ')}`);
  }
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }

  const filePath = path.join(LOG_DIR, filenameFor(channel, date));

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { channel, date, lines: [], totalLines: 0 };
  }

  if (stat.size > MAX_READABLE_BYTES) {
    throw new ApiError(
      413,
      `Log file too large to read in full (${Math.round(stat.size / 1024 / 1024)}MB). Narrow the date or request a smaller range.`
    );
  }

  const content = await fs.readFile(filePath, 'utf8');
  const allLines = content.split('\n').filter(Boolean);
  const capped = Math.min(Math.max(parseInt(lines, 10) || 100, 1), 1000);
  const tail = allLines.slice(-capped);

  const parsed = tail.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });

  return { channel, date, lines: parsed, totalLines: allLines.length };
};

module.exports = { CHANNELS, listLogFiles, tailLog };
