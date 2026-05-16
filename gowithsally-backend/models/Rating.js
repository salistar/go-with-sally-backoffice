// ============================================================
// 📄 Rating.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('Rating.js ▶ Module loaded')
//   • Rating model: stores ride ratings and reviews
// ============================================================

console.log('📄 [Rating.js] ▶ Module loaded');

const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────────────────────────────────────
    // REFERENCES
    // ─────────────────────────────────────────────────────────────────────────
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride ID is required'],
      index: true,
    },

    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'From user ID is required'],
      index: true,
    },

    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'To user ID is required'],
      index: true,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RATER ROLE
    // ─────────────────────────────────────────────────────────────────────────
    raterRole: {
      type: String,
      enum: ['passenger', 'driver'],
      required: [true, 'Rater role is required'],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RATING DATA
    // ─────────────────────────────────────────────────────────────────────────
    stars: {
      type: Number,
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      required: [true, 'Star rating is required'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RATING TAGS (for categorization)
    // ─────────────────────────────────────────────────────────────────────────
    tags: {
      type: [String],
      enum: [
        // Driver tags
        'clean_vehicle',
        'professional',
        'friendly',
        'safe_driving',
        'punctual',
        'courteous',
        'excellent_condition',
        'poor_condition',
        'unsafe_driving',
        'rude',
        'late',
        'dirty_vehicle',
        // Passenger tags
        'respectful',
        'pleasant',
        'on_time',
        'disrespectful',
        'no_show',
        'damaged_vehicle',
        'aggressive',
      ],
      default: [],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RATING CATEGORIES (for detailed feedback)
    // ─────────────────────────────────────────────────────────────────────────
    categories: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      safety: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      reliability: {
        type: Number,
        min: 1,
        max: 5,
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE (for two-way ratings)
    // ─────────────────────────────────────────────────────────────────────────
    hasResponse: {
      type: Boolean,
      default: false,
    },

    responseComment: {
      type: String,
      trim: true,
      maxlength: [300, 'Response cannot exceed 300 characters'],
    },

    respondedAt: {
      type: Date,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS
    // ─────────────────────────────────────────────────────────────────────────
    isVisible: {
      type: Boolean,
      default: true,
    },

    isReported: {
      type: Boolean,
      default: false,
    },

    reportReason: {
      type: String,
      enum: ['inappropriate', 'fake', 'abusive', 'spam', 'off_topic'],
    },

    reportedAt: {
      type: Date,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ─────────────────────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────────────────────
    anonymous: {
      type: Boolean,
      default: false,
    },

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
    collection: 'ratings',
  }
);

// ============================================================
// INDEXES
// ============================================================

ratingSchema.index({ toUserId: 1, createdAt: -1 });
ratingSchema.index({ rideId: 1 });
ratingSchema.index({ fromUserId: 1 });
ratingSchema.index({ stars: 1 });
ratingSchema.index({ raterRole: 1 });
ratingSchema.compound({ toUserId: 1, stars: 1 });

// ============================================================
// MIDDLEWARE
// ============================================================

ratingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ============================================================
// METHODS
// ============================================================

ratingSchema.methods.addResponse = function (responseComment) {
  console.log('📄 [Rating.js] ▶ addResponse() called');
  this.hasResponse = true;
  this.responseComment = responseComment;
  this.respondedAt = new Date();
  return this.save();
};

ratingSchema.methods.report = function (reason, reportedBy) {
  console.log('📄 [Rating.js] ▶ report() called');
  this.isReported = true;
  this.reportReason = reason;
  this.reportedBy = reportedBy;
  this.reportedAt = new Date();
  return this.save();
};

ratingSchema.methods.hide = function () {
  console.log('📄 [Rating.js] ▶ hide() called');
  this.isVisible = false;
  return this.save();
};

// ============================================================
// STATICS
// ============================================================

ratingSchema.statics.getAverageRating = function (userId) {
  console.log('📄 [Rating.js] ▶ getAverageRating() called');
  return this.aggregate([
    { $match: { toUserId: mongoose.Types.ObjectId(userId), isVisible: true } },
    {
      $group: {
        _id: '$toUserId',
        averageRating: { $avg: '$stars' },
        totalRatings: { $sum: 1 },
        ratingDistribution: {
          $push: {
            rating: '$stars',
            count: { $sum: 1 },
          },
        },
      },
    },
  ]);
};

ratingSchema.statics.getSlidingAverageRating = function (userId, limit = 50) {
  console.log('📄 [Rating.js] ▶ getSlidingAverageRating() called');
  return this.find({
    toUserId: userId,
    isVisible: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then((ratings) => {
      if (ratings.length === 0) return null;
      const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
      return {
        averageRating: (sum / ratings.length).toFixed(2),
        totalRatings: ratings.length,
        recentRatings: ratings,
      };
    });
};

ratingSchema.statics.getRatingBreakdown = function (userId) {
  console.log('📄 [Rating.js] ▶ getRatingBreakdown() called');
  return this.aggregate([
    { $match: { toUserId: mongoose.Types.ObjectId(userId), isVisible: true } },
    {
      $group: {
        _id: '$stars',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

ratingSchema.statics.getRecentRatings = function (userId, limit = 10) {
  console.log('📄 [Rating.js] ▶ getRecentRatings() called');
  return this.find({
    toUserId: userId,
    isVisible: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('fromUserId', 'firstName lastName avatar');
};

const Rating = mongoose.model('Rating', ratingSchema);

console.log('📄 [Rating.js] ▶ Model compiled and exported');

module.exports = Rating;
