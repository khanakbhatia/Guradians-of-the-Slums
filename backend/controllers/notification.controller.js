/**
 * controllers/notification.controller.js
 * Thin HTTP layer: parse req, call services/notification.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

const listNotifications = asyncHandler(async (req, res) => {
  const { notifications, meta } = await notificationService.listNotifications(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, { notifications }, 'Notifications fetched', meta));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unread = await notificationService.getUnreadCount(req.user.id);
  res.status(200).json(new ApiResponse(200, { unread }, 'Unread count fetched'));
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.status(200).json(new ApiResponse(200, result, 'Notifications marked as read'));
});

const broadcast = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcast(req.body, req.user);
  res.status(201).json(new ApiResponse(201, result, 'Broadcast sent'));
});

const authorityAlert = asyncHandler(async (req, res) => {
  const result = await notificationService.sendAuthorityAlert(req.body, req.user);
  res.status(201).json(new ApiResponse(201, result, 'Authority alert sent'));
});

const volunteerAlert = asyncHandler(async (req, res) => {
  const result = await notificationService.sendVolunteerAlert(req.body, req.user);
  res.status(201).json(new ApiResponse(201, result, 'Volunteer alert sent'));
});

const citizenAlert = asyncHandler(async (req, res) => {
  const result = await notificationService.sendCitizenAlert(req.body, req.user);
  res.status(201).json(new ApiResponse(201, result, 'Citizen alert sent'));
});

const incidentRoomAlert = asyncHandler(async (req, res) => {
  await notificationService.sendIncidentRoomAlert(req.params.incidentId, req.body, req.user);
  res.status(200).json(new ApiResponse(200, null, 'Room alert pushed to connected clients'));
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  broadcast,
  authorityAlert,
  volunteerAlert,
  citizenAlert,
  incidentRoomAlert,
};
