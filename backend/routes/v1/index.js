/**
 * routes/v1/index.js
 * Aggregates every v1 resource router. Mounted in app.js as:
 *   app.use('/api/v1', require('./routes/v1'))
 */

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/incidents', require('./incident.routes'));
router.use('/risk-zones', require('./riskZone.routes'));
router.use('/volunteers', require('./volunteer.routes'));
router.use('/tasks', require('./task.routes')); // PARTIAL — accept/reject/complete only; full CRUD is a future turn
router.use('/citizen-reports', require('./citizenReport.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/chat-rooms', require('./chat.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/media', require('./media.routes'));

module.exports = router;
