/**
 * sockets/chatHandlers.js
 * Chat-specific Socket.IO events, registered on every connected socket
 * from config/socket.js. Kept separate from config/socket.js's generic
 * transport-level concerns (auth, user/role rooms) — this file is where
 * chat's own authorization rule (must be a room participant) lives.
 *
 * Typing indicators are intentionally socket-only — there is no
 * TypingIndicator collection and never will be; broadcasting IS the
 * entire feature.
 */

const ChatRoom = require('../models/ChatRoom.model');

const MONGO_ID_RE = /^[0-9a-fA-F]{24}$/;
const chatRoomName = (id) => `chat:${id}`;

const isValidId = (id) => typeof id === 'string' && MONGO_ID_RE.test(id);

const registerChatHandlers = (socket) => {
  const { id: userId, role } = socket.data.user;

  socket.on('chat:join', async (roomId) => {
    if (!isValidId(roomId)) {
      return socket.emit('chat:error', { message: 'Invalid room id' });
    }
    try {
      const room = await ChatRoom.findById(roomId).select('participants').lean();
      if (!room) {
        return socket.emit('chat:error', { message: 'Chat room not found' });
      }
      const isMember = role === 'admin' || room.participants.some((p) => String(p) === String(userId));
      if (!isMember) {
        return socket.emit('chat:error', { message: 'You are not a participant in this chat room' });
      }
      socket.join(chatRoomName(roomId));
    } catch (err) {
      socket.emit('chat:error', { message: 'Could not join chat room' });
    }
  });

  socket.on('chat:leave', (roomId) => {
    if (!isValidId(roomId)) return;
    socket.leave(chatRoomName(roomId));
  });

  // Typing indicators: no DB write, no membership re-check (the client can
  // only be in the room's socket.io room via chat:join above, which
  // already enforced membership) — just relay to everyone else in the room.
  socket.on('chat:typing', (roomId) => {
    if (!isValidId(roomId)) return;
    socket.to(chatRoomName(roomId)).emit('chat:typing', { roomId, userId });
  });

  socket.on('chat:stopTyping', (roomId) => {
    if (!isValidId(roomId)) return;
    socket.to(chatRoomName(roomId)).emit('chat:stopTyping', { roomId, userId });
  });
};

module.exports = { registerChatHandlers };
