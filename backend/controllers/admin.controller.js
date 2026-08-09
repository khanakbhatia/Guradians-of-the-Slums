/**
 * controllers/admin.controller.js
 * Thin HTTP layer: parse req, call services/admin.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const adminService = require('../services/admin.service');
const adminLogsService = require('../services/adminLogs.service');

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await adminService.getDashboard();
  res.status(200).json(new ApiResponse(200, { dashboard }, 'Dashboard fetched'));
});

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getAnalytics(req.query);
  res.status(200).json(new ApiResponse(200, { analytics }, 'Analytics fetched'));
});

const getStatistics = asyncHandler(async (req, res) => {
  const statistics = await adminService.getStatistics();
  res.status(200).json(new ApiResponse(200, { statistics }, 'Statistics fetched'));
});

const getSystemLogs = asyncHandler(async (req, res) => {
  const { logs, meta } = await adminService.getSystemLogs(req.query);
  res.status(200).json(new ApiResponse(200, { logs }, 'System logs fetched', meta));
});

const getActivityFeed = asyncHandler(async (req, res) => {
  const feed = await adminService.getActivityFeed(req.query);
  res.status(200).json(new ApiResponse(200, { feed }, 'Activity feed fetched'));
});

const getPendingReports = asyncHandler(async (req, res) => {
  const { reports, meta } = await adminService.getPendingReports(req.query);
  res.status(200).json(new ApiResponse(200, { reports }, 'Pending reports fetched', meta));
});

const approveReport = asyncHandler(async (req, res) => {
  const report = await adminService.approveReport(req.params.id, req.user, req.body.note);
  res.status(200).json(new ApiResponse(200, { report }, 'Report approved'));
});

const getPendingVolunteers = asyncHandler(async (req, res) => {
  const { volunteers, meta } = await adminService.getPendingVolunteers(req.query);
  res.status(200).json(new ApiResponse(200, { volunteers }, 'Pending volunteers fetched', meta));
});

const approveVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await adminService.approveVolunteer(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { volunteer }, 'Volunteer approved'));
});

const rejectVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await adminService.rejectVolunteer(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { volunteer }, 'Volunteer rejected'));
});

const suspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.suspendUser(req.params.id, req.user, req.body.reason);
  res.status(200).json(new ApiResponse(200, { user }, 'User suspended'));
});

const unsuspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.unsuspendUser(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { user }, 'User unsuspended'));
});

const listLogFiles = asyncHandler(async (req, res) => {
  const files = await adminLogsService.listLogFiles();
  res.status(200).json(new ApiResponse(200, { files }, 'Log files listed'));
});

const tailLog = asyncHandler(async (req, res) => {
  const result = await adminLogsService.tailLog(req.params.channel, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Log tail fetched'));
});

module.exports = {
  getDashboard,
  getAnalytics,
  getStatistics,
  getSystemLogs,
  getActivityFeed,
  getPendingReports,
  approveReport,
  getPendingVolunteers,
  approveVolunteer,
  rejectVolunteer,
  suspendUser,
  unsuspendUser,
  listLogFiles,
  tailLog,
};
