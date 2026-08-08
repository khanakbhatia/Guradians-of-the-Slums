/**
 * controllers/user.controller.js
 * Thin HTTP layer: parse req, call services/user.service, shape response.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getOwnProfile(req.user.id);
  res.status(200).json(new ApiResponse(200, { user }, 'Current user profile'));
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'avatar file is required (multipart field name: "avatar")');
  }
  const user = await userService.updateAvatar(req.user.id, req.file.buffer);
  res.status(200).json(new ApiResponse(200, { user }, 'Avatar updated'));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user, req.params.id);
  res.status(200).json(new ApiResponse(200, { user }, 'User fetched'));
});

const deleteOwnAccount = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.user.id, req.user.id);
  res.status(204).send();
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id, req.user.id);
  res.status(204).send();
});

const searchUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.searchUsers(req.query);
  res.status(200).json(new ApiResponse(200, { users }, 'Users fetched', meta));
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  getUser,
  deleteOwnAccount,
  deleteUser,
  searchUsers,
};
