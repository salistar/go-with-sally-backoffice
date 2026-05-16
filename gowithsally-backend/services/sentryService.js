/**
 * GoWithSally Sentry Error Tracking Service
 * Initialize and configure Sentry for error reporting and monitoring
 *
 * Features:
 *   - Automatic error capture and reporting
 *   - Performance monitoring with trace sampling
 *   - User context and breadcrumb tracking
 *   - Environment-aware configuration
 *
 * Logging:
 *   All Sentry operations logged to Winston logger
 *   Initialization status logged at startup
 */

const Sentry = require('@sentry/node');
const logger = require('../config/winston');

/**
 * Initialize Sentry for error tracking
 * Should be called early in application startup
 * @returns {void}
 */
function initSentry() {
  try {
    const sentryEnabled = process.env.SENTRY_ENABLED === 'true';

    if (!sentryEnabled) {
      logger.info('Sentry disabled - skipping initialization');
      return;
    }

    const sentryDsn = process.env.SENTRY_DSN;

    if (!sentryDsn) {
      logger.warn('SENTRY_DSN not configured - Sentry will not be initialized');
      return;
    }

    const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'unknown';
    const traceSampleRate = parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '0.1');
    const debugMode = process.env.SENTRY_DEBUG === 'true';

    logger.info('Initializing Sentry error tracking', {
      environment,
      traceSampleRate,
      debugMode,
    });

    // Initialize Sentry
    Sentry.init({
      dsn: sentryDsn,
      environment,
      tracesSampleRate: traceSampleRate,
      debug: debugMode,
      integrations: [
        // Enable http integration for tracking outgoing requests
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable express integration
        new Sentry.Integrations.Express({
          request: true,
          serverName: true,
          transaction: true,
          user: ['id', 'email', 'username'],
          ip: true,
          version: true,
        }),
        // Enable database integration if available
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      // Ignore certain errors
      ignoreErrors: [
        // Network errors
        'NetworkError',
        'Network request failed',
        'The network connection was lost',
        // Browser errors
        'ResizeObserver loop limit exceeded',
        // 3rd party errors
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
      ],
      // Denormalize depth
      normalizeDepth: 5,
      // Max breadcrumb count
      maxBreadcrumbs: 50,
      // Enable debug mode in non-production
      debug: process.env.NODE_ENV !== 'production',
    });

    logger.info('Sentry initialized successfully', {
      environment,
      traceSampleRate,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Capture an exception in Sentry
 * @param {Error} error - The error to capture
 * @param {object} context - Additional context information
 * @returns {string|null} Event ID if captured, null if Sentry disabled
 */
function captureException(error, context = {}) {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return null;
    }

    logger.debug('Capturing exception in Sentry', {
      error: error.message,
      context,
    });

    const eventId = Sentry.captureException(error, {
      tags: context.tags || {},
      extra: context.extra || {},
      contexts: context.contexts || {},
    });

    logger.debug('Exception captured in Sentry', { eventId });
    return eventId;
  } catch (sentry_error) {
    logger.error('Failed to capture exception in Sentry', {
      error: sentry_error.message,
    });
    return null;
  }
}

/**
 * Capture a message in Sentry
 * @param {string} message - Message to capture
 * @param {string} level - Message level (fatal, error, warning, info, debug)
 * @param {object} context - Additional context
 * @returns {string|null} Event ID if captured
 */
function captureMessage(message, level = 'info', context = {}) {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return null;
    }

    logger.debug('Capturing message in Sentry', {
      message,
      level,
      context,
    });

    const eventId = Sentry.captureMessage(message, level);

    if (context.tags) {
      Sentry.setTag('message', message);
    }

    logger.debug('Message captured in Sentry', { eventId, level });
    return eventId;
  } catch (sentry_error) {
    logger.error('Failed to capture message in Sentry', {
      error: sentry_error.message,
    });
    return null;
  }
}

/**
 * Set user context in Sentry
 * @param {object} user - User information {id, email, username, ip_address}
 * @returns {void}
 */
function setUserContext(user) {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return;
    }

    logger.debug('Setting user context in Sentry', { userId: user.id });

    Sentry.setUser({
      id: user.id,
      email: user.email || undefined,
      username: user.username || undefined,
      ip_address: user.ip_address || undefined,
    });
  } catch (error) {
    logger.error('Failed to set user context in Sentry', {
      error: error.message,
    });
  }
}

/**
 * Clear user context in Sentry
 * @returns {void}
 */
function clearUserContext() {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return;
    }

    logger.debug('Clearing user context in Sentry');
    Sentry.setUser(null);
  } catch (error) {
    logger.error('Failed to clear user context in Sentry', {
      error: error.message,
    });
  }
}

/**
 * Add breadcrumb for event tracking
 * @param {object} breadcrumb - {message, category, level, data}
 * @returns {void}
 */
function addBreadcrumb(breadcrumb) {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return;
    }

    logger.debug('Adding breadcrumb to Sentry', {
      message: breadcrumb.message,
      category: breadcrumb.category,
    });

    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category || 'debug',
      level: breadcrumb.level || 'info',
      data: breadcrumb.data || {},
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    logger.error('Failed to add breadcrumb in Sentry', {
      error: error.message,
    });
  }
}

/**
 * Get Sentry Express middleware for request/error handling
 * @returns {object} Express middleware object
 */
function getExpressMiddleware() {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return (req, res, next) => next();
    }

    logger.info('Setting up Sentry Express middleware');

    return {
      requestHandler: Sentry.Handlers.requestHandler(),
      errorHandler: Sentry.Handlers.errorHandler(),
    };
  } catch (error) {
    logger.error('Failed to get Sentry Express middleware', {
      error: error.message,
    });

    // Return no-op middleware
    return {
      requestHandler: (req, res, next) => next(),
      errorHandler: (err, req, res, next) => next(err),
    };
  }
}

/**
 * Flush pending Sentry events
 * Should be called before application shutdown
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
async function flushSentry(timeout = 2000) {
  try {
    if (process.env.SENTRY_ENABLED !== 'true') {
      return true;
    }

    logger.info('Flushing Sentry events', { timeout });

    const result = await Sentry.close(timeout);

    logger.info('Sentry events flushed', { result });
    return result;
  } catch (error) {
    logger.error('Failed to flush Sentry events', {
      error: error.message,
    });
    return false;
  }
}

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  getExpressMiddleware,
  flushSentry,
  Sentry, // Export Sentry instance for advanced usage
};
