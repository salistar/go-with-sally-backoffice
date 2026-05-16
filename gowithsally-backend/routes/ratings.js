// ============================================================
// 📄 ratings.js — GoWithSally Backend Routes
// LOG SUMMARY:
//   • console.log('ratings.js ▶ Router loaded')
//   • Rating endpoints: submit, get, summary, response, report
// ============================================================

console.log('📄 [ratings.js] ▶ Router loaded');

const express = require('express');

const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { verifyToken } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

console.log('📄 [ratings.js] ▶ Dependencies loaded');

// ============================================================
// PUBLIC ROUTES (requires authentication)
// ============================================================

/**
 * @route   POST /api/ratings
 * @desc    Submit a new rating for a ride
 * @access  Private
 * @body    {
 *            rideId: ObjectId,
 *            toUserId: ObjectId,
 *            stars: number (1-5),
 *            comment?: string,
 *            tags?: [string],
 *            categories?: { cleanliness, safety, communication, reliability },
 *            raterRole: 'passenger' | 'driver'
 *          }
 */
router.post('/', verifyToken, (req, res, next) => {
  console.log('📄 [ratings.js] ▶ POST /');
  next();
}, ratingController.submitRating);

/**
 * @route   GET /api/ratings/user/:userId
 * @desc    Get ratings for a specific user with pagination
 * @access  Public
 * @query   { page?: number, limit?: number }
 */
router.get('/user/:userId', validateObjectId('userId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ GET /user/:userId');
  next();
}, ratingController.getUserRatings);

/**
 * @route   GET /api/ratings/summary/:userId
 * @desc    Get rating summary (average, total, breakdown)
 * @access  Public
 */
router.get('/summary/:userId', validateObjectId('userId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ GET /summary/:userId');
  next();
}, ratingController.getRatingSummary);

/**
 * @route   GET /api/ratings/driver-summary/:driverId
 * @desc    Get comprehensive driver rating summary
 * @access  Public
 */
router.get('/driver-summary/:driverId', validateObjectId('driverId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ GET /driver-summary/:driverId');
  next();
}, ratingController.getDriverRatingSummary);

/**
 * @route   POST /api/ratings/:ratingId/response
 * @desc    Add response to a rating
 * @access  Private
 * @body    { responseComment: string }
 */
router.post('/:ratingId/response', verifyToken, validateObjectId('ratingId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ POST /:ratingId/response');
  next();
}, ratingController.addRatingResponse);

/**
 * @route   POST /api/ratings/:ratingId/report
 * @desc    Report a rating as inappropriate
 * @access  Private
 * @body    { reason: 'inappropriate' | 'fake' | 'abusive' | 'spam' | 'off_topic' }
 */
router.post('/:ratingId/report', verifyToken, validateObjectId('ratingId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ POST /:ratingId/report');
  next();
}, ratingController.reportRating);

/**
 * @route   DELETE /api/ratings/:ratingId
 * @desc    Delete (hide) a rating
 * @access  Private
 */
router.delete('/:ratingId', verifyToken, validateObjectId('ratingId'), (req, res, next) => {
  console.log('📄 [ratings.js] ▶ DELETE /:ratingId');
  next();
}, ratingController.deleteRating);

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * @route   GET /api/ratings/admin/reported
 * @desc    Get all reported ratings
 * @access  Private/Admin
 * @query   { page?: number, limit?: number }
 */
router.get('/admin/reported', verifyToken, (req, res, next) => {
  console.log('📄 [ratings.js] ▶ GET /admin/reported');
  next();
}, ratingController.getReportedRatings);

console.log('📄 [ratings.js] ▶ All routes initialized');

module.exports = router;
