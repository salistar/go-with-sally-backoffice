// ============================================================
// 📄 notificationService.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('notificationService.js ▶ Module loaded')
//   • Push + in-app notifications handling
// ============================================================

console.log('📄 [notificationService.js] ▶ Module loaded');

const Notification = require('../models/Notification');
const fcmService = require('./fcmService');
const User = require('../models/User');

/**
 * Create and send notification
 */
const createAndSendNotification = async (notificationData, options = {}) => {
  console.log('📄 [notificationService.js] ▶ createAndSendNotification() called');

  try {
    // Create in-app notification
    const notification = new Notification(notificationData);
    await notification.save();

    console.log(`notificationService.js ▶ In-app notification created: ${notification._id}`);

    // Send push notification if enabled
    if (options.sendPush !== false) {
      await sendPushNotification(notification);
    }

    return notification;
  } catch (error) {
    console.error('notificationService.js ▶ createAndSendNotification error:', error);
    throw error;
  }
};

/**
 * Send push notification via FCM
 */
const sendPushNotification = async (notification) => {
  console.log('📄 [notificationService.js] ▶ sendPushNotification() called');

  try {
    const user = await User.findById(notification.userId).select('deviceTokens');

    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      console.log('notificationService.js ▶ No device tokens found for user');
      return { success: false, reason: 'No device tokens' };
    }

    const validTokens = user.deviceTokens.filter((t) => t && t.token);

    if (validTokens.length === 0) {
      return { success: false, reason: 'No valid device tokens' };
    }

    const pushData = {
      notificationId: notification._id.toString(),
      type: notification.type,
      ...(notification.relatedId && { relatedId: notification.relatedId.toString() }),
      ...(notification.deepLink && { deepLink: notification.deepLink }),
    };

    try {
      const result = await fcmService.sendMulticastNotification(
        validTokens.map((t) => t.token),
        {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
          actionUrl: notification.actionUrl,
          sound: notification.sound,
        },
        pushData,
        { priority: notification.priority }
      );

      notification.pushSent = true;
      notification.pushSentAt = new Date();
      notification.pushDelivered = result.totalFailed === 0;
      await notification.save();

      console.log(
        `notificationService.js ▶ Push sent: ${result.totalSent} delivered, ${result.totalFailed} failed`
      );

      return result;
    } catch (error) {
      notification.pushFailed = true;
      notification.pushError = error.message;
      await notification.save();
      throw error;
    }
  } catch (error) {
    console.error('notificationService.js ▶ sendPushNotification error:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, page = 1, limit = 20, filters = {}) => {
  console.log('📄 [notificationService.js] ▶ getUserNotifications() called');

  try {
    const skip = (page - 1) * limit;
    const query = { userId };

    // Apply filters
    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.read !== undefined) {
      query.read = filters.read;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('notificationService.js ▶ getUserNotifications error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  console.log('📄 [notificationService.js] ▶ markAsRead() called');

  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  } catch (error) {
    console.error('notificationService.js ▶ markAsRead error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  console.log('📄 [notificationService.js] ▶ markAllAsRead() called');

  try {
    return await Notification.markAllAsRead(userId);
  } catch (error) {
    console.error('notificationService.js ▶ markAllAsRead error:', error);
    throw error;
  }
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  console.log('📄 [notificationService.js] ▶ getUnreadCount() called');

  try {
    return await Notification.getUnreadCount(userId);
  } catch (error) {
    console.error('notificationService.js ▶ getUnreadCount error:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  console.log('📄 [notificationService.js] ▶ deleteNotification() called');

  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }

    return { success: true };
  } catch (error) {
    console.error('notificationService.js ▶ deleteNotification error:', error);
    throw error;
  }
};

/**
 * Clear all notifications for user
 */
const clearAllNotifications = async (userId) => {
  console.log('📄 [notificationService.js] ▶ clearAllNotifications() called');

  try {
    return await Notification.deleteMany({ userId });
  } catch (error) {
    console.error('notificationService.js ▶ clearAllNotifications error:', error);
    throw error;
  }
};

/**
 * Send bulk notifications
 */
const sendBulkNotifications = async (userIds, notificationData, options = {}) => {
  console.log('📄 [notificationService.js] ▶ sendBulkNotifications() called');

  try {
    const results = [];

    for (const userId of userIds) {
      try {
        const notification = await createAndSendNotification(
          {
            ...notificationData,
            userId,
          },
          options
        );
        results.push({ userId, success: true, notificationId: notification._id });
      } catch (error) {
        console.error(`notificationService.js ▶ Error sending to ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('notificationService.js ▶ sendBulkNotifications error:', error);
    throw error;
  }
};

/**
 * Get notification statistics
 */
const getNotificationStats = async (userId) => {
  console.log('📄 [notificationService.js] ▶ getNotificationStats() called');

  try {
    const total = await Notification.countDocuments({ userId });
    const unread = await Notification.getUnreadCount(userId);
    const unclicked = await Notification.countDocuments({ userId, clicked: false });

    const byType = await Notification.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    return {
      total,
      unread,
      unclicked,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error('notificationService.js ▶ getNotificationStats error:', error);
    throw error;
  }
};

module.exports = {
  createAndSendNotification,
  sendPushNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
  sendBulkNotifications,
  getNotificationStats,
};
