const mongoose = require('mongoose');

const notificationHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    notificationType: {
      type: String,
      enum: ['announcement', 'grade', 'message', 'reminder', 'urgent', 'general', 'test'],
      required: true,
      index: true,
    },
    tokensSent: {
      type: Number,
      default: 0,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'read'],
      default: 'sent',
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    expoTickets: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

// ⚡ OPTIMIZATION: Add indexes for faster queries
notificationHistorySchema.index({ studentId: 1, sentAt: -1 });
notificationHistorySchema.index({ studentId: 1, status: 1 });
notificationHistorySchema.index({ notificationType: 1 });
notificationHistorySchema.index({ sentAt: -1 });
notificationHistorySchema.index({ readAt: 1 });

// Virtual to check if notification is read
notificationHistorySchema.virtual('isRead').get(function () {
  return this.readAt !== null;
});

// Ensure virtuals are included in JSON output
notificationHistorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('NotificationHistory', notificationHistorySchema);
