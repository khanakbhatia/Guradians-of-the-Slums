/**
 * controllers/incident.controller.js
 * Thin HTTP layer: parse req, call services/incident.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const incidentService = require('../services/incident.service');

const createIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.createIncident(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, { incident }, 'Incident created'));
});

const getIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.getIncidentById(req.params.id);
  res.status(200).json(new ApiResponse(200, { incident }, 'Incident fetched'));
});

const listIncidents = asyncHandler(async (req, res) => {
  const { incidents, meta } = await incidentService.listIncidents(req.query);
  res.status(200).json(new ApiResponse(200, { incidents }, 'Incidents fetched', meta));
});

const nearbyIncidents = asyncHandler(async (req, res) => {
  const { lng, lat, radiusKm, status } = req.query;
  const incidents = await incidentService.nearbyIncidents({ lng, lat, radiusKm, status });
  res.status(200).json(new ApiResponse(200, { incidents }, 'Nearby incidents fetched'));
});

const updateIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.updateIncident(req.params.id, req.body, req.user.id);
  res.status(200).json(new ApiResponse(200, { incident }, 'Incident updated'));
});

const deleteIncident = asyncHandler(async (req, res) => {
  await incidentService.deleteIncident(req.params.id);
  res.status(204).send();
});

const getIncidentStatus = asyncHandler(async (req, res) => {
  const status = await incidentService.getIncidentStatus(req.params.id);
  res.status(200).json(new ApiResponse(200, status, 'Incident status fetched'));
});

const updateIncidentStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const incident = await incidentService.updateIncidentStatus(req.params.id, status, req.user, note);
  res.status(200).json(new ApiResponse(200, { incident }, 'Incident status updated'));
});

const getIncidentHistory = asyncHandler(async (req, res) => {
  const { entries, meta } = await incidentService.getIncidentHistory(req.params.id, req.query);
  res.status(200).json(new ApiResponse(200, { entries }, 'Incident history fetched', meta));
});

const getIncidentTimeline = asyncHandler(async (req, res) => {
  const timeline = await incidentService.getIncidentTimeline(req.params.id);
  res.status(200).json(new ApiResponse(200, { timeline }, 'Incident timeline fetched'));
});

module.exports = {
  createIncident,
  getIncident,
  listIncidents,
  nearbyIncidents,
  updateIncident,
  deleteIncident,
  getIncidentStatus,
  updateIncidentStatus,
  getIncidentHistory,
  getIncidentTimeline,
};
