/**
 * GoWithSally Telegram Alert Service
 * Send critical alerts and notifications via Telegram bot
 *
 * Features:
 *   - Send alerts for critical errors
 *   - Database backup completion notifications
 *   - Deployment status updates
 *   - Performance warnings
 *   - Customizable alert levels
 *
 * Logging:
 *   All alert operations logged to Winston logger
 */

const axios = require('axios');
const logger = require('../config/winston');

/**
 * Alert severity levels
 */
const AlertLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Alert emoji mapping by level
 */
const EmojiMap = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
};

/**
 * Check if Telegram alerts are enabled
 * @returns {boolean} True if enabled and configured
 */
function isTelegramEnabled() {
  const enabled = process.env.TELEGRAM_ENABLED === 'true';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  return enabled && !!botToken && !!chatId;
}

/**
 * Send a message to Telegram
 * @param {string} message - Message text
 * @param {object} options - Additional options {parseMode, disableNotification}
 * @returns {Promise<boolean>} Success status
 */
async function sendTelegramMessage(message, options = {}) {
  try {
    if (!isTelegramEnabled()) {
      logger.debug('Telegram not enabled - skipping message send');
      return false;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const parseMode = options.parseMode || 'HTML';
    const disableNotification = options.disableNotification || false;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    logger.debug('Sending Telegram message', {
      chatId: chatId.substring(0, 4) + '***',
      messageLength: message.length,
    });

    const response = await axios.post(
      url,
      {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_notification: disableNotification,
      },
      {
        timeout: 5000,
      }
    );

    if (response.data && response.data.ok) {
      logger.debug('Telegram message sent successfully', {
        messageId: response.data.result.message_id,
      });
      return true;
    }

    logger.warn('Telegram message sending returned unexpected response', {
      response: response.data,
    });
    return false;
  } catch (error) {
    logger.error('Failed to send Telegram message', {
      error: error.message,
      code: error.code,
    });
    return false;
  }
}

/**
 * Send an alert to Telegram
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} level - Alert level (info, warning, error, critical)
 * @param {object} context - Additional context data
 * @returns {Promise<boolean>}
 */
async function sendAlert(title, message, level = AlertLevel.INFO, context = {}) {
  try {
    if (!isTelegramEnabled()) {
      logger.debug('Telegram not enabled - alert not sent', {
        title,
        level,
      });
      return false;
    }

    logger.info('Sending Telegram alert', {
      title,
      level,
      contextKeys: Object.keys(context),
    });

    const emoji = EmojiMap[level] || '📬';
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let alertMessage = `${emoji} <b>${title}</b>\n`;
    alertMessage += `<i>Level: ${level.toUpperCase()}</i>\n`;
    alertMessage += `<i>Time: ${timestamp} UTC</i>\n\n`;
    alertMessage += `${message}\n`;

    // Add context if provided
    if (Object.keys(context).length > 0) {
      alertMessage += '\n<b>Context:</b>\n';
      Object.entries(context).forEach(([key, value]) => {
        const valueStr =
          typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        alertMessage += `• <code>${key}</code>: ${valueStr}\n`;
      });
    }

    // Add environment info
    alertMessage += `\n<b>Environment:</b> <code>${process.env.NODE_ENV}</code>`;

    return await sendTelegramMessage(alertMessage, {
      parseMode: 'HTML',
      disableNotification: level === AlertLevel.INFO,
    });
  } catch (error) {
    logger.error('Failed to send alert to Telegram', {
      error: error.message,
      title,
      level,
    });
    return false;
  }
}

/**
 * Send error alert
 * @param {string} title - Error title
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 * @returns {Promise<boolean>}
 */
async function sendErrorAlert(title, error, context = {}) {
  try {
    const errorMessage = `<b>Error:</b> <code>${error.message}</code>`;
    let fullContext = { ...context };

    if (error.stack) {
      fullContext.stack = error.stack.split('\n').slice(0, 3).join('\n');
    }

    return await sendAlert(title, errorMessage, AlertLevel.ERROR, fullContext);
  } catch (err) {
    logger.error('Failed to send error alert', {
      error: err.message,
    });
    return false;
  }
}

/**
 * Send backup notification
 * @param {string} backupName - Name/type of backup
 * @param {object} details - Backup details {status, size, duration, etc}
 * @returns {Promise<boolean>}
 */
async function sendBackupNotification(backupName, details = {}) {
  try {
    const status = details.status || 'completed';
    const statusEmoji = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';

    const message = `${statusEmoji} Backup: <b>${backupName}</b>\nStatus: <code>${status}</code>`;

    return await sendAlert('Backup Notification', message, AlertLevel.INFO, details);
  } catch (error) {
    logger.error('Failed to send backup notification', {
      error: error.message,
      backupName,
    });
    return false;
  }
}

/**
 * Send deployment notification
 * @param {string} environment - Environment (staging, production)
 * @param {object} details - Deployment details {status, version, duration, etc}
 * @returns {Promise<boolean>}
 */
async function sendDeploymentNotification(environment, details = {}) {
  try {
    const status = details.status || 'completed';
    const statusEmoji = status === 'completed' ? '🚀' : status === 'failed' ? '❌' : '⏳';
    const version = details.version || 'unknown';

    const message = `${statusEmoji} Deployment to <b>${environment}</b>\nVersion: <code>${version}</code>\nStatus: <code>${status}</code>`;

    return await sendAlert('Deployment Notification', message, AlertLevel.INFO, details);
  } catch (error) {
    logger.error('Failed to send deployment notification', {
      error: error.message,
      environment,
    });
    return false;
  }
}

/**
 * Send performance warning
 * @param {string} metric - Metric name (CPU, Memory, Response Time, etc)
 * @param {object} details - Metric details {value, threshold, duration, etc}
 * @returns {Promise<boolean>}
 */
async function sendPerformanceWarning(metric, details = {}) {
  try {
    const message = `<b>${metric}</b> exceeds threshold\nValue: <code>${details.value}</code>\nThreshold: <code>${details.threshold}</code>`;

    return await sendAlert('Performance Warning', message, AlertLevel.WARNING, details);
  } catch (error) {
    logger.error('Failed to send performance warning', {
      error: error.message,
      metric,
    });
    return false;
  }
}

/**
 * Test Telegram connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    if (!isTelegramEnabled()) {
      logger.warn('Telegram is not enabled - test skipped');
      return false;
    }

    logger.info('Testing Telegram connection...');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/getMe`;

    const response = await axios.get(url, { timeout: 5000 });

    if (response.data && response.data.ok) {
      logger.info('Telegram connection successful', {
        bot: response.data.result.username,
      });

      // Send test message
      await sendAlert('Connection Test', 'Telegram bot connection successful', AlertLevel.INFO);

      return true;
    }

    logger.error('Telegram connection test failed', {
      response: response.data,
    });
    return false;
  } catch (error) {
    logger.error('Telegram connection test error', {
      error: error.message,
    });
    return false;
  }
}

module.exports = {
  AlertLevel,
  isTelegramEnabled,
  sendTelegramMessage,
  sendAlert,
  sendErrorAlert,
  sendBackupNotification,
  sendDeploymentNotification,
  sendPerformanceWarning,
  testConnection,
};
