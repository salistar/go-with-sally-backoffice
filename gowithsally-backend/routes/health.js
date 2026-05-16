/**
 * GoWithSally Health Check Routes
 * Exposes health check endpoints for monitoring and load balancing
 *
 * Routes:
 *   - GET /api/health - Quick health check
 *   - GET /api/health/detailed - Detailed health report with metrics
 *   - GET /api/health/live - Liveness probe (Kubernetes)
 *   - GET /api/health/ready - Readiness probe (Kubernetes)
 *
 * Logging:
 *   All routes logged with request IDs and response times
 */

const express = require('express');
const logger = require('../config/winston');
const healthController = require('../controllers/healthController');

const router = express.Router();

// Middleware to add request ID for tracking
router.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.debug('Request received', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

/**
 * GET /api/health
 * Quick health check endpoint for monitoring
 * Returns status of all critical services
 */
router.get('/api/health', async (req, res, next) => {
  try {
    logger.debug('Health check route hit', { requestId: req.id });
    await healthController.getHealth(req, res);
  } catch (error) {
    logger.error('Health check route error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check endpoint
 * Returns comprehensive metrics, memory usage, environment info
 */
router.get('/api/health/detailed', async (req, res, next) => {
  try {
    logger.debug('Detailed health check route hit', { requestId: req.id });
    await healthController.getDetailedHealth(req, res);
  } catch (error) {
    logger.error('Detailed health check route error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
});

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes
 * Indicates if process is alive (not crashed)
 */
router.get('/api/health/live', async (req, res, next) => {
  try {
    logger.debug('Liveness probe route hit', { requestId: req.id });
    await healthController.getLivenessProbe(req, res);
  } catch (error) {
    logger.error('Liveness probe route error', {
      requestId: req.id,
      error: error.message,
    });
    next(error);
  }
});

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes
 * Indicates if service is ready to accept traffic
 */
router.get('/api/health/ready', async (req, res, next) => {
  try {
    logger.debug('Readiness probe route hit', { requestId: req.id });
    await healthController.getReadinessProbe(req, res);
  } catch (error) {
    logger.error('Readiness probe route error', {
      requestId: req.id,
      error: error.message,
    });
    next(error);
  }
});

// Middleware to log response completion
router.use((req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    logger.debug('Response sent', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    });
    return originalSend.call(this, data);
  };

  next();
});

module.exports = router;
