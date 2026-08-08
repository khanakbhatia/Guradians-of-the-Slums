/**
 * routes/index.js
 * Top-level router — unversioned endpoints only (health checks, docs).
 * Everything versioned lives under routes/v1 and is mounted separately
 * in app.js at /api/v1, so a future /api/v2 can be added without
 * touching this file or v1's routes.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Mongoose connection readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
const READY_STATE_LABELS = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * Reports the app's own liveness AND its critical dependency's state
 * (MongoDB) — a platform health check that only confirms "the Node
 * process is running" misses the far more common failure mode of "the
 * process is up but every request 500s because the DB is unreachable."
 * Returns 200 only when actually ready to serve traffic; 503 otherwise,
 * so a load balancer/orchestrator can correctly route around an instance
 * that's alive but not usable.
 */
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? 'API is healthy' : 'API is running but a dependency is unavailable',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies: {
      database: READY_STATE_LABELS[dbState] || 'unknown',
    },
  });
});

module.exports = router;
