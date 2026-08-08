/**
 * services/chat.service.js
 * Rooms and messages are written here (REST is the single source of
 * truth for persisted chat data); real-time delivery is a Socket.IO push
 * fired after the DB write succeeds. Typing indicators have no DB
 * representation at all — those are handled purely in sockets/chatHandlers.js.
 */

const ChatRoom = require('../models/ChatRoom.model');
const Message = require('../models/Message.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const { compressImage } = require('../utils/imageCompression');
const cloudinaryUpload = require('./cloudinaryUpload.service');
const { safeEmitToRooms } = require('../config/socket');
const { buildCursorFilter, parseCursorLimit, encodeCursor } = require('../utils/cursorPagination');

const CLOUDINARY_FOLDER = 'chat-attachments';
const chatRoom = (id) => `chat:${id}`;

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const isParticipant = (room, userId) => room.participants.some((p) => String(p) === String(userId));

const assertParticipantOrAdmin = (room, actor) => {
  if (actor.role === 'admin') return;
  if (!isParticipant(room, actor.id)) {
    throw new ApiError(403, 'You are not a participant in this chat room');
  }
};

const createRoom = async (payload, actor) => {
  const { roomType = 'incident', incident, name } = payload;
  let participantIds = Array.isArray(payload.participants) ? [...new Set(payload.participants.map(String))] : [];
  if (!participantIds.includes(String(actor.id))) participantIds.push(String(actor.id));

  if (roomType === 'direct') {
    if (participantIds.length !== 2) {
      throw new ApiError(400, 'A direct room must have exactly 2 participants (including you)');
    }
    const existing = await ChatRoom.findOne({
      roomType: 'direct',
      participants: { $all: participantIds, $size: 2 },
    }).lean();
    if (existing) {
      throw new ApiError(409, `A direct room between these users already exists (id: ${existing._id})`);
    }
  }

  if (roomType === 'incident' && !incident) {
    throw new ApiError(400, 'incident is required when roomType is "incident"');
  }

  // Confirm every participant is a real, active user before creating the room.
  const activeCount = await User.countDocuments({ _id: { $in: participantIds }, isActive: true });
  if (activeCount !== participantIds.length) {
    throw new ApiError(400, 'One or more participants are not valid active accounts');
  }

  const room = await ChatRoom.create({ name, roomType, incident: incident || null, participants: participantIds });
  return room;
};

const getRoomById = async (id, actor) => {
  const room = await ChatRoom.findById(id).populate('participants', 'name avatar role');
  if (!room) throw new ApiError(404, 'Chat room not found');
  assertParticipantOrAdmin(room, actor);
  return room;
};

const listRooms = async (actor, query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  const filter = { participants: actor.id, isActive: true };
  const [rooms, totalItems] = await Promise.all([
    ChatRoom.find(filter)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants', 'name avatar role')
      .lean(),
    ChatRoom.countDocuments(filter),
  ]);

  return { rooms, meta: { page, limit, totalItems, totalPages: Math.max(Math.ceil(totalItems / limit), 1) } };
};

const addParticipant = async (roomId, newUserId, actor) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, 'Chat room not found');
  assertParticipantOrAdmin(room, actor);

  if (isParticipant(room, newUserId)) {
    throw new ApiError(409, 'User is already a participant in this room');
  }
  const user = await User.findById(newUserId).select('isActive').lean();
  if (!user || !user.isActive) {
    throw new ApiError(400, 'Target user is not a valid active account');
  }

  room.participants.push(newUserId);
  await room.save();

  safeEmitToRooms([chatRoom(room._id)], 'chat:participantAdded', { roomId: String(room._id), userId: newUserId });
  return room;
};

