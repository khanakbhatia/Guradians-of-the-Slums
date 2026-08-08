/**
 * controllers/media.controller.js
 * Thin HTTP layer: parse req, call services/media.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const mediaService = require('../services/media.service');

const buildExtra = (req) => {
  const extra = {};
  if (req.body.relatedEntityKind && req.body.relatedEntityItem) {
    extra.relatedEntity = { kind: req.body.relatedEntityKind, item: req.body.relatedEntityItem };
  }
  if (req.body.metadata) {
    try {
      extra.metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
    } catch {
      extra.metadata = {};
    }
  }
  if (req.body.captureLng !== undefined && req.body.captureLat !== undefined) {
    extra.captureLocation = { type: 'Point', coordinates: [Number(req.body.captureLng), Number(req.body.captureLat)] };
  }
  return extra;
};

const uploadSatellite = asyncHandler(async (req, res) => {
  const { media, deduplicated } = await mediaService.uploadMedia('satellite', req.file, req.user, buildExtra(req));
  res
    .status(deduplicated ? 200 : 201)
    .json(new ApiResponse(deduplicated ? 200 : 201, { media }, deduplicated ? 'Identical file already uploaded' : 'Satellite image uploaded'));
});

const uploadCitizenImage = asyncHandler(async (req, res) => {
  const { media, deduplicated } = await mediaService.uploadMedia('citizen_image', req.file, req.user, buildExtra(req));
  res
    .status(deduplicated ? 200 : 201)
    .json(new ApiResponse(deduplicated ? 200 : 201, { media }, deduplicated ? 'Identical file already uploaded' : 'Image uploaded'));
});

const uploadDocument = asyncHandler(async (req, res) => {
  const { media, deduplicated } = await mediaService.uploadMedia('document', req.file, req.user, buildExtra(req));
  res
    .status(deduplicated ? 200 : 201)
    .json(new ApiResponse(deduplicated ? 200 : 201, { media }, deduplicated ? 'Identical file already uploaded' : 'Document uploaded'));
});

const getMedia = asyncHandler(async (req, res) => {
  const media = await mediaService.getMediaById(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { media }, 'Media fetched'));
});

const listMedia = asyncHandler(async (req, res) => {
  const { media, meta } = await mediaService.listMedia(req.user, req.query);
  res.status(200).json(new ApiResponse(200, { media }, 'Media fetched', meta));
});

const deleteMedia = asyncHandler(async (req, res) => {
  await mediaService.deleteMedia(req.params.id, req.user);
  res.status(204).send();
});

module.exports = { uploadSatellite, uploadCitizenImage, uploadDocument, getMedia, listMedia, deleteMedia };
