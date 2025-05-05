

// models/notification.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['task-assigned', 'task-updated', 'task-completed', 'task-deleted', 'task-reminder'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;