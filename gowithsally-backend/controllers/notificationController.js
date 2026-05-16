// ============================================================
// 📄 notificationController.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('notificationController.js ▶ Module loaded')
//   • Notification API endpoints
// ============================================================

console.log('📄 [notificationController.js] ▶ Module loaded');

const notificationService = require('../services/notificationService');

/**
 * GET /notifications
 * Get user's notifications with pagination
 */
exports.getNotifications = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ getNotifications() called');

  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, read } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (read !== undefined) filters.read = read === 'true';

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit),
      filters
    );

    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('notificationController.js ▶ getNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

/**
 * GET /notifications/unread/count
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ getUnreadCount() called');

  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('notificationController.js ▶ getUnreadCount error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message,
    });
  }
};

/**
 * GET /notifications/stats
 * Get notification statistics
 */
exports.getNotificationStats = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ getNotificationStats() called');

  try {
    const userId = req.user.id;
    const stats = await notificationService.getNotificationStats(userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('notificationController.js ▶ getNotificationStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching notification stats',
      error: error.message,
    });
  }
};

/**
 * PUT /notifications/:notificationId/read
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ markAsRead() called');

  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('notificationController.js ▶ markAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

/**
 * PUT /notifications/mark-all-read
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ markAllAsRead() called');

  try {
    const userId = req.user.id;
    await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('notificationController.js ▶ markAllAsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message,
    });
  }
};

/**
 * DELETE /notifications/:notificationId
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ deleteNotification() called');

  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(notificationId, userId);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('notificationController.js ▶ deleteNotification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message,
    });
  }
};

/**
 * DELETE /notifications/clear-all
 * Clear all notifications
 */
exports.clearAll = async (req, res) => {
  console.log('📄 [notificationController.js] ▶ clearAll() called');

  try {
    const userId = req.user.id;
    await notificationService.clearAllNotifications(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    console.error('notificationController.js ▶ clearAll error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error clearing notifications',
      error: error.message,
    });
  }
};

console.log('📄 [notificationController.js] ▶ All exports initialized');
