/**
 * services/citizenReport.service.js
 * Pure database operations. Verification is a set of named actions
 * (verify/flag/reject/resolve), not a generic status setter — each one
 * carries its own valid "from" states and its own deterministic
 * reliabilityScore adjustment (flat +/-, no scoring model — matches the
 * "dummy logic only" precedent set for volunteer task matching).
 */

const CitizenReport = require('../models/CitizenReport.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { assertOwnerOrAdmin } = require('../utils/ownership');
const { parsePagination, buildPaginationMeta, parseSort, parseFilters } = require('../utils/queryBuilder');
const { compressImage } = require('../utils/imageCompression');
const cloudinaryUpload = require('./cloudinaryUpload.service');

const CREATE_FIELDS = ['hazardType', 'severity', 'description', 'location', 'riskZone', 'incident'];
const LIST_FILTER_FIELDS = ['status', 'hazardType', 'severity'];
const LIST_SORT_FIELDS = ['createdAt', 'reliabilityScore', 'severity'];
const DEFAULT_SORT = { createdAt: -1 };

const MAX_PHOTOS = 5;
const CLOUDINARY_FOLDER = 'citizen-reports';

// Flat, deterministic reliability adjustments — not a computed/weighted
// score. Replacing this with a real model is explicitly future work.
const RELIABILITY_DELTA = { verify: 10, flag: -15, reject: -20, resolve: 0 };

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const createReport = async (payload, actorId) => {
  const data = {};
  for (const field of CREATE_FIELDS) {
    if (payload[field] !== undefined) data[field] = payload[field];
  }
  data.reporter = actorId;

  const report = await CitizenReport.create(data);

  await ActivityLog.create({
    actor: actorId,
    action: 'CITIZENREPORT_CREATED',
    entityType: 'CitizenReport',
    entityId: report._id,
    metadata: { hazardType: report.hazardType, severity: report.severity },
  });

  return report;
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const getReportById = async (id) => {
  const report = await CitizenReport.findById(id).populate('reporter', 'name avatar');
  if (!report) throw new ApiError(404, 'Citizen report not found');
  return report;
};

const listReports = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, LIST_SORT_FIELDS, DEFAULT_SORT);
  const filter = parseFilters(query, LIST_FILTER_FIELDS);

  const [reports, totalItems] = await Promise.all([
    CitizenReport.find(filter).sort(sort).skip(skip).limit(limit).populate('reporter', 'name avatar').lean(),
    CitizenReport.countDocuments(filter),
  ]);

  return { reports, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

// ---------------------------------------------------------------------------
// Images — compress then upload to Cloudinary in parallel (Promise.allSettled,
// not Promise.all): a failed file shouldn't abort the others or leave an
// already-uploaded file's Cloudinary asset orphaned with no DB record — each
// file's outcome is tracked independently, and successes are saved even if
// some files in the same request fail.
// ---------------------------------------------------------------------------

const uploadReportImages = async (reportId, actor, files) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least one image file is required (field name: "photos")');
  }

  const report = await CitizenReport.findById(reportId);
  if (!report) throw new ApiError(404, 'Citizen report not found');

  const isAdmin = actor.role === 'admin';
  assertOwnerOrAdmin(actor, report.reporter, 'Only the original reporter (or an admin) can add images to this report');
  if (report.status !== 'pending' && !isAdmin) {
    throw new ApiError(409, `Cannot add images once a report is "${report.status}" — evidence is locked after review starts`);
  }
  if (report.photos.length + files.length > MAX_PHOTOS) {
    throw new ApiError(
      400,
      `This would exceed the ${MAX_PHOTOS}-photo limit (${report.photos.length} already attached, ${files.length} submitted)`
    );
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const { buffer } = await compressImage(file.buffer);
      const result = await cloudinaryUpload.uploadBuffer(buffer, CLOUDINARY_FOLDER);
      return { url: result.url, publicId: result.publicId };
    })
  );

  const uploaded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failedCount = results.length - uploaded.length;

  if (uploaded.length === 0) {
    throw new ApiError(502, 'All image uploads failed — please try again');
  }

  report.photos.push(...uploaded);
  await report.save();

  await ActivityLog.create({
    actor: actor.id,
    action: 'CITIZENREPORT_IMAGES_UPLOADED',
    entityType: 'CitizenReport',
    entityId: report._id,
    metadata: { count: uploaded.length, failedCount, totalPhotos: report.photos.length },
  });

  return { report, uploadedCount: uploaded.length, failedCount };
};

// ---------------------------------------------------------------------------
// Status (read)
// ---------------------------------------------------------------------------

const getReportStatus = async (id) => {
  const report = await CitizenReport.findById(id)
    .select('status reliabilityScore verifiedBy reviewNote updatedAt')
    .populate('verifiedBy', 'name role');
  if (!report) throw new ApiError(404, 'Citizen report not found');
  return report;
};

// ---------------------------------------------------------------------------
// Verification actions
// ---------------------------------------------------------------------------

const applyVerificationAction = async (id, action, fromStatuses, toStatus, actor, note) => {
  const report = await CitizenReport.findById(id);
  if (!report) throw new ApiError(404, 'Citizen report not found');

  if (!fromStatuses.includes(report.status)) {
    throw new ApiError(
      409,
      `Cannot ${action} a report that is "${report.status}". Allowed from: ${fromStatuses.join(', ')}`
    );
  }

  report.status = toStatus;
  report.verifiedBy = actor.id;
  report.reviewNote = note || null;
  const delta = RELIABILITY_DELTA[action] || 0;
  report.reliabilityScore = Math.min(100, Math.max(0, report.reliabilityScore + delta));
  await report.save();

  await ActivityLog.create({
    actor: actor.id,
    action: `CITIZENREPORT_${action.toUpperCase()}`,
    entityType: 'CitizenReport',
    entityId: report._id,
    metadata: { toStatus, reliabilityDelta: delta, note: note || null },
  });

  return report;
};

const verifyReport = (id, actor, note) =>
  applyVerificationAction(id, 'verify', ['pending', 'flagged'], 'verified', actor, note);

const flagReport = (id, actor, note) =>
  applyVerificationAction(id, 'flag', ['pending', 'verified'], 'flagged', actor, note);

const rejectReport = (id, actor, note) =>
  applyVerificationAction(id, 'reject', ['pending', 'flagged'], 'rejected', actor, note);

const resolveReport = (id, actor, note) =>
  applyVerificationAction(id, 'resolve', ['verified'], 'resolved', actor, note);

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const getReportHistory = async (id, query) => {
  const exists = await CitizenReport.exists({ _id: id });
  if (!exists) throw new ApiError(404, 'Citizen report not found');

  const { page, limit, skip } = parsePagination(query);
  const filter = { entityType: 'CitizenReport', entityId: id };

  const [entries, totalItems] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name role'),
    ActivityLog.countDocuments(filter),
  ]);

  return { entries, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

module.exports = {
  createReport,
  getReportById,
  listReports,
  uploadReportImages,
  getReportStatus,
  verifyReport,
  flagReport,
  rejectReport,
  resolveReport,
  getReportHistory,
  MAX_PHOTOS,
};
