/**
 * ============================================================================
 * GO WITH SALLY - ELK LOGGER
 * ============================================================================
 * @version 1.0.0
 * Elasticsearch/Logstash/Kibana integration logger
 *
 * Features:
 *   - JSON structured logging in ELK format
 *   - TCP/UDP output to Logstash
 *   - ELK-compatible field names
 *   - Request tracking (requestId, userId, IP)
 *   - Performance metrics
 *   - Full error context
 *
 * Usage:
 *   const elkLogger = require('./utils/elkLogger');
 *
 *   // Simple logging
 *   elkLogger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
 *
 *   // Error tracking
 *   elkLogger.error('Database error', new Error('Connection failed'), {
 *     filename: 'database.js',
 *     operation: 'query'
 *   });
 *
 *   // Performance tracking
 *   elkLogger.logDuration('api-request', 156, { endpoint: '/api/users' });
 *
 *   // Security events
 *   elkLogger.security('unauthorized-access', { userId: '123', resource: '/admin' });
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 elkLogger.js ▶ Module loaded');

const os = require('os');
const dgram = require('dgram');
const net = require('net');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Service metadata
  service: process.env.SERVICE_NAME || 'gowithsally-backend',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  hostname: os.hostname(),

  // Logstash connection
  logstash: {
    enabled: process.env.LOGSTASH_ENABLED === 'true',
    host: process.env.LOGSTASH_HOST || 'localhost',
    port: parseInt(process.env.LOGSTASH_PORT || '5000'),
    protocol: process.env.LOGSTASH_PROTOCOL || 'tcp', // 'tcp' or 'udp'
    timeout: parseInt(process.env.LOGSTASH_TIMEOUT || '5000')
  },

  // Elasticsearch
  elasticsearch: {
    enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
    index_prefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'gowithsally'
  },

  // Options
  includeStackTrace: process.env.LOG_INCLUDE_STACK !== 'false',
  maxStackLines: 20,
  silent: process.env.LOG_SILENT === 'true'
};

// ============================================================================
// ELK LOG ENTRY BUILDER
// ============================================================================

class ELKLogEntry {
  constructor(level, message, data = {}) {
    this.timestamp = new Date().toISOString();
    this.level = level;
    this.message = message;
    this.service = CONFIG.service;
    this.environment = CONFIG.environment;
    this.version = CONFIG.version;
    this.hostname = CONFIG.hostname;

    // Merge provided data
    Object.assign(this, data);

    // ELK required fields
    if (!this['@timestamp']) {
      this['@timestamp'] = this.timestamp;
    }
  }

  /**
   * Add request context
   */
  withRequest(req) {
    if (req) {
      this.requestId = req.id || req.requestId;
      this.userId = req.user?.id || req.userId;
      this.ip = req.ip || req.headers['x-forwarded-for'];
      this.userAgent = req.get('user-agent');
      this.method = req.method;
      this.path = req.path;
    }
    return this;
  }

  /**
   * Add error context
   */
  withError(error) {
    if (error) {
      this.error = {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: CONFIG.includeStackTrace
          ? error.stack?.split('\n').slice(0, CONFIG.maxStackLines).join('\n')
          : undefined
      };
    }
    return this;
  }

  /**
   * Add performance metrics
   */
  withMetrics(metrics = {}) {
    this.metrics = {
      duration_ms: metrics.duration,
      memory_mb: metrics.memory ? Math.round(metrics.memory / 1024 / 1024 * 100) / 100 : undefined,
      cpu_percent: metrics.cpu,
      ...metrics
    };
    return this;
  }

  /**
   * Add custom fields
   */
  withFields(fields = {}) {
    Object.assign(this, fields);
    return this;
  }

  /**
   * Build final log object
   */
  build() {
    const entry = { ...this };

    // Remove undefined fields
    Object.keys(entry).forEach(
      key => entry[key] === undefined && delete entry[key]
    );

    return entry;
  }

  /**
   * Convert to JSON string
   */
  toJSON() {
    return JSON.stringify(this.build());
  }
}

// ============================================================================
// LOGSTASH TRANSPORT
// ============================================================================

class LogstashTransport {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.queue = [];
    this.connecting = false;

