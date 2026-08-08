/**
 * config/socket.js
 * Socket.IO server initialization, JWT authentication, and room management.
 *
 * Room conventions (used by services/notification.service.js):
 *   user:<userId>      - joined automatically on connect; targeted/personal notifications
 *   role:<role>        - joined automatically on connect; role-wide broadcasts
 *                         (role is one of citizen/volunteer/authority/admin)
 *   incident:<id>      - joined on demand via the 'incident:join' event; ephemeral
 *                         room-based pushes (not persisted as Notification docs)
 */

const { Server } = require('socket.io');
const env = require('./env');
const { verifyAccessToken } = require('../utils/generateToken');
const { registerChatHandlers } = require('../sockets/chatHandlers');
const { logger } = require('../utils/logger');

const MONGO_ID_RE = /^[0-9a-fA-F]{24}$/;

let io;

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required: no token provided'));
  }
  try {
    // Same access-token JWT used by the REST API's `protect` middleware.
    // Deliberately no DB lookup here — verifying the signature is enough
    // for a real-time channel, and avoids a DB round trip on every
    // connect/reconnect. Access tokens are short-lived (15m default), so
    // a deactivated account loses its socket privileges within that window.
    const decoded = verifyAccessToken(token);
    socket.data.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    next(new Error('Authentication failed: invalid or expired token'));
  }
};

const registerConnectionHandlers = (socket) => {
  const { id: userId, role } = socket.data.user;

  socket.join(`user:${userId}`);
  socket.join(`role:${role}`);

  socket.on('incident:join', (incidentId) => {
    if (typeof incidentId !== 'string' || !MONGO_ID_RE.test(incidentId)) return;
    socket.join(`incident:${incidentId}`);
  });

  socket.on('incident:leave', (incidentId) => {
    if (typeof incidentId !== 'string' || !MONGO_ID_RE.test(incidentId)) return;
    socket.leave(`incident:${incidentId}`);
  });

  registerChatHandlers(socket);
};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(authenticateSocket);
  io.on('connection', registerConnectionHandlers);

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket(server) first.');
  }
  return io;
};

/**
 * Emits to one or more rooms without throwing if Socket.IO hasn't been
 * initialized (scripts, tests, or a real-time layer that's temporarily
 * down) — a notification's database write must never fail just because
 * the live push layer isn't available.
 */
const safeEmitToRooms = (rooms, event, payload) => {
  try {
    getIO()
      .to(rooms)
      .emit(event, payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    logger.warn('Socket emit skipped', { event, reason: err.message });
  }
};

module.exports = { initSocket, getIO, safeEmitToRooms };
