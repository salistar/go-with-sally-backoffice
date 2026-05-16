// ============================================================
// 📄 notificationSocket.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('notificationSocket.js ▶ Module loaded')
//   • Real-time notifications via Socket.IO
// ============================================================

console.log('📄 [notificationSocket.js] ▶ Module loaded');

const Notification = require('../models/Notification');

/**
 * Setup notification-related socket events
 */
const setupNotificationSocket = (io, socket, user) => {
  console.log(`📄 [notificationSocket.js] ▶ Setting up notification socket for user: ${user.id}`);

  // Join user's notification room
  socket.join(`user:${user.id}:notifications`);

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATION DELIVERY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * notification:send
   * Send real-time notification to user
   * (Called from server/admin)
   */
  socket.on('notification:send', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:send event received');

    try {
      const { userId, notification } = data;

      if (!userId || !notification) {
        console.error('notificationSocket.js ▶ Invalid notification data');
        return;
      }

      // Emit notification to specific user
      io.to(`user:${userId}:notifications`).emit('notification:received', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        deepLink: notification.deepLink,
        data: notification.data,
        timestamp: new Date().toISOString(),
      });

      console.log(`notificationSocket.js ▶ Notification sent to user: ${userId}`);
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:send error:', error);
    }
  });

  /**
   * notification:mark-read
   * Mark notification as read on client side
   */
  socket.on('notification:mark-read', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:mark-read event received');

    try {
      const { notificationId } = data;

      if (!notificationId) {
        return;
      }

      // Update in database
      await Notification.findByIdAndUpdate(notificationId, {
        read: true,
        readAt: new Date(),
      });

      console.log(`notificationSocket.js ▶ Notification marked as read: ${notificationId}`);

      // Emit confirmation
      socket.emit('notification:read-confirmed', { notificationId });
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:mark-read error:', error);
    }
  });

  /**
   * notification:mark-all-read
   * Mark all user's notifications as read
   */
  socket.on('notification:mark-all-read', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:mark-all-read event received');

    try {
      await Notification.updateMany(
        { userId: user.id, read: false },
        { read: true, readAt: new Date() }
      );

      console.log(`notificationSocket.js ▶ All notifications marked as read for user: ${user.id}`);

      socket.emit('notification:all-read-confirmed');
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:mark-all-read error:', error);
    }
  });

  /**
   * notification:delete
   * Delete a notification
   */
  socket.on('notification:delete', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:delete event received');

    try {
      const { notificationId } = data;

      if (!notificationId) {
        return;
      }

      await Notification.deleteOne({
        _id: notificationId,
        userId: user.id,
      });

      console.log(`notificationSocket.js ▶ Notification deleted: ${notificationId}`);

      socket.emit('notification:deleted', { notificationId });
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:delete error:', error);
    }
  });

  /**
   * notification:clear-all
   * Clear all notifications for user
   */
  socket.on('notification:clear-all', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:clear-all event received');

    try {
      await Notification.deleteMany({ userId: user.id });

      console.log(`notificationSocket.js ▶ All notifications cleared for user: ${user.id}`);

      socket.emit('notification:all-cleared');
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:clear-all error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATION PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * notification:subscribe-to-type
   * Subscribe to specific notification type
   */
  socket.on('notification:subscribe-to-type', (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:subscribe-to-type event received');

    try {
      const { type } = data;

      if (!type) {
        return;
      }

      socket.join(`notifications:${type}`);
      console.log(`notificationSocket.js ▶ User subscribed to type: ${type}`);

      socket.emit('notification:subscribed', { type });
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:subscribe-to-type error:', error);
    }
  });

  /**
   * notification:unsubscribe-from-type
   * Unsubscribe from specific notification type
   */
  socket.on('notification:unsubscribe-from-type', (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:unsubscribe-from-type event received');

    try {
      const { type } = data;

      if (!type) {
        return;
      }

      socket.leave(`notifications:${type}`);
      console.log(`notificationSocket.js ▶ User unsubscribed from type: ${type}`);

      socket.emit('notification:unsubscribed', { type });
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:unsubscribe-from-type error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATION STATUS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * notification:get-unread-count
   * Get count of unread notifications
   */
  socket.on('notification:get-unread-count', async (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:get-unread-count event received');

    try {
      const count = await Notification.countDocuments({
        userId: user.id,
        read: false,
      });

      socket.emit('notification:unread-count', { count });
      console.log(`notificationSocket.js ▶ Unread count for user: ${count}`);
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:get-unread-count error:', error);
    }
  });

  /**
   * notification:typing-indicator
   * Send typing indicator for support/messaging
   */
  socket.on('notification:typing-indicator', (data) => {
    console.log('📄 [notificationSocket.js] ▶ notification:typing-indicator event received');

    try {
      const { conversationId, isTyping } = data;

      if (!conversationId) {
        return;
      }

      io.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: user.id,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      console.log(`notificationSocket.js ▶ Typing indicator: ${isTyping}`);
    } catch (error) {
      console.error('notificationSocket.js ▶ notification:typing-indicator error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BROADCAST NOTIFICATIONS (Admin)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * admin:broadcast-notification
   * Send notification to multiple users or all users
   * (Admin/System only)
   */
  socket.on('admin:broadcast-notification', (data) => {
    console.log('📄 [notificationSocket.js] ▶ admin:broadcast-notification event received');

    try {
      const { userIds, notification, broadcastToAll } = data;

      if (broadcastToAll) {
        // Broadcast to all connected users
        io.emit('notification:received', notification);
        console.log('notificationSocket.js ▶ Broadcast sent to all users');
      } else if (userIds && Array.isArray(userIds)) {
        // Broadcast to specific users
        userIds.forEach((userId) => {
          io.to(`user:${userId}:notifications`).emit('notification:received', notification);
        });
        console.log(`notificationSocket.js ▶ Broadcast sent to ${userIds.length} users`);
      }
    } catch (error) {
      console.error('notificationSocket.js ▶ admin:broadcast-notification error:', error);
    }
  });

  console.log('📄 [notificationSocket.js] ▶ Notification socket handlers registered');
};

module.exports = setupNotificationSocket;