const removeParticipant = async (roomId, targetUserId, actor) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, 'Chat room not found');

  const isSelf = String(targetUserId) === String(actor.id);
  if (!isSelf && actor.role !== 'admin') {
    throw new ApiError(403, 'Only an admin can remove another participant — you can remove yourself');
  }
  if (!isParticipant(room, targetUserId)) {
    throw new ApiError(404, 'That user is not a participant in this room');
  }
  if (room.participants.length <= 2) {
    throw new ApiError(409, 'Cannot remove — a chat room requires at least 2 participants');
  }

  room.participants = room.participants.filter((p) => String(p) !== String(targetUserId));
  await room.save();

  safeEmitToRooms([chatRoom(room._id)], 'chat:participantRemoved', { roomId: String(room._id), userId: targetUserId });
  return room;
};

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const listMessages = async (roomId, actor, query) => {
  const room = await ChatRoom.findById(roomId).select('participants');
  if (!room) throw new ApiError(404, 'Chat room not found');
  assertParticipantOrAdmin(room, actor);

  const limit = parseCursorLimit(query);
  const filter = { chatRoom: roomId, isDeleted: false, ...buildCursorFilter(query.cursor) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate('sender', 'name avatar')
    .lean();

  const nextCursor = messages.length === limit ? encodeCursor(messages[messages.length - 1]) : null;

  return { messages, meta: { limit, nextCursor } };
};

const sendMessage = async (roomId, actor, { content, files }) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, 'Chat room not found');
  assertParticipantOrAdmin(room, actor);

  if (!content && (!files || files.length === 0)) {
    throw new ApiError(400, 'A message needs either content or at least one image attachment');
  }

  const results = await Promise.allSettled(
    (files || []).map(async (file) => {
      const { buffer } = await compressImage(file.buffer);
      const uploaded = await cloudinaryUpload.uploadBuffer(buffer, CLOUDINARY_FOLDER);
      return { url: uploaded.url, publicId: uploaded.publicId, mimeType: 'image/jpeg' };
    })
  );
  // Parallel uploads, and a failed attachment doesn't block the message from
  // sending at all if there's text content — the Message schema's own
  // pre-validate hook (content OR attachments) is what catches the one case
  // that should still fail: no text AND every attachment failed.
  const attachments = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);

  const message = await Message.create({
    chatRoom: roomId,
    sender: actor.id,
    content: content || undefined,
    attachments,
  });
  await message.populate('sender', 'name avatar');

  room.lastMessageAt = new Date();
  await room.save();

  safeEmitToRooms([chatRoom(roomId)], 'chat:message', message);

  // Notify participants who aren't the sender — reuses the Notification
  // system built for alerts, so an offline participant still sees an
  // unread badge even though the live chat push only reaches connected sockets.
  const recipients = room.participants.filter((p) => String(p) !== String(actor.id));
  if (recipients.length > 0) {
    const docs = recipients.map((recipient) => ({
      recipient,
      type: 'chat_message',
      title: 'New message',
      message: content ? content.slice(0, 100) : 'Sent an image',
      channel: 'in_app',
      priority: 'normal',
      relatedEntity: { kind: 'ChatRoom', item: roomId },
    }));
    await Notification.insertMany(docs, { ordered: false });
    safeEmitToRooms(
      recipients.map((id) => `user:${id}`),
      'notification:new',
      { type: 'chat_message', title: 'New message', priority: 'normal' }
    );
  }

  return message;
};

// ---------------------------------------------------------------------------
// Seen status — bulk "mark everything in this room read up to now",
// the standard chat UX (not per-message acknowledgement).
// ---------------------------------------------------------------------------

const markRoomSeen = async (roomId, actor) => {
  const room = await ChatRoom.findById(roomId).select('participants');
  if (!room) throw new ApiError(404, 'Chat room not found');
  assertParticipantOrAdmin(room, actor);

  const seenAt = new Date();
  const result = await Message.updateMany(
    { chatRoom: roomId, sender: { $ne: actor.id }, 'readBy.user': { $ne: actor.id } },
    { $push: { readBy: { user: actor.id, readAt: seenAt } } }
  );

  safeEmitToRooms([chatRoom(roomId)], 'chat:seen', {
    roomId: String(roomId),
    userId: actor.id,
    seenAt: seenAt.toISOString(),
  });

  return { messagesMarkedSeen: result.modifiedCount };
};

module.exports = {
  createRoom,
  getRoomById,
  listRooms,
  addParticipant,
  removeParticipant,
  listMessages,
  sendMessage,
  markRoomSeen,
  isParticipant, // exported for sockets/chatHandlers.js to reuse the same membership check
};
