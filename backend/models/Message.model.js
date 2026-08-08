/**
 * models/Message.model.js
 * Individual message within a ChatRoom. Paginated by (chatRoom, createdAt),
 * so that compound index is the one query path that must stay fast.
 */

const mongoose = require('mongoose');
const mediaAssetSchema = require('./schemas/mediaAsset.schema');

const messageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: [true, 'chatRoom is required'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'sender is required'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    attachments: {
      type: [mediaAssetSchema],
      default: [],
    },
    readBy: {
      type: [
        {
          _id: false,
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          readAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// ---- Validation ----
messageSchema.pre('validate', function requireContentOrAttachment(next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error('A message needs either content or at least one attachment'));
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
