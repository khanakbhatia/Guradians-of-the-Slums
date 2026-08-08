/**
 * models/Notification.model.js
 * Per-user notification. `relatedEntity` is a polymorphic reference
 * (refPath) so one collection can point at whichever document triggered
 * it (Incident, Task, CitizenReport, ChatRoom) without a union of
 * nullable foreign keys.
 */

const mongoose = require('mongoose');

const TYPES = ['alert', 'task_assigned', 'task_update', 'chat_message', 'system', 'report_status'];
const CHANNELS = ['in_app', 'sms', 'push', 'email'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const RELATED_ENTITY_KINDS = ['Incident', 'Task', 'CitizenReport', 'ChatRoom'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'recipient is required'],
    },
    type: {
      type: String,
      enum: TYPES,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true,
      maxlength: 500,
    },
    channel: {
      type: String,
      enum: CHANNELS,
      default: 'in_app',
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'normal',
    },
    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'en',
      maxlength: 10,
    },
    relatedEntity: {
      kind: {
        type: String,
        enum: RELATED_ENTITY_KINDS,
        default: null,
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedEntity.kind',
        default: null,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ---- Indexes ----
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.TYPES = TYPES;
module.exports.CHANNELS = CHANNELS;
module.exports.PRIORITIES = PRIORITIES;