    if (config.enabled) {
      this.connect();
    }
  }

  connect() {
    if (this.connecting) return;
    this.connecting = true;

    try {
      if (this.config.protocol === 'udp') {
        this.client = dgram.createSocket('udp4');
        this.connected = true;
        this.connecting = false;
        this.flush();
      } else {
        // TCP connection
        this.client = net.createConnection({
          host: this.config.host,
          port: this.config.port,
          timeout: this.config.timeout
        });

        this.client.on('connect', () => {
          this.connected = true;
          this.connecting = false;
          this.flush();
        });

        this.client.on('error', (err) => {
          console.error('[ELKLogger] Logstash connection error:', err.message);
          this.connected = false;
          this.connecting = false;
          // Retry after delay
          setTimeout(() => this.connect(), 5000);
        });

        this.client.on('close', () => {
          this.connected = false;
          this.connecting = false;
        });
      }
    } catch (error) {
      console.error('[ELKLogger] Failed to initialize Logstash transport:', error.message);
      this.connecting = false;
    }
  }

  send(logEntry) {
    const data = logEntry instanceof ELKLogEntry ? logEntry.toJSON() : JSON.stringify(logEntry);

    if (!this.connected) {
      if (this.config.enabled) {
        this.queue.push(data);
        if (!this.connecting && this.queue.length === 1) {
          this.connect();
        }
      }
      return;
    }

    try {
      if (this.config.protocol === 'udp') {
        const buffer = Buffer.from(data);
        this.client.send(buffer, 0, buffer.length, this.config.port, this.config.host);
      } else {
        this.client.write(data + '\n');
      }
    } catch (error) {
      console.error('[ELKLogger] Failed to send log to Logstash:', error.message);
      if (this.config.protocol !== 'udp') {
        this.connected = false;
        this.connect();
      }
    }
  }

  flush() {
    while (this.queue.length > 0 && this.connected) {
      const data = this.queue.shift();
      try {
        if (this.config.protocol === 'udp') {
          const buffer = Buffer.from(data);
          this.client.send(buffer, 0, buffer.length, this.config.port, this.config.host);
        } else {
          this.client.write(data + '\n');
        }
      } catch (error) {
        console.error('[ELKLogger] Queue flush error:', error.message);
        this.queue.unshift(data); // Put it back
        break;
      }
    }
  }

  close() {
    if (this.client) {
      if (this.config.protocol === 'udp') {
        this.client.close();
      } else {
        this.client.end();
      }
    }
  }
}

// ============================================================================
// ELK LOGGER
// ============================================================================

class ELKLogger {
  constructor(config) {
    this.config = config;
    this.transport = new LogstashTransport(config.logstash);
    this.silent = config.silent;

    // Log levels for filtering
    this.levels = {
      debug: 0,
      info: 1,
      notice: 2,
      warning: 3,
      error: 4,
      critical: 5,
      alert: 6,
      emergency: 7
    };
  }

  /**
   * Log at any level
   */
  log(level, message, data = {}) {
    if (this.silent) return;

    const entry = new ELKLogEntry(level, message, data);
    const logData = entry.build();

    // Console output in development
    if (this.config.environment === 'development') {
      console.log(JSON.stringify(logData, null, 2));
    }

    // Send to Logstash
    if (this.config.logstash.enabled) {
      this.transport.send(logData);
    }
  }

  /**
   * Debug level
   */
  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  /**
   * Info level
   */
  info(message, data = {}) {
    this.log('info', message, data);
  }

  /**
   * Notice level
   */
  notice(message, data = {}) {
    this.log('notice', message, data);
  }

  /**
   * Warning level
   */
  warn(message, data = {}) {
    this.log('warning', message, data);
  }

  /**
   * Error level
   */
  error(message, error = null, data = {}) {
    const entry = new ELKLogEntry('error', message, data);
    if (error) {
      entry.withError(error);
    }
    this.log('error', message, entry.build());
  }

  /**
   * Critical level
   */
  critical(message, error = null, data = {}) {
    const entry = new ELKLogEntry('critical', message, data);
    if (error) {
      entry.withError(error);
    }
    this.log('critical', message, entry.build());
  }

