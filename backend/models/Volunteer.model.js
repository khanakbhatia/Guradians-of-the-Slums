/**
 * models/Volunteer.model.js
 * Role-specific profile for users with role === 'volunteer'.
 * Kept separate from User (rather than embedded) so the matching
 * algorithm can query/index this collection directly without scanning
 * citizens/authorities/admins that will never have skills or trustScore.
 */

const mongoose = require('mongoose');
const geoPointSchema = require('./schemas/geoPoint.schema');

const SKILLS = ['medical', 'rescue', 'logistics', 'communication', 'construction', 'counseling', 'other'];
const AVAILABILITY = ['available', 'busy', 'offline'];

const volunteerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: {
      type: [{ type: String, enum: SKILLS }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one skill is required',
      },
    },
    ngoAffiliation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    verified: {
      // NGO/authority-confirmed badge, distinct from trustScore (which is earned over time)
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    completedTasksCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    availability: {
      type: String,
      enum: AVAILABILITY,
      default: 'offline',
    },
    currentLocation: {
      type: geoPointSchema,
      default: null,
    },
    serviceRadiusKm: {
      type: Number,
      min: 0,
      max: 100,
      default: 5,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
// `user` uniqueness is already declared inline above.
volunteerSchema.index({ skills: 1, availability: 1, trustScore: -1 });
volunteerSchema.index({ verified: 1, createdAt: 1 }); // admin approval queue, oldest first
volunteerSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Volunteer', volunteerSchema);
module.exports.SKILLS = SKILLS;
module.exports.AVAILABILITY = AVAILABILITY;
