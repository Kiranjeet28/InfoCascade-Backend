const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
      lowercase: true,
    },
    deviceName: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ⚡ OPTIMIZATION: Add indexes for faster queries
pushTokenSchema.index({ studentId: 1, isActive: 1 });
pushTokenSchema.index({ token: 1 });
pushTokenSchema.index({ isActive: 1 });
pushTokenSchema.index({ createdAt: -1 });
pushTokenSchema.index({ lastUsedAt: -1 });

module.exports = mongoose.model('PushToken', pushTokenSchema);
