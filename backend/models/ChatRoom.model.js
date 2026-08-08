/**
 * models/ChatRoom.model.js
 * A coordination room, typically scoped to one Incident, holding
 * citizen/volunteer/authority participants.
 */

const mongoose = require('mongoose');

const ROOM_TYPES = ['incident', 'direct', 'support'];

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    roomType: {
      type: String,
      enum: ROOM_TYPES,
      default: 'incident',
    },
    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null, // required for roomType 'incident', enforced below
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: 'A chat room needs at least 2 participants',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
chatRoomSchema.index({ incident: 1 });
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ roomType: 1, isActive: 1 });

// ---- Validation ----
chatRoomSchema.pre('validate', function requireIncidentForIncidentRooms(next) {
  if (this.roomType === 'incident' && !this.incident) {
    return next(new Error('incident is required when roomType is "incident"'));
  }
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
module.exports.ROOM_TYPES = ROOM_TYPES;
