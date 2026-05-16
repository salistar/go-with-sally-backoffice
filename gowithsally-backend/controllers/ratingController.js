// ============================================================
// 📄 ratingController.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('ratingController.js ▶ Module loaded')
//   • console.log('ratingController.js ▶ function() called')
// ============================================================

console.log('📄 [ratingController.js] ▶ Module loaded');

const ratingService = require('../services/ratingService');
const Rating = require('../models/Rating');

/**
 * POST /ratings
 * Submit a new rating
 */
exports.submitRating = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ submitRating() called');

  try {
    const { rideId, toUserId, stars, comment, tags, categories, raterRole } = req.body;
    const fromUserId = req.user.id;

    // Validation
    if (!rideId || !toUserId || !stars || !raterRole) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: rideId, toUserId, stars, raterRole',
      });
    }

    if (stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5 stars',
      });
    }

    // Check if user already rated this ride
    const existingRating = await Rating.findOne({
      rideId,
      fromUserId,
      toUserId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this ride',
      });
    }

    const ratingData = {
      rideId,
      fromUserId,
      toUserId,
      stars,
      comment: comment || null,
      tags: tags || [],
      categories: categories || {},
      raterRole,
    };

    const rating = await ratingService.createRating(ratingData);

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: rating,
    });
  } catch (error) {
    console.error('ratingController.js ▶ submitRating error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: error.message,
    });
  }
};

/**
 * GET /ratings/user/:userId
 * Get ratings for a specific user
 */
exports.getUserRatings = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ getUserRatings() called');

  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await ratingService.getUserRatings(userId, parseInt(page), parseInt(limit));

    return res.status(200).json({
      success: true,
      data: result.ratings,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('ratingController.js ▶ getUserRatings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching ratings',
      error: error.message,
    });
  }
};

/**
 * GET /ratings/summary/:userId
 * Get rating summary for a user
 */
exports.getRatingSummary = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ getRatingSummary() called');

  try {
    const { userId } = req.params;

    const summary = await ratingService.getUserAverageRating(userId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('ratingController.js ▶ getRatingSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching rating summary',
      error: error.message,
    });
  }
};

/**
 * GET /ratings/driver-summary/:driverId
 * Get comprehensive driver rating summary
 */
exports.getDriverRatingSummary = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ getDriverRatingSummary() called');

  try {
    const { driverId } = req.params;

    const summary = await ratingService.getDriverRatingSummary(driverId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('ratingController.js ▶ getDriverRatingSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching driver rating summary',
      error: error.message,
    });
  }
};

/**
 * POST /ratings/:ratingId/response
 * Add response to a rating
 */
exports.addRatingResponse = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ addRatingResponse() called');

  try {
    const { ratingId } = req.params;
    const { responseComment } = req.body;
    const userId = req.user.id;

    if (!responseComment || responseComment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response comment is required',
      });
    }

    const rating = await ratingService.addRatingResponse(ratingId, responseComment, userId);

    return res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: rating,
    });
  } catch (error) {
    console.error('ratingController.js ▶ addRatingResponse error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message,
    });
  }
};

/**
 * POST /ratings/:ratingId/report
 * Report a rating
 */
exports.reportRating = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ reportRating() called');

  try {
    const { ratingId } = req.params;
    const { reason } = req.body;
    const reportedBy = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Report reason is required',
      });
    }

    const rating = await ratingService.reportRating(ratingId, reason, reportedBy);

    return res.status(200).json({
      success: true,
      message: 'Rating reported successfully',
      data: rating,
    });
  } catch (error) {
    console.error('ratingController.js ▶ reportRating error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error reporting rating',
      error: error.message,
    });
  }
};

/**
 * DELETE /ratings/:ratingId
 * Delete (hide) a rating
 */
exports.deleteRating = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ deleteRating() called');

  try {
    const { ratingId } = req.params;
    const userId = req.user.id;

    const rating = await ratingService.deleteRating(ratingId, userId);

    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
      data: rating,
    });
  } catch (error) {
    console.error('ratingController.js ▶ deleteRating error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting rating',
      error: error.message,
    });
  }
};

/**
 * GET /admin/ratings/reported
 * Get reported ratings (admin only)
 */
exports.getReportedRatings = async (req, res) => {
  console.log('📄 [ratingController.js] ▶ getReportedRatings() called');

  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await ratingService.getReportedRatings(parseInt(page), parseInt(limit));

    return res.status(200).json({
      success: true,
      data: result.ratings,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('ratingController.js ▶ getReportedRatings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching reported ratings',
      error: error.message,
    });
  }
};

console.log('📄 [ratingController.js] ▶ All exports initialized');
