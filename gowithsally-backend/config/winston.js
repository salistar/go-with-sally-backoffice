/**
 * GoWithSally Winston Logger Configuration
 * Structured JSON logging with daily file rotation and error tracking
 *
 * Log Files:
 *   - combined.log: All logs (info, warn, error, debug)
 *   - error.log: Error and above level logs
 *
 * Features:
 *   - JSON format for structured logging
 *   - Daily log rotation
 *   - Console output in development
 *   - Error stack traces
 *   - Request ID tracking
 *   - Performance metrics logging
 *
 * Logging:
 *   Configuration logged at startup
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Ensure logs directory exists
const logsDir = process.env.LOG_DIR || path.join(__dirname, '../logs');

// Log level configuration
const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';
const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Define custom log levels
 */
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'cyan',
  },
};

/**
 * Format for JSON logging
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const base = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      ...(info.requestId && { requestId: info.requestId }),
    };

    // Add extra fields if present
    if (Object.keys(info).length > 4) {
      Object.keys(info).forEach((key) => {
        if (!['timestamp', 'level', 'message', 'splat', 'label'].includes(key)) {
          base[key] = info[key];
        }
      });
    }

    return JSON.stringify(base);
  })
);

/**
 * Format for console/human-readable logging
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.colorize({ colors: customLevels.colors }),
  winston.format.printf((info) => {
    const requestId = info.requestId ? ` [${info.requestId}]` : '';
    const timestamp = info.timestamp;
    const level = info.level.toUpperCase().padEnd(7);

    let output = `${timestamp} ${level}${requestId} ${info.message}`;

    // Add additional context
    const { message, timestamp: ts, level: l, label, splat, ...extra } = info;
    if (Object.keys(extra).length > 0) {
      const extraStr = JSON.stringify(extra, null, 2);
      output += `\n${extraStr}`;
    }

    return output;
  })
);

/**
 * Create transports for logging
 */
const transports = [
  // Error log - only errors and above
  new DailyRotateFile({
    filename: path.join(logsDir, 'error.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: jsonFormat,
    maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
    maxDays: process.env.LOG_FILE_MAX_FILES || 10,
    utc: true,
    auditFile: path.join(logsDir, 'error-audit.json'),
  }),

  // Combined log - all levels
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined.log'),
    datePattern: 'YYYY-MM-DD',
    level: logLevel,
    format: jsonFormat,
    maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
    maxDays: process.env.LOG_FILE_MAX_FILES || 10,
    utc: true,
    auditFile: path.join(logsDir, 'combined-audit.json'),
  }),
];

// Add console transport in development or if LOG_CONSOLE=true
if (nodeEnv === 'development' || process.env.LOG_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
    })
  );
}

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: jsonFormat,
  defaultMeta: {
    service: 'gowithsally-backend',
    environment: nodeEnv,
    pid: process.pid,
  },
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions.log'),
      datePattern: 'YYYY-MM-DD',
      format: jsonFormat,
      utc: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections.log'),
      datePattern: 'YYYY-MM-DD',
      format: jsonFormat,
      utc: true,
    }),
  ],
});

/**
 * Extend logger with convenience methods
 */
logger.fatal = function (message, meta = {}) {
  this.log('fatal', message, meta);
};

logger.trace = function (message, meta = {}) {
  this.log('trace', message, meta);
};

/**
 * Middleware for Express to log HTTP requests
 */
logger.httpRequestMiddleware = (req, res, next) => {
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.id = requestId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};

/**
 * Middleware for Express error logging
 */
logger.errorMiddleware = (err, req, res, next) => {
  const requestId = req.id || 'unknown';

  logger.error('Request Error', {
    requestId,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode || 500,
    error: err.message,
    stack: err.stack,
    ip: req.ip,
  });

  // Call original error handler if it exists
  if (next) {
    next(err);
  }
};

/**
 * Log startup information
 */
logger.info('[STARTUP] Winston logger initialized', {
  logLevel,
  logFormat,
  environment: nodeEnv,
  logsDir,
  timestamp: new Date().toISOString(),
});

module.exports = logger;
