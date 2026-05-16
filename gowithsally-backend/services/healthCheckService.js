/**
 * GoWithSally Health Check Service
 * Monitors MongoDB, Redis, and AI service availability
 *
 * Exported Functions:
 *   - checkHealth(): Promise<{status, timestamp, services}>
 *   - checkMongoDBHealth(): Promise<boolean>
 *   - checkRedisHealth(): Promise<boolean>
 *   - checkAIServiceHealth(): Promise<boolean>
 *   - getDetailedHealthReport(): Promise<object>
 *
 * Logging:
 *   All health check operations logged to Winston logger
 *   Errors logged with full stack trace
 */

const logger = require('../config/winston');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');

/**
 * Check MongoDB connection status
 * @returns {Promise<boolean>} True if healthy, false otherwise
 */
async function checkMongoDBHealth() {
  try {
    const startTime = Date.now();

    logger.debug('Checking MongoDB health...');

    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB connection not in READY state', {
        state: mongoose.connection.readyState,
        readyStates: {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting',
        },
      });
      return false;
    }

    // Send ping command
    const pingResult = await mongoose.connection.db.admin().ping();

    if (!pingResult || !pingResult.ok) {
      logger.warn('MongoDB ping failed', { pingResult });
      return false;
    }

    const duration = Date.now() - startTime;
    logger.debug('MongoDB health check passed', { duration: `${duration}ms` });
    return true;
  } catch (error) {
    logger.error('MongoDB health check failed', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Check Redis connection status
 * @returns {Promise<boolean>} True if healthy, false otherwise
 */
async function checkRedisHealth() {
  try {
    const startTime = Date.now();

    logger.debug('Checking Redis health...');

    // Create temporary Redis connection if needed
    const redisUri = process.env.REDIS_URI || 'redis://localhost:6379/0';
    const redis = new Redis(redisUri);

    try {
      // Try PING command
      const pongResult = await redis.ping();

      if (pongResult !== 'PONG') {
        logger.warn('Redis PING did not return PONG', { result: pongResult });
        return false;
      }

      const duration = Date.now() - startTime;
      logger.debug('Redis health check passed', { duration: `${duration}ms` });
      return true;
    } finally {
      await redis.quit();
    }
  } catch (error) {
    logger.error('Redis health check failed', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Check AI/Face API service status
 * @returns {Promise<boolean>} True if healthy, false otherwise
 */
async function checkAIServiceHealth() {
  try {
    const startTime = Date.now();

    logger.debug('Checking AI service health...');

    const faceApiHost = process.env.FACE_API_HOST || 'http://faceapi:5000';
    const timeout = parseInt(process.env.FACE_API_TIMEOUT || '5000', 10);

    const response = await axios.get(`${faceApiHost}/health`, {
      timeout,
    });

    if (response.status === 200 && response.data) {
      const duration = Date.now() - startTime;
      logger.debug('AI service health check passed', {
        duration: `${duration}ms`,
        service: 'face-api',
      });
      return true;
    }

    logger.warn('AI service health check returned unexpected status', {
      status: response.status,
      data: response.data,
    });
    return false;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('AI service unreachable', {
        error: error.message,
        host: process.env.FACE_API_HOST,
      });
    } else {
      logger.error('AI service health check failed', {
        error: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}

/**
 * Overall health check across all services
 * @returns {Promise<{status: string, timestamp: Date, services: object}>}
 */
async function checkHealth() {
  try {
    const timestamp = new Date();

    logger.info('Starting comprehensive health check...');

    const [mongoHealth, redisHealth, aiHealth] = await Promise.all([
      checkMongoDBHealth().catch((e) => {
        logger.error('MongoDB health check threw error', { error: e.message });
        return false;
      }),
      checkRedisHealth().catch((e) => {
        logger.error('Redis health check threw error', { error: e.message });
        return false;
      }),
      checkAIServiceHealth().catch((e) => {
        logger.error('AI service health check threw error', { error: e.message });
        return false;
      }),
    ]);

    const allHealthy = mongoHealth && redisHealth && aiHealth;
    const status = allHealthy ? 'healthy' : 'degraded';

    const healthReport = {
      status,
      timestamp,
      services: {
        mongodb: {
          status: mongoHealth ? 'up' : 'down',
          timestamp,
        },
        redis: {
          status: redisHealth ? 'up' : 'down',
          timestamp,
        },
        aiService: {
          status: aiHealth ? 'up' : 'down',
          timestamp,
        },
      },
    };

    logger.info('Health check completed', {
      status,
      services: {
        mongodb: mongoHealth,
        redis: redisHealth,
        aiService: aiHealth,
      },
    });

    return healthReport;
  } catch (error) {
    logger.error('Health check failed with error', {
      error: error.message,
      stack: error.stack,
    });

    return {
      status: 'error',
      timestamp: new Date(),
      error: error.message,
      services: {},
    };
  }
}

/**
 * Get detailed health report with metrics
 * @returns {Promise<object>} Detailed health metrics
 */
async function getDetailedHealthReport() {
  try {
    const timestamp = new Date();

    logger.debug('Generating detailed health report...');

    const mongoHealth = await checkMongoDBHealth();
    const redisHealth = await checkRedisHealth();
    const aiHealth = await checkAIServiceHealth();

    const report = {
      timestamp,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        mongodb: {
          status: mongoHealth ? 'up' : 'down',
          connectionState: mongoose.connection.readyState,
          connectionStates: {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
          },
        },
        redis: {
          status: redisHealth ? 'up' : 'down',
          uri: process.env.REDIS_URI || 'redis://localhost:6379/0',
        },
        aiService: {
          status: aiHealth ? 'up' : 'down',
          host: process.env.FACE_API_HOST || 'http://faceapi:5000',
        },
      },
      environment: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
      },
    };

    logger.info('Detailed health report generated successfully');

    return report;
  } catch (error) {
    logger.error('Failed to generate detailed health report', {
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}

module.exports = {
  checkHealth,
  checkMongoDBHealth,
  checkRedisHealth,
  checkAIServiceHealth,
  getDetailedHealthReport,
};
