// ============================================================
// 📄 ratingService.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('ratingService.js ▶ Module loaded')
//   • console.log('ratingService.js ▶ function() called')
// ============================================================

console.log('📄 [ratingService.js] ▶ Module loaded');

const Rating = require('../models/Rating');

/**
 * Create a new rating
 */
const createRating = async (ratingData) => {
  console.log('📄 [ratingService.js] ▶ createRating() called');

  try {
    const rating = new Rating(ratingData);
    await rating.save();

    return rating;
  } catch (error) {
    console.error('ratingService.js ▶ createRating error:', error);
    throw error;
  }
};

/**
 * Get user's average rating (sliding window of last 50)
 */
const getUserAverageRating = async (userId) => {
  console.log('📄 [ratingService.js] ▶ getUserAverageRating() called');

  try {
    const ratingInfo = await Rating.getSlidingAverageRating(userId, 50);

    if (!ratingInfo) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: {},
      };
    }

    const breakdown = await Rating.getRatingBreakdown(userId);
    const breakdownMap = {};

    for (let i = 1; i <= 5; i++) {
      const item = breakdown.find((b) => b._id === i);
      breakdownMap[i] = item ? item.count : 0;
    }

    return {
      averageRating: parseFloat(ratingInfo.averageRating),
      totalRatings: ratingInfo.totalRatings,
      ratingBreakdown: breakdownMap,
    };
  } catch (error) {
    console.error('ratingService.js ▶ getUserAverageRating error:', error);
    throw error;
  }
};

/**
 * Get user ratings with pagination
 */
const getUserRatings = async (userId, page = 1, limit = 10) => {
  console.log('📄 [ratingService.js] ▶ getUserRatings() called');

  try {
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({
      toUserId: userId,
      isVisible: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUserId', 'firstName lastName avatar')
      .populate('rideId', 'pickupLocation dropoffLocation');

    const total = await Rating.countDocuments({
      toUserId: userId,
      isVisible: true,
    });

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('ratingService.js ▶ getUserRatings error:', error);
    throw error;
  }
};

/**
 * Get driver summary ratings
 */
const getDriverRatingSummary = async (driverId) => {
  console.log('📄 [ratingService.js] ▶ getDriverRatingSummary() called');

  try {
    const avgRating = await getUserAverageRating(driverId);
    const recentRatings = await Rating.getRecentRatings(driverId, 5);

    // Calculate ratings by rater role
    const passengerRatings = await Rating.find({
      toUserId: driverId,
      raterRole: 'passenger',
      isVisible: true,
    });

    const avgPassengerRating =
      passengerRatings.length > 0
        ? (passengerRatings.reduce((sum, r) => sum + r.stars, 0) / passengerRatings.length).toFixed(2)
        : 0;

    // Get most common tags
    const tagAggregation = await Rating.aggregate([
      {
        $match: {
          toUserId: require('mongoose').Types.ObjectId(driverId),
          isVisible: true,
          tags: { $ne: [] },
        },
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      averageRating: avgRating.averageRating,
      totalRatings: avgRating.totalRatings,
      passengerAverageRating: parseFloat(avgPassengerRating),
      ratingBreakdown: avgRating.ratingBreakdown,
      topTags: tagAggregation.map((tag) => ({
        tag: tag._id,
        count: tag.count,
      })),
      recentRatings,
    };
  } catch (error) {
    console.error('ratingService.js ▶ getDriverRatingSummary error:', error);
    throw error;
  }
};

/**
 * Add response to a rating
 */
const addRatingResponse = async (ratingId, responseComment, userId) => {
  console.log('📄 [ratingService.js] ▶ addRatingResponse() called');

  try {
    const rating = await Rating.findById(ratingId);

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.toUserId.toString() !== userId.toString()) {
      throw new Error('You can only respond to ratings directed to you');
    }

    return await rating.addResponse(responseComment);
  } catch (error) {
    console.error('ratingService.js ▶ addRatingResponse error:', error);
    throw error;
  }
};

/**
 * Report a rating
 */
const reportRating = async (ratingId, reason, reportedBy) => {
  console.log('📄 [ratingService.js] ▶ reportRating() called');

  try {
    const rating = await Rating.findById(ratingId);

    if (!rating) {
      throw new Error('Rating not found');
    }

    return await rating.report(reason, reportedBy);
  } catch (error) {
    console.error('ratingService.js ▶ reportRating error:', error);
    throw error;
  }
};

/**
 * Get reported ratings (admin function)
 */
const getReportedRatings = async (page = 1, limit = 20) => {
  console.log('📄 [ratingService.js] ▶ getReportedRatings() called');

  try {
    const skip = (page - 1) * limit;

    const ratings = await Rating.find({ isReported: true })
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .populate('reportedBy', 'firstName lastName');

    const total = await Rating.countDocuments({ isReported: true });

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('ratingService.js ▶ getReportedRatings error:', error);
    throw error;
  }
};

/**
 * Delete a rating (soft delete)
 */
const deleteRating = async (ratingId, userId) => {
  console.log('📄 [ratingService.js] ▶ deleteRating() called');

  try {
    const rating = await Rating.findById(ratingId);

    if (!rating) {
      throw new Error('Rating not found');
    }

    if (rating.fromUserId.toString() !== userId.toString()) {
      throw new Error('You can only delete your own ratings');
    }

    return await rating.hide();
  } catch (error) {
    console.error('ratingService.js ▶ deleteRating error:', error);
    throw error;
  }
};

module.exports = {
  createRating,
  getUserAverageRating,
  getUserRatings,
  getDriverRatingSummary,
  addRatingResponse,
  reportRating,
  getReportedRatings,
  deleteRating,
};
