/**
 * models/User.model.js
 * Core identity + auth document for every role (citizen/volunteer/authority/admin).
 * Role-specific profile data lives in Volunteer.model.js / Authority.model.js,
 * each holding a unique `user` ref back to this document (composition over a
 * bloated single collection, and keeps citizens/admins from carrying unused fields).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const geoPointSchema = require('./schemas/geoPoint.schema');
const mediaAssetSchema = require('./schemas/mediaAsset.schema');

const ROLES = ['citizen', 'volunteer', 'authority', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never returned by default; opt in with .select('+password')
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Invalid phone number'],
      unique: true,
      sparse: true, // allows many docs with no phone without violating uniqueness
    },
    role: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a supported role' },
      required: true,
      default: 'citizen',
    },
    avatar: {
      type: mediaAssetSchema,
      default: null,
    },
    location: {
      type: geoPointSchema,
      default: null,
    },
    preferredLanguage: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'en',
      maxlength: 10,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // ---- Email verification (hashed token, raw value only ever emailed) ----
    emailVerificationTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
      default: null,
    },

    // ---- Forgot / reset password (hashed token, raw value only ever emailed) ----
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
      default: null,
    },

    // ---- Refresh tokens: multi-device, rotated on every use, hashed at rest ----
    refreshTokens: {
      type: [
        {
          _id: false,
          tokenHash: { type: String, required: true },
          userAgent: { type: String, default: null },
          ip: { type: String, default: null },
          createdAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, required: true },
        },
      ],
      select: false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ---- Indexes ----
// email/phone uniqueness is already declared inline above; only compound/geo indexes go here.
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ location: '2dsphere' });

// ---- Virtuals (1:1 profile lookups; populate explicitly, not by default) ----
userSchema.virtual('volunteerProfile', {
  ref: 'Volunteer',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

userSchema.virtual('authorityProfile', {
  ref: 'Authority',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

// ---- Hooks ----
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  // Skip on document creation — only relevant when an *existing* user changes their password,
  // so a freshly-registered account isn't treated as having a "password change" in the past.
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ---- Instance methods ----
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  // Caller must have fetched this doc with .select('+password')
  return bcrypt.compare(candidatePassword, this.password);
};

// True if the password was changed after the given JWT `iat` (seconds since epoch).
// Used to reject access tokens issued before a password reset/change.
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtIatSeconds) {
  if (!this.passwordChangedAt) return false;
  const changedAtSeconds = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtIatSeconds < changedAtSeconds;
};

// Drops expired refresh tokens; call before pushing a new one or checking membership.
userSchema.methods.pruneExpiredRefreshTokens = function pruneExpiredRefreshTokens() {
  const now = new Date();
  this.refreshTokens = (this.refreshTokens || []).filter((rt) => rt.expiresAt > now);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
