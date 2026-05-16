// ============================================================
// 📄 notifications-extended.js — GoWithSally Backend Routes
// LOG SUMMARY:
//   • console.log('notifications-extended.js ▶ Router loaded')
//   • Extended notification endpoints for new features
// ============================================================

console.log('📄 [notifications-extended.js] ▶ Router loaded');

const express = require('express');

const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

console.log('📄 [notifications-extended.js] ▶ Dependencies loaded');

// ============================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @access  Private
 * @query   {
 *            page?: number,
 *            limit?: number,
 *            type?: string,
 *            read?: boolean
 *          }
 */
router.get('/', verifyToken, (req, res, next) => {
  console.log('📄 [notifications-extended.js] ▶ GET /');
  next();
}, notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread/count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread/count', verifyToken, (req, res, next) => {
  console.log('📄 [notifications-extended.js] ▶ GET /unread/count');
  next();
}, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', verifyToken, (req, res, next) => {
  console.log('📄 [notifications-extended.js] ▶ GET /stats');
  next();
}, notificationController.getNotificationStats);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:notificationId/read',
  verifyToken,
  validateObjectId('notificationId'),
  (req, res, next) => {
    console.log('📄 [notifications-extended.js] ▶ PUT /:notificationId/read');
    next();
  },
  notificationController.markAsRead
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', verifyToken, (req, res, next) => {
  console.log('📄 [notifications-extended.js] ▶ PUT /mark-all-read');
  next();
}, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  verifyToken,
  validateObjectId('notificationId'),
  (req, res, next) => {
    console.log('📄 [notifications-extended.js] ▶ DELETE /:notificationId');
    next();
  },
  notificationController.deleteNotification
);

/**
 * @route   DELETE /api/notifications/clear-all
 * @desc    Clear all notifications for user
 * @access  Private
 */
router.delete('/clear-all', verifyToken, (req, res, next) => {
  console.log('📄 [notifications-extended.js] ▶ DELETE /clear-all');
  next();
}, notificationController.clearAll);

console.log('📄 [notifications-extended.js] ▶ All routes initialized');

module.exports = router;
