/**
 * GoWithSally Health Controller
 * Handles GET /api/health endpoint for health checks and monitoring
 *
 * Routes:
 *   - GET /api/health - Quick health check
 *   - GET /api/health/detailed - Detailed health report
 *
 * Logging:
 *   All requests logged with timestamps and response metrics
 */

const logger = require('../config/winston');
const healthCheckService = require('../services/healthCheckService');

/**
 * Quick health check endpoint
 * Returns status of all services
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getHealth(req, res) {
  try {
    const requestId = req.id || `req_${Date.now()}`;
    const startTime = Date.now();

    logger.info('Health check request received', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    const healthReport = await healthCheckService.checkHealth();
    const duration = Date.now() - startTime;

    // Set appropriate status code
    const statusCode = healthReport.status === 'healthy' ? 200 : 503;

    logger.info('Health check completed', {
      requestId,
      status: healthReport.status,
      duration: `${duration}ms`,
      statusCode,
    });

    res.status(statusCode).json({
      status: healthReport.status,
      timestamp: healthReport.timestamp,
      services: healthReport.services,
      responseTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('Health check endpoint failed', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });

    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      error: 'Health check failed',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
}

/**
 * Detailed health check endpoint
 * Returns comprehensive health metrics and diagnostics
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getDetailedHealth(req, res) {
  try {
    const requestId = req.id || `req_${Date.now()}`;
    const startTime = Date.now();

    logger.info('Detailed health check request received', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    const detailedReport = await healthCheckService.getDetailedHealthReport();
    const duration = Date.now() - startTime;

    logger.info('Detailed health check completed', {
      requestId,
      duration: `${duration}ms`,
    });

    res.status(200).json({
      ...detailedReport,
      responseTime: `${duration}ms`,
    });
  } catch (error) {
    logger.error('Detailed health check endpoint failed', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });

    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      error: 'Detailed health check failed',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
}

/**
 * Kubernetes-style health check
 * Returns simple JSON for k8s probes
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getLivenessProbe(req, res) {
  try {
    logger.debug('Liveness probe check', { path: req.path });

    const isAlive = process.uptime() > 0;

    res.status(isAlive ? 200 : 503).json({
      alive: isAlive,
      uptime: process.uptime(),
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Liveness probe failed', {
      error: error.message,
    });

    res.status(503).json({ alive: false });
  }
}

/**
 * Kubernetes-style readiness check
 * Returns whether service is ready to accept traffic
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getReadinessProbe(req, res) {
  try {
    logger.debug('Readiness probe check', { path: req.path });

    const healthReport = await healthCheckService.checkHealth();
    const isReady = healthReport.status !== 'error';

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      status: healthReport.status,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Readiness probe failed', {
      error: error.message,
    });

    res.status(503).json({ ready: false });
  }
}

module.exports = {
  getHealth,
  getDetailedHealth,
  getLivenessProbe,
  getReadinessProbe,
};
