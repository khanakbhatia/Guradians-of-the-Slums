/**
 * services/media.service.js
 * Shared upload pipeline behind all three Media upload surfaces:
 * validate (multer already filtered type/size) -> checksum -> dedup
 * check -> compress (images only, profile depends on category) ->
 * upload to Cloudinary -> persist metadata record.
 */

const Media = require('../models/Media.model');
const ActivityLog = require('../models/ActivityLog.model');
const ApiError = require('../utils/ApiError');
const { assertOwnerOrAdmin, isOwnerOrAdmin } = require('../utils/ownership');
const { parsePagination, buildPaginationMeta } = require('../utils/queryBuilder');
const { computeChecksum } = require('../utils/checksum');
const { compressImage, CITIZEN_PROFILE, SATELLITE_PROFILE } = require('../utils/imageCompression');
const cloudinaryUpload = require('../services/cloudinaryUpload.service');

const CLOUDINARY_FOLDERS = {
  satellite: 'satellite',
  citizen_image: 'citizen-images',
  document: 'documents',
};

// ---------------------------------------------------------------------------
// Shared upload pipeline
// ---------------------------------------------------------------------------

/**
 * @param {'satellite'|'citizen_image'|'document'} category
 * @param {Express.Multer.File} file
 * @param {{ id: string }} actor
 * @param {{ relatedEntity?: object, metadata?: object, captureLocation?: object }} extra
 */
const uploadMedia = async (category, file, actor, extra = {}) => {
  if (!file) {
    throw new ApiError(400, 'A file is required (field name: "file")');
  }

  const checksum = computeChecksum(file.buffer);

  // Dedup: same uploader, same category, same content -> return the
  // existing record instead of paying for a second Cloudinary upload.
  const existing = await Media.findOne({ checksum, uploader: actor.id, category });
  if (existing) {
    return { media: existing, deduplicated: true };
  }

  const isDocument = category === 'document';
  let uploadResult;
  let width = null;
  let height = null;
  let storedSizeBytes;

  if (isDocument) {
    uploadResult = await cloudinaryUpload.uploadBuffer(file.buffer, CLOUDINARY_FOLDERS[category], { resourceType: 'raw' });
    storedSizeBytes = file.size;
  } else {
    const profile = category === 'satellite' ? SATELLITE_PROFILE : CITIZEN_PROFILE;
    const compressed = await compressImage(file.buffer, profile);
    width = compressed.width;
    height = compressed.height;
    storedSizeBytes = compressed.buffer.length;
    uploadResult = await cloudinaryUpload.uploadBuffer(compressed.buffer, CLOUDINARY_FOLDERS[category], { resourceType: 'image' });
  }

  const media = await Media.create({
    uploader: actor.id,
    category,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    format: uploadResult.format,
    sizeBytes: file.size,
    storedSizeBytes,
    width: uploadResult.width ?? width,
    height: uploadResult.height ?? height,
    checksum,
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    resourceType: isDocument ? 'raw' : 'image',
    captureLocation: extra.captureLocation || null,
    relatedEntity: extra.relatedEntity || undefined,
    metadata: extra.metadata || {},
  });

  await ActivityLog.create({
    actor: actor.id,
    action: 'MEDIA_UPLOADED',
    entityType: media.relatedEntity?.kind || 'Media',
    entityId: media.relatedEntity?.item || media._id,
    metadata: { category, sizeBytes: media.sizeBytes, storedSizeBytes: media.storedSizeBytes, checksum },
  });

  return { media, deduplicated: false };
};

// ---------------------------------------------------------------------------
// Read — visibility rules differ by category: satellite/document are
// operational/shared assets (any authority+ can view), citizen_image is
// personal (uploader + admin only).
// ---------------------------------------------------------------------------

const assertCanView = (media, actor) => {
  if (isOwnerOrAdmin(actor, media.uploader)) return;
  if (media.category !== 'citizen_image' && actor.role === 'authority') return; // shared operational assets — see Media routes docs
  throw new ApiError(403, 'You do not have permission to view this file');
};

const getMediaById = async (id, actor) => {
  const media = await Media.findById(id).populate('uploader', 'name role');
  if (!media) throw new ApiError(404, 'Media not found');
  assertCanView(media, actor);
  return media;
};

const listMedia = async (actor, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.category) filter.category = query.category;
  if (query.relatedEntityKind && query.relatedEntityItem) {
    filter['relatedEntity.kind'] = query.relatedEntityKind;
    filter['relatedEntity.item'] = query.relatedEntityItem;
  }

  // Visibility: admins see everything (optionally filtered); everyone else
  // is scoped to their own uploads plus (for authority) shared categories.
  if (actor.role === 'admin') {
    // no extra restriction
  } else if (actor.role === 'authority') {
    filter.$or = [{ uploader: actor.id }, { category: { $in: ['satellite', 'document'] } }];
  } else {
    filter.uploader = actor.id;
  }

  const [media, totalItems] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('uploader', 'name role').lean(),
    Media.countDocuments(filter),
  ]);

  return { media, meta: buildPaginationMeta({ page, limit, totalItems }) };
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

const deleteMedia = async (id, actor) => {
  const media = await Media.findById(id);
  if (!media) throw new ApiError(404, 'Media not found');

  assertOwnerOrAdmin(actor, media.uploader, 'Only the uploader or an admin can delete this file');

  await cloudinaryUpload.deleteAsset(media.publicId, { resourceType: media.resourceType }).catch(() => {});
  await media.deleteOne();

  await ActivityLog.create({
    actor: actor.id,
    action: 'MEDIA_DELETED',
    entityType: media.relatedEntity?.kind || 'Media',
    entityId: media.relatedEntity?.item || media._id,
    metadata: { category: media.category, publicId: media.publicId },
  });
};

module.exports = { uploadMedia, getMediaById, listMedia, deleteMedia };
