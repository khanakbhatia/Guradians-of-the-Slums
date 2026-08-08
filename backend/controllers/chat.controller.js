/**
 * controllers/chat.controller.js
 * Thin HTTP layer: parse req, call services/chat.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const chatService = require('../services/chat.service');

const createRoom = asyncHandler(async (req, res) => {
  const room = await chatService.createRoom(req.body, req.user);
  res.status(201).json(new ApiResponse(201, { room }, 'Chat room created'));
});

const getRoom = asyncHandler(async (req, res) => {
  const room = await chatService.getRoomById(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { room }, 'Chat room fetched'));
});

const listRooms = asyncHandler(async (req, res) => {
  const { rooms, meta } = await chatService.listRooms(req.user, req.query);
  res.status(200).json(new ApiResponse(200, { rooms }, 'Chat rooms fetched', meta));
});

const addParticipant = asyncHandler(async (req, res) => {
  const room = await chatService.addParticipant(req.params.id, req.body.userId, req.user);
  res.status(200).json(new ApiResponse(200, { room }, 'Participant added'));
});

const removeParticipant = asyncHandler(async (req, res) => {
  const room = await chatService.removeParticipant(req.params.id, req.params.userId, req.user);
  res.status(200).json(new ApiResponse(200, { room }, 'Participant removed'));
});

const listMessages = asyncHandler(async (req, res) => {
  const { messages, meta } = await chatService.listMessages(req.params.id, req.user, req.query);
  res.status(200).json(new ApiResponse(200, { messages }, 'Messages fetched', meta));
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.params.id, req.user, {
    content: req.body.content,
    files: req.files,
  });
  res.status(201).json(new ApiResponse(201, { message }, 'Message sent'));
});

const markSeen = asyncHandler(async (req, res) => {
  const result = await chatService.markRoomSeen(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, result, 'Room marked as seen'));
});

module.exports = {
  createRoom,
  getRoom,
  listRooms,
  addParticipant,
  removeParticipant,
  listMessages,
  sendMessage,
  markSeen,
};
