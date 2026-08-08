/**
 * models/Authority.model.js
 * Role-specific profile for users with role === 'authority' (municipal officers).
 */

const mongoose = require('mongoose');

const authoritySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    department: {
      type: String,
      required: [true, 'department is required'],
      trim: true,
      maxlength: 150,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    jurisdictionZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RiskZone',
      },
    ],
    officeContact: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
// `user` uniqueness is already declared inline above.
authoritySchema.index({ department: 1 });
authoritySchema.index({ jurisdictionZones: 1 });

module.exports = mongoose.model('Authority', authoritySchema);