  /**
   * Log HTTP request
   */
  httpRequest(req, statusCode, duration, extra = {}) {
    const entry = new ELKLogEntry('info', `HTTP ${req.method} ${req.path}`, {
      type: 'http_request',
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      query: req.query,
      status_code: statusCode,
      duration_ms: duration,
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.id || req.requestId,
      userAgent: req.get('user-agent'),
      filename: 'http-middleware',
      ...extra
    });

    this.log('info', entry.message, entry.build());
  }

  /**
   * Log database operation
   */
  database(operation, collection, duration, extra = {}) {
    const entry = new ELKLogEntry('debug', `DB ${operation} on ${collection}`, {
      type: 'database',
      operation,
      collection,
      duration_ms: duration,
      filename: 'database',
      ...extra
    });

    this.log('debug', entry.message, entry.build());
  }

  /**
   * Log external API call
   */
  externalAPI(service, method, endpoint, statusCode, duration, extra = {}) {
    const level = statusCode >= 400 ? 'warning' : 'debug';
    const entry = new ELKLogEntry(level, `External API: ${service} ${method} ${endpoint}`, {
      type: 'external_api',
      service,
      method,
      endpoint,
      status_code: statusCode,
      duration_ms: duration,
      filename: 'external-api',
      ...extra
    });

    this.log(level, entry.message, entry.build());
  }

  /**
   * Log security event
   */
  security(event, data = {}) {
    const entry = new ELKLogEntry('warning', `[SECURITY] ${event}`, {
      type: 'security',
      event,
      security: true,
      filename: 'security',
      ...data
    });

    this.log('warning', entry.message, entry.build());
  }

  /**
   * Log user action
   */
  userAction(userId, action, data = {}) {
    const entry = new ELKLogEntry('info', `User action: ${action}`, {
      type: 'user_action',
      userId,
      action,
      filename: 'user-action',
      ...data
    });

    this.log('info', entry.message, entry.build());
  }

  /**
   * Log admin action
   */
  adminAction(adminId, action, data = {}) {
    const entry = new ELKLogEntry('warning', `Admin action: ${action}`, {
      type: 'admin_action',
      adminId,
      action,
      admin: true,
      filename: 'admin-action',
      ...data
    });

    this.log('warning', entry.message, entry.build());
  }

  /**
   * Log performance metric
   */
  logDuration(label, duration, data = {}) {
    const entry = new ELKLogEntry('info', `Performance: ${label}`, {
      type: 'performance',
      label,
      duration_ms: duration,
      filename: 'performance',
      ...data
    });

    this.log('info', entry.message, entry.build());
  }

  /**
   * Log payment event
   */
  payment(event, data = {}) {
    const entry = new ELKLogEntry('info', `Payment: ${event}`, {
      type: 'payment',
      event,
      filename: 'payment',
      ...data
    });

    this.log('info', entry.message, entry.build());
  }

  /**
   * Log ride event
   */
  ride(rideId, event, data = {}) {
    const entry = new ELKLogEntry('info', `Ride: ${event}`, {
      type: 'ride',
      rideId,
      event,
      filename: 'ride',
      ...data
    });

    this.log('info', entry.message, entry.build());
  }

  /**
   * Create fluent builder
   */
  createEntry(level, message) {
    return new ELKLogEntry(level, message);
  }

  /**
   * Close Logstash connection
   */
  close() {
    if (this.transport) {
      this.transport.close();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      service: CONFIG.service,
      environment: CONFIG.environment,
      version: CONFIG.version,
      hostname: CONFIG.hostname,
      logstash: {
        enabled: CONFIG.logstash.enabled,
        connected: this.transport?.connected || false,
        queueSize: this.transport?.queue?.length || 0
      },
      elasticsearch: {
        enabled: CONFIG.elasticsearch.enabled
      }
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const elkLogger = new ELKLogger(CONFIG);

module.exports = elkLogger;
module.exports.ELKLogger = ELKLogger;
module.exports.ELKLogEntry = ELKLogEntry;
module.exports.LogstashTransport = LogstashTransport;
module.exports.CONFIG = CONFIG;

// Graceful shutdown
process.on('SIGTERM', () => {
  elkLogger.info('ELKLogger shutting down on SIGTERM');
  elkLogger.close();
});

process.on('SIGINT', () => {
  elkLogger.info('ELKLogger shutting down on SIGINT');
  elkLogger.close();
});
