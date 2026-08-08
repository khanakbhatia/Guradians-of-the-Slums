/**
 * controllers/citizenReport.controller.js
 * Thin HTTP layer: parse req, call services/citizenReport.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const citizenReportService = require('../services/citizenReport.service');

const createReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.createReport(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, { report }, 'Report created'));
});

const getReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.getReportById(req.params.id);
  res.status(200).json(new ApiResponse(200, { report }, 'Report fetched'));
});

const listReports = asyncHandler(async (req, res) => {
  const { reports, meta } = await citizenReportService.listReports(req.query);
  res.status(200).json(new ApiResponse(200, { reports }, 'Reports fetched', meta));
});

const uploadImages = asyncHandler(async (req, res) => {
  const { report, uploadedCount, failedCount } = await citizenReportService.uploadReportImages(
    req.params.id,
    req.user,
    req.files
  );
  const message = failedCount > 0 ? `${uploadedCount} image(s) uploaded, ${failedCount} failed` : 'Images uploaded';
  res.status(200).json(new ApiResponse(200, { report }, message));
});

const getStatus = asyncHandler(async (req, res) => {
  const status = await citizenReportService.getReportStatus(req.params.id);
  res.status(200).json(new ApiResponse(200, { status }, 'Report status fetched'));
});

const verifyReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.verifyReport(req.params.id, req.user, req.body.note);
  res.status(200).json(new ApiResponse(200, { report }, 'Report verified'));
});

const flagReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.flagReport(req.params.id, req.user, req.body.note);
  res.status(200).json(new ApiResponse(200, { report }, 'Report flagged'));
});

const rejectReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.rejectReport(req.params.id, req.user, req.body.note);
  res.status(200).json(new ApiResponse(200, { report }, 'Report rejected'));
});

const resolveReport = asyncHandler(async (req, res) => {
  const report = await citizenReportService.resolveReport(req.params.id, req.user, req.body.note);
  res.status(200).json(new ApiResponse(200, { report }, 'Report resolved'));
});

const getHistory = asyncHandler(async (req, res) => {
  const { entries, meta } = await citizenReportService.getReportHistory(req.params.id, req.query);
  res.status(200).json(new ApiResponse(200, { entries }, 'Report history fetched', meta));
});

module.exports = {
  createReport,
  getReport,
  listReports,
  uploadImages,
  getStatus,
  verifyReport,
  flagReport,
  rejectReport,
  resolveReport,
  getHistory,
};
