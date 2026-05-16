// ============================================================
// 📄 fcmService.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('fcmService.js ▶ Module loaded')
//   • Firebase Cloud Messaging integration
// ============================================================

console.log('📄 [fcmService.js] ▶ Module loaded');

const admin = require('firebase-admin');

/**
 * Send push notification via Firebase Cloud Messaging
 */
const sendPushNotification = async (deviceToken, notification, data = {}, options = {}) => {
  console.log('📄 [fcmService.js] ▶ sendPushNotification() called');

  try {
    if (!deviceToken) {
      throw new Error('Device token is required');
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token: deviceToken,
      android: {
        priority: options.priority || 'high',
        notification: {
          sound: notification.sound || 'default',
          clickAction: notification.actionUrl,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: notification.sound || 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.imageUrl,
          click_action: notification.actionUrl,
        },
        data: data,
      },
    };

    const response = await admin.messaging().send(message);
    console.log('fcmService.js ▶ Notification sent successfully:', response);

    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    console.error('fcmService.js ▶ sendPushNotification error:', error);
    throw error;
  }
};

/**
 * Send multicast push notification (to multiple devices)
 */
const sendMulticastNotification = async (deviceTokens, notification, data = {}, options = {}) => {
  console.log('📄 [fcmService.js] ▶ sendMulticastNotification() called');

  try {
    if (!deviceTokens || deviceTokens.length === 0) {
      throw new Error('At least one device token is required');
    }

    // FCM has a limit of 500 tokens per request
    const chunks = [];
    for (let i = 0; i < deviceTokens.length; i += 500) {
      chunks.push(deviceTokens.slice(i, i + 500));
    }

    const results = [];

    for (const chunk of chunks) {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        tokens: chunk,
        android: {
          priority: options.priority || 'high',
          notification: {
            sound: notification.sound || 'default',
            clickAction: notification.actionUrl,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: notification.sound || 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      results.push(response);

      console.log(
        `fcmService.js ▶ Sent ${response.successCount}/${chunk.length} notifications in batch`
      );
    }

    return {
      success: true,
      totalSent: results.reduce((sum, r) => sum + r.successCount, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failureCount, 0),
      results,
    };
  } catch (error) {
    console.error('fcmService.js ▶ sendMulticastNotification error:', error);
    throw error;
  }
};

/**
 * Send notification to a topic (topic-based)
 */
const sendTopicNotification = async (topic, notification, data = {}) => {
  console.log('📄 [fcmService.js] ▶ sendTopicNotification() called');

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data,
      topic,
    };

    const response = await admin.messaging().send(message);
    console.log('fcmService.js ▶ Topic notification sent:', response);

    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    console.error('fcmService.js ▶ sendTopicNotification error:', error);
    throw error;
  }
};

/**
 * Subscribe device to topic
 */
const subscribeToTopic = async (deviceToken, topic) => {
  console.log('📄 [fcmService.js] ▶ subscribeToTopic() called');

  try {
    await admin.messaging().subscribeToTopic(deviceToken, topic);
    console.log(`fcmService.js ▶ Subscribed device to topic: ${topic}`);
    return { success: true };
  } catch (error) {
    console.error('fcmService.js ▶ subscribeToTopic error:', error);
    throw error;
  }
};

/**
 * Unsubscribe device from topic
 */
const unsubscribeFromTopic = async (deviceToken, topic) => {
  console.log('📄 [fcmService.js] ▶ unsubscribeFromTopic() called');

  try {
    await admin.messaging().unsubscribeFromTopic(deviceToken, topic);
    console.log(`fcmService.js ▶ Unsubscribed device from topic: ${topic}`);
    return { success: true };
  } catch (error) {
    console.error('fcmService.js ▶ unsubscribeFromTopic error:', error);
    throw error;
  }
};

/**
 * Subscribe multiple devices to topic
 */
const subscribeMultipleToTopic = async (deviceTokens, topic) => {
  console.log('📄 [fcmService.js] ▶ subscribeMultipleToTopic() called');

  try {
    const chunks = [];
    for (let i = 0; i < deviceTokens.length; i += 500) {
      chunks.push(deviceTokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      await admin.messaging().subscribeToTopic(chunk, topic);
    }

    console.log(`fcmService.js ▶ Subscribed ${deviceTokens.length} devices to topic: ${topic}`);
    return { success: true, devicesSubscribed: deviceTokens.length };
  } catch (error) {
    console.error('fcmService.js ▶ subscribeMultipleToTopic error:', error);
    throw error;
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  subscribeMultipleToTopic,
};
