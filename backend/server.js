/**
 * server.js
 * Entry point: creates the HTTP server, wires up MongoDB and Socket.IO,
 * and starts listening. Keep app.js free of this bootstrapping concern.
 */

const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const env = require('./config/env');
const { validateEnv } = require('./config/validateEnv');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { logger } = require('./utils/logger');

// Fail fast, before touching the network at all, if a required credential
// is missing — a misconfigured deploy should refuse to start with a clear
// message, not boot successfully and fail mysteriously on the first
// request that needs the missing value.
validateEnv();

const server = http.createServer(app);

initSocket(server);

const start = async () => {
  try {
    // Wait for a real DB connection before accepting traffic — starting
    // the HTTP server first meant every request could hit a route that
    // immediately timed out on its first query instead of the process
    // failing fast and visibly at boot.
    await connectDB();
  } catch (err) {
    logger.error('Failed to connect to MongoDB at startup — exiting', { message: err.message });
    process.exit(1);
  }

  server.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

start();

// ---------------------------------------------------------------------------
// Graceful shutdown — container platforms (Railway, Render, Docker, k8s)
// send SIGTERM and wait a grace period before force-killing the process.
// Without this, in-flight requests get dropped mid-response on every
// deploy/restart, and the Mongo connection is torn down uncleanly instead
// of flushing/closing normally.
// ---------------------------------------------------------------------------

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return; // a second signal during shutdown shouldn't restart the sequence
  shuttingDown = true;

  logger.info(`${signal} received — starting graceful shutdown`);

  // Stop accepting new connections; let in-flight requests finish.
  server.close(async (err) => {
    if (err) {
      logger.error('Error while closing HTTP server', { message: err.message });
    }
    try {
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
    } catch (dbErr) {
      logger.error('Error while closing MongoDB connection', { message: dbErr.message });
    }
    logger.info('Graceful shutdown complete');
    process.exit(err ? 1 : 0);
  });

  // Safety net: if something hangs (a leaked connection, a stuck request),
  // don't let the process wait forever for a platform's SIGKILL — exit on
  // our own terms after a bounded wait instead.
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A rejected promise or thrown error with no handler anywhere in the call
// chain used to crash the process silently (or hang, depending on Node
// version) with nothing but a raw stack trace on stdout. Both get logged
// through the same structured error channel as everything else, then the
// process exits deliberately — letting it limp on in an unknown state is
// worse than a clean restart under a process manager.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection — shutting down', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});
