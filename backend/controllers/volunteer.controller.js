/**
 * controllers/volunteer.controller.js
 * Thin HTTP layer: parse req, call services/volunteer.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const volunteerService = require('../services/volunteer.service');

const registerVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.registerVolunteer(req.user.id, req.user.role, req.body);
  res.status(201).json(new ApiResponse(201, { volunteer }, 'Volunteer profile registered'));
});

const getOwnProfile = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.getOwnVolunteerProfile(req.user.id);
  res.status(200).json(new ApiResponse(200, { volunteer }, 'Volunteer profile fetched'));
});

const updateOwnProfile = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.updateOwnVolunteerProfile(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, { volunteer }, 'Volunteer profile updated'));
});

const getVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.getVolunteerById(req.params.id);
  res.status(200).json(new ApiResponse(200, { volunteer }, 'Volunteer fetched'));
});

const listVolunteers = asyncHandler(async (req, res) => {
  const { volunteers, meta } = await volunteerService.listVolunteers(req.query);
  res.status(200).json(new ApiResponse(200, { volunteers }, 'Volunteers fetched', meta));
});

const getAvailability = asyncHandler(async (req, res) => {
  const availability = await volunteerService.getAvailability(req.user.id);
  res.status(200).json(new ApiResponse(200, { availability }, 'Availability fetched'));
});

const updateAvailability = asyncHandler(async (req, res) => {
  const availability = await volunteerService.updateAvailability(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, { availability }, 'Availability updated'));
});

const getOwnStatistics = asyncHandler(async (req, res) => {
  const volunteer = await volunteerService.getOwnVolunteerProfile(req.user.id);
  const stats = await volunteerService.getVolunteerStatistics(volunteer._id);
  res.status(200).json(new ApiResponse(200, { stats }, 'Volunteer statistics fetched'));
});

const getStatisticsById = asyncHandler(async (req, res) => {
  const stats = await volunteerService.getVolunteerStatistics(req.params.id);
  res.status(200).json(new ApiResponse(200, { stats }, 'Volunteer statistics fetched'));
});

const getLeaderboard = asyncHandler(async (req, res) => {
  const { limit, skill } = req.query;
  const leaderboard = await volunteerService.getLeaderboard({ limit, skill });
  res.status(200).json(new ApiResponse(200, { leaderboard }, 'Leaderboard fetched'));
});

module.exports = {
  registerVolunteer,
  getOwnProfile,
  updateOwnProfile,
  getVolunteer,
  listVolunteers,
  getAvailability,
  updateAvailability,
  getOwnStatistics,
  getStatisticsById,
  getLeaderboard,
};
