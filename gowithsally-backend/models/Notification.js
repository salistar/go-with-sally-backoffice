// ============================================================
// 📄 Notification.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('Notification.js ▶ Module loaded')
//   • Notification model: in-app & push notifications
// ============================================================

console.log('📄 [Notification.js] ▶ Module loaded');

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────────────────────────────────────
    // REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATION CONTENT
    // ─────────────────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'ride_request',
        'ride_accepted',
        'ride_started',
        'ride_completed',
        'ride_cancelled',
        'payment_received',
        'payment_failed',
        'rating_received',
        'message_received',
        'driver_nearby',
        'document_verified',
        'document_rejected',
        'document_expired',
        'account_verified',
        'account_suspended',
        'promotion',
        'system_alert',
        'emergency',
        'safety_check',
        'badge_earned',
        'affiliation_update',
        'subscription_renew',
        'loyalty_points',
        'support_response',
        'training_reminder',
        'insurance_update',
      ],
      required: [true, 'Notification type is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
    },

    body: {
      type: String,
      required: [true, 'Body is required'],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DATA & METADATA
    // ─────────────────────────────────────────────────────────────────────────
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    relatedModel: {
      type: String,
      enum: ['Ride', 'User', 'Driver', 'Message', 'Payment', 'Document', 'Badge'],
    },

    imageUrl: {
      type: String,
    },

    deepLink: {
      type: String,
    },

    actionUrl: {
      type: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS & TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },

    clicked: {
      type: Boolean,
      default: false,
    },

    clickedAt: {
      type: Date,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PUSH NOTIFICATION TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    pushSent: {
      type: Boolean,
      default: false,
    },

    pushSentAt: {
      type: Date,
    },

    pushDeviceToken: {
      type: String,
    },

    pushDelivered: {
      type: Boolean,
      default: false,
    },

    pushFailed: {
      type: Boolean,
      default: false,
    },

    pushError: {
      type: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRIORITY & SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    silent: {
      type: Boolean,
      default: false,
    },

    sound: {
      type: String,
      default: 'default',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SCHEDULING
    // ─────────────────────────────────────────────────────────────────────────
    scheduledFor: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIT
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// ============================================================
// INDEXES
// ============================================================

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for old notifications

// ============================================================
// MIDDLEWARE
// ============================================================

notificationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ============================================================
// METHODS
// ============================================================

notificationSchema.methods.markAsRead = function () {
  console.log('📄 [Notification.js] ▶ markAsRead() called');
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsClicked = function () {
  console.log('📄 [Notification.js] ▶ markAsClicked() called');
  this.clicked = true;
  this.clickedAt = new Date();
  return this.save();
};

notificationSchema.methods.markPushAsSent = function (deviceToken) {
  console.log('📄 [Notification.js] ▶ markPushAsSent() called');
  this.pushSent = true;
  this.pushSentAt = new Date();
  this.pushDeviceToken = deviceToken;
  return this.save();
};

notificationSchema.methods.markPushAsDelivered = function () {
  console.log('📄 [Notification.js] ▶ markPushAsDelivered() called');
  this.pushDelivered = true;
  return this.save();
};

notificationSchema.methods.markPushAsFailed = function (error) {
  console.log('📄 [Notification.js] ▶ markPushAsFailed() called');
  this.pushFailed = true;
  this.pushError = error;
  return this.save();
};

// ============================================================
// STATICS
// ============================================================

notificationSchema.statics.getUnreadCount = function (userId) {
  console.log('📄 [Notification.js] ▶ getUnreadCount() called');
  return this.countDocuments({ userId, read: false });
};

notificationSchema.statics.getRecentNotifications = function (userId, limit = 20) {
  console.log('📄 [Notification.js] ▶ getRecentNotifications() called');
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.markAllAsRead = function (userId) {
  console.log('📄 [Notification.js] ▶ markAllAsRead() called');
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

console.log('📄 [Notification.js] ▶ Model compiled and exported');

module.exports = Notification;
