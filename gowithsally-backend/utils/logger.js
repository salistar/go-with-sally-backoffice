/**
 * ============================================================================
 * GO WITH SALLY - LOGGER
 * ============================================================================
 * @version 3.0.0
 * Advanced logging with Winston including filename tracking in all logs
 * ELK stack compatible (Elasticsearch/Logstash/Kibana)
 *
 * Niveaux: error > warn > info > http > debug > verbose > silly
 *
 * Features:
 *   - Filename in every log entry for better debugging
 *   - Multiple transports: console, file, JSON, access.log, error.log, security.log
 *   - Request ID, User ID, IP tracking
 *   - ELK format support
 *   - createLogger(filename) function for prefixing
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Message');
 *   logger.error('Erreur', { context: 'auth' });
 *   logger.logError('AuthController', error, { userId: '123' });
 *
 *   // With filename tracking
 *   const appLogger = logger.createLogger('app.js');
 *   appLogger.info('Message from app.js');
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - createLogger() function entry
// - Other exported functions

console.log('📄 logger.js ▶ Module loaded');

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Niveaux par environnement
  levels: {
    development: 'debug',
    staging: 'debug',
    production: 'info',
    test: 'error'
  },

  // Dossier logs
  logsDir: process.env.LOG_PATH || path.join(process.cwd(), 'logs'),

  // Rotation fichiers
  maxSize: 5 * 1024 * 1024, // 5 MB
  maxFiles: 10,
  maxAge: '30d',

  // Format
  dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',

  // Options
  colorize: process.env.LOG_COLORIZE !== 'false',
  silent: process.env.LOG_SILENT === 'true',

  // Service metadata
  service: process.env.SERVICE_NAME || 'gowithsally-backend',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  hostname: os.hostname()
};

// ============================================================================
// CRÉATION DOSSIER LOGS
// ============================================================================

const ensureLogsDirectory = () => {
  try {
    if (!fs.existsSync(CONFIG.logsDir)) {
      fs.mkdirSync(CONFIG.logsDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`[Logger] Cannot create logs directory: ${error.message}`);
    return false;
  }
};

// Créer au chargement
ensureLogsDirectory();

// ============================================================================
// EMOJIS & COULEURS
// ============================================================================

const LEVEL_CONFIG = {
  error:   { emoji: '❌', color: 'red',     bgColor: 'bgRed',     priority: 0 },
  warn:    { emoji: '⚠️',  color: 'yellow',  bgColor: 'bgYellow',  priority: 1 },
  info:    { emoji: '✅', color: 'green',   bgColor: 'bgGreen',   priority: 2 },
  http:    { emoji: '🌐', color: 'cyan',    bgColor: 'bgCyan',    priority: 3 },
  debug:   { emoji: '🔍', color: 'blue',    bgColor: 'bgBlue',    priority: 4 },
  verbose: { emoji: '📝', color: 'gray',    bgColor: 'bgWhite',   priority: 5 },
  silly:   { emoji: '🎭', color: 'magenta', bgColor: 'bgMagenta', priority: 6 }
};

// Appliquer couleurs Winston
winston.addColors(
  Object.fromEntries(
    Object.entries(LEVEL_CONFIG).map(([level, config]) => [level, config.color])
  )
);

// ============================================================================
// FORMATS
// ============================================================================

/**
 * Format de base avec filename
 */
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: CONFIG.dateFormat }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack', 'filename', 'requestId', 'userId', 'ip'] })
);

/**
 * Format console avec emojis, couleurs et filename
 */
const consoleFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize({ all: CONFIG.colorize }),
  winston.format.printf(({ level, message, timestamp, stack, metadata, filename = 'app' }) => {
    // Nettoyer le niveau des codes ANSI pour obtenir l'emoji
    const cleanLevel = level.replace(/\u001b\[\d+m/g, '');
    const emoji = LEVEL_CONFIG[cleanLevel]?.emoji || '📝';

    // Message principal avec filename
    let output = `${timestamp} ${emoji} [${level}] [${filename}]: ${message}`;

    // Stack trace
    if (stack) {
      output += `\n${stack}`;
    }

    // Métadonnées (seulement si non vides et pas en production)
    if (metadata && Object.keys(metadata).length > 0) {
      const metaStr = JSON.stringify(metadata);
      if (metaStr.length < 500) { // Limiter la taille
        output += ` ${metaStr}`;
      }
    }

    return output;
  })
);

/**
 * Format JSON structuré pour ELK
 */
const elkFormat = winston.format.combine(
  baseFormat,
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, metadata, filename = 'app', requestId, userId, ip }) => {
    const logEntry = {
      '@timestamp': timestamp,
      level,
      message,
      filename,
      service: CONFIG.service,
      environment: CONFIG.environment,
      version: CONFIG.version,
      hostname: CONFIG.hostname,
      requestId: requestId || undefined,
      userId: userId || undefined,
      ip: ip || undefined,
      stack: stack || undefined,
      ...metadata
    };

    // Remove undefined fields
    Object.keys(logEntry).forEach(key => logEntry[key] === undefined && delete logEntry[key]);

    return JSON.stringify(logEntry);
  })
);

/**
 * Format fichier JSON structuré avec filename
 */
const jsonFileFormat = winston.format.combine(
  baseFormat,
  winston.format.printf(({ level, message, timestamp, stack, metadata, filename = 'app', requestId, userId, ip }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      filename,
      service: CONFIG.service,
      environment: CONFIG.environment,
      hostname: CONFIG.hostname,
      requestId: requestId || undefined,
      userId: userId || undefined,
      ip: ip || undefined,
      stack: stack || undefined,
      ...metadata
    };

    // Remove undefined fields
    Object.keys(logEntry).forEach(key => logEntry[key] === undefined && delete logEntry[key]);

    return JSON.stringify(logEntry);
  })
);

/**
 * Format fichier texte lisible avec filename
 */
const textFileFormat = winston.format.combine(
  baseFormat,
  winston.format.printf(({ level, message, timestamp, stack, metadata, filename = 'app' }) => {
    const emoji = LEVEL_CONFIG[level]?.emoji || '📝';
    let output = `${timestamp} ${emoji} [${level.toUpperCase().padEnd(7)}] [${filename}] ${message}`;

    if (stack) {
      output += `\n${stack}`;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      output += ` | ${JSON.stringify(metadata)}`;
    }

    return output;
  })
);

/**
 * Format pour access log (HTTP requests)
 */
const accessFormat = winston.format.combine(
  winston.format.timestamp({ format: CONFIG.dateFormat }),
  winston.format.printf(({ timestamp, message, metadata }) => {
    const { method, url, status, duration, ip, userId, userAgent } = metadata || {};
    return JSON.stringify({
      timestamp,
      type: 'access',
      method,
      url,
      status,
      duration,
      ip,
      userId,
      userAgent
    });
  })
);

/**
 * Format pour security log
 */
const securityFormat = winston.format.combine(
  winston.format.timestamp({ format: CONFIG.dateFormat }),
  winston.format.printf(({ level, message, timestamp, metadata, filename = 'app' }) => {
    return JSON.stringify({
      '@timestamp': timestamp,
      level,
      type: 'security',
      message,
      filename,
      service: CONFIG.service,
      ...metadata
    });
  })
);

// ============================================================================
// TRANSPORTS
// ============================================================================

/**
 * Obtient le niveau de log
 */
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  return process.env.LOG_LEVEL || CONFIG.levels[env] || 'info';
};

/**
 * Transport console
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  handleExceptions: true,
  handleRejections: true,
  silent: CONFIG.silent
});

/**
 * Crée les transports fichiers avec séparation par type
 */
const createFileTransports = () => {
  if (!ensureLogsDirectory()) return [];

  const transports = [];

  // Erreurs uniquement (error.log)
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'error.log'),
    level: 'error',
    format: jsonFileFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: CONFIG.maxFiles,
    tailable: true,
    handleExceptions: true,
    handleRejections: true
  }));

  // Warnings
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'warn.log'),
    level: 'warn',
    format: jsonFileFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: 5
  }));

  // Combiné (tous niveaux) - app.log
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'app.log'),
    format: textFileFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: CONFIG.maxFiles,
    tailable: true
  }));

  // HTTP requests - access.log
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'access.log'),
    level: 'http',
    format: accessFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: 5
  }));

  // Security events - security.log
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'security.log'),
    level: 'warn',
    format: securityFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: 10
  }));

  // JSON format for ELK
  transports.push(new winston.transports.File({
    filename: path.join(CONFIG.logsDir, 'elk.log'),
    format: elkFormat,
    maxsize: CONFIG.maxSize,
    maxFiles: CONFIG.maxFiles,
    tailable: true
  }));

  // Debug (staging/development)
  if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.File({
      filename: path.join(CONFIG.logsDir, 'debug.log'),
      level: 'debug',
      format: textFileFormat,
      maxsize: CONFIG.maxSize,
      maxFiles: 3
    }));
  }

  return transports;
};

// ============================================================================
// CRÉATION LOGGER
// ============================================================================

const logger = winston.createLogger({
  level: getLogLevel(),
  levels: winston.config.npm.levels,
  format: baseFormat,
  transports: [consoleTransport],
  exitOnError: false,
  silent: CONFIG.silent
});

// Ajouter transports fichiers en TOUS les environnements (pour ELK)
const fileTransports = createFileTransports();
fileTransports.forEach(transport => logger.add(transport));

// ============================================================================
// LOGSTASH TCP TRANSPORT (envoie les logs en temps réel à Logstash)
// ============================================================================
const net = require('net');

const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'logstash';
const LOGSTASH_PORT = parseInt(process.env.LOGSTASH_PORT || '5044');

class LogstashTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.host = opts.host || LOGSTASH_HOST;
    this.port = opts.port || LOGSTASH_PORT;
    this.socket = null;
    this.connected = false;
    this.retryTimer = null;
    this.retryCount = 0;
    this.maxRetries = 10;
    this.retryDelay = 5000;
    this._connect();
  }

  _connect() {
    if (this.retryCount >= this.maxRetries) return;
    try {
      this.socket = new net.Socket();
      this.socket.connect(this.port, this.host, () => {
        this.connected = true;
        this.retryCount = 0;
        console.log(`📊 [Logger] Logstash connecté (${this.host}:${this.port})`);
      });
      this.socket.on('error', () => {
        this.connected = false;
        this._scheduleRetry();
      });
      this.socket.on('close', () => {
        this.connected = false;
        this._scheduleRetry();
      });
    } catch(e) {
      this._scheduleRetry();
    }
  }

  _scheduleRetry() {
    if (this.retryTimer) return;
    this.retryCount++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this._connect();
    }, this.retryDelay);
  }

  log(info, callback) {
    if (this.connected && this.socket) {
      try {
        const logEntry = JSON.stringify({
          '@timestamp': info.timestamp || new Date().toISOString(),
          level: info.level,
          message: info.message,
          service: 'gowithsally-backend',
          environment: process.env.NODE_ENV || 'development',
          hostname: os.hostname(),
          filename: info.filename,
          requestId: info.requestId,
          userId: info.userId,
          ip: info.ip,
          stack: info.stack,
          ...info.metadata
        }) + '\n';
        this.socket.write(logEntry);
      } catch(e) { /* ignore write errors */ }
    }
    callback();
  }
}

// Ajouter le transport Logstash
try {
  logger.add(new LogstashTransport({ level: 'info' }));
  console.log('📊 [Logger] Transport Logstash TCP ajouté');
} catch(e) {
  console.log('📊 [Logger] Logstash transport non disponible:', e.message);
}

// ============================================================================
// MÉTHODES CONTEXTUELLES
// ============================================================================

/**
 * Log HTTP pour Morgan
 */
logger.httpLog = (message) => {
  logger.http(message.trim());
};

/**
 * Log erreur avec contexte
 * @param {string} context - Contexte (controller, service, etc.)
 * @param {Error} error - Erreur
 * @param {Object} extra - Données supplémentaires
 */
logger.logError = (context, error, extra = {}) => {
  const errorData = {
    context,
    errorName: error.name,
    errorMessage: error.message,
    errorCode: error.code,
    ...extra
  };
  
  logger.error(`[${context}] ${error.message}`, errorData);
  
  // Log stack séparément en debug
  if (error.stack) {
    logger.debug(`[${context}] Stack trace`, { stack: error.stack });
  }
};

/**
 * Log événement sécurité
 */
logger.security = (event, data = {}) => {
  logger.warn(`[SECURITY] ${event}`, { 
    security: true, 
    event,
    timestamp: new Date().toISOString(),
    ...data 
  });
};

/**
 * Log action utilisateur
 */
logger.userAction = (userId, action, data = {}) => {
  logger.info(`[USER] ${action}`, { 
    userId: userId?.toString(), 
    action,
    ...data 
  });
};

/**
 * Log action admin
 */
logger.adminAction = (adminId, action, data = {}) => {
  logger.warn(`[ADMIN] ${action}`, { 
    adminId: adminId?.toString(), 
    action, 
    admin: true,
    ...data 
  });
};

/**
 * Log événement paiement
 */
logger.payment = (event, data = {}) => {
  logger.info(`[PAYMENT] ${event}`, { 
    payment: true, 
    event,
    ...data 
  });
};

/**
 * Log événement course
 */
logger.ride = (rideId, event, data = {}) => {
  logger.info(`[RIDE] ${event}`, { 
    rideId: rideId?.toString(), 
    event,
    ...data 
  });
};

/**
 * Log notification envoyée
 */
logger.notification = (type, userId, data = {}) => {
  logger.debug(`[NOTIF] ${type} -> ${userId}`, { 
    notification: true, 
    type, 
    userId: userId?.toString(),
    ...data 
  });
};

/**
 * Log événement socket
 */
logger.socket = (event, socketId, data = {}) => {
  logger.debug(`[SOCKET] ${event}`, { 
    socket: true, 
    event, 
    socketId,
    ...data 
  });
};

/**
 * Log métrique performance
 */
logger.metric = (metric, value, unit = 'ms', data = {}) => {
  logger.debug(`[METRIC] ${metric}: ${value}${unit}`, { 
    metric, 
    value, 
    unit,
    ...data 
  });
};

/**
 * Log requête externe (API tierce)
 */
logger.externalRequest = (service, method, url, duration, status, data = {}) => {
  const level = status >= 400 ? 'warn' : 'debug';
  logger[level](`[EXTERNAL] ${service} ${method} ${url} - ${status} (${duration}ms)`, {
    external: true,
    service,
    method,
    url,
    duration,
    status,
    ...data
  });
};

/**
 * Log database query
 */
logger.dbQuery = (operation, collection, duration, data = {}) => {
  logger.debug(`[DB] ${operation} ${collection} (${duration}ms)`, {
    db: true,
    operation,
    collection,
    duration,
    ...data
  });
};

/**
 * Log démarrage processus
 */
logger.startProcess = (processName, data = {}) => {
  logger.info(`[START] ${processName}`, { 
    process: processName, 
    action: 'start',
    ...data 
  });
};

/**
 * Log fin processus
 */
logger.endProcess = (processName, duration, data = {}) => {
  logger.info(`[END] ${processName} (${duration}ms)`, { 
    process: processName, 
    action: 'end', 
    duration,
    ...data 
  });
};

/**
 * Log avec timer automatique
 */
logger.timed = (label) => {
  const start = Date.now();
  return {
    end: (message, data = {}) => {
      const duration = Date.now() - start;
      logger.info(`[TIMED] ${label}: ${message} (${duration}ms)`, {
        timed: true,
        label,
        duration,
        ...data
      });
      return duration;
    },
    debug: (message, data = {}) => {
      const duration = Date.now() - start;
      logger.debug(`[TIMED] ${label}: ${message} (${duration}ms)`, {
        timed: true,
        label,
        duration,
        ...data
      });
      return duration;
    }
  };
};

// ============================================================================
// STREAM MORGAN
// ============================================================================

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// ============================================================================
// FONCTIONS DE CONTRÔLE
// ============================================================================

/**
 * Change le niveau de log
 */
logger.setLevel = (level) => {
  const oldLevel = logger.level;
  logger.level = level;
  logger.info(`Log level changed: ${oldLevel} -> ${level}`);
};

/**
 * Obtient le niveau actuel
 */
logger.getLevel = () => logger.level;

/**
 * Active/désactive la console
 */
logger.setConsoleEnabled = (enabled) => {
  if (enabled) {
    if (!logger.transports.find(t => t === consoleTransport)) {
      logger.add(consoleTransport);
    }
  } else {
    logger.remove(consoleTransport);
  }
};

/**
 * Active/désactive le mode silencieux
 */
logger.setSilent = (silent) => {
  logger.silent = silent;
  logger.transports.forEach(t => t.silent = silent);
};

/**
 * Obtient les statistiques du logger
 */
logger.getStats = () => ({
  level: logger.level,
  silent: logger.silent,
  transportsCount: logger.transports.length,
  transports: logger.transports.map(t => ({
    type: t.constructor.name,
    level: t.level || logger.level,
    filename: t.filename || 'console',
    silent: t.silent
  })),
  logsDir: CONFIG.logsDir,
  config: {
    maxSize: CONFIG.maxSize,
    maxFiles: CONFIG.maxFiles
  }
});

/**
 * Flush tous les transports (utile avant exit)
 */
logger.flush = () => {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
};

// ============================================================================
// CHILD LOGGER
// ============================================================================

/**
 * Crée un logger enfant avec contexte fixe
 * @param {string} context - Nom du contexte (ex: 'AuthService')
 * @returns {Object} Logger avec contexte
 */
logger.child = (context) => {
  return {
    error: (message, data = {}) => logger.error(`[${context}] ${message}`, { ...data, filename: context }),
    warn: (message, data = {}) => logger.warn(`[${context}] ${message}`, { ...data, filename: context }),
    info: (message, data = {}) => logger.info(`[${context}] ${message}`, { ...data, filename: context }),
    http: (message, data = {}) => logger.http(`[${context}] ${message}`, { ...data, filename: context }),
    debug: (message, data = {}) => logger.debug(`[${context}] ${message}`, { ...data, filename: context }),
    verbose: (message, data = {}) => logger.verbose(`[${context}] ${message}`, { ...data, filename: context }),
    logError: (error, extra = {}) => logger.logError(context, error, { ...extra, filename: context })
  };
};

/**
 * Crée un logger avec filename automatique
 * Toutes les logs incluront le filename en préfixe
 * @param {string} filename - Nom du fichier (ex: 'authController.js')
 * @returns {Object} Logger avec filename automatique
 */
logger.createLogger = (filename) => {
  return {
    error: (message, data = {}) => logger.error(message, { ...data, filename }),
    warn: (message, data = {}) => logger.warn(message, { ...data, filename }),
    info: (message, data = {}) => logger.info(message, { ...data, filename }),
    http: (message, data = {}) => logger.http(message, { ...data, filename }),
    debug: (message, data = {}) => logger.debug(message, { ...data, filename }),
    verbose: (message, data = {}) => logger.verbose(message, { ...data, filename }),
    silly: (message, data = {}) => logger.silly(message, { ...data, filename }),
    logError: (error, extra = {}) => logger.logError(filename, error, extra),
    security: (event, data = {}) => logger.security(event, { ...data, filename }),
    userAction: (userId, action, data = {}) => logger.userAction(userId, action, { ...data, filename }),
    adminAction: (adminId, action, data = {}) => logger.adminAction(adminId, action, { ...data, filename }),
    payment: (event, data = {}) => logger.payment(event, { ...data, filename }),
    ride: (rideId, event, data = {}) => logger.ride(rideId, event, { ...data, filename }),
    metric: (metric, value, unit, data = {}) => logger.metric(metric, value, unit, { ...data, filename })
  };
};

/**
 * Log une requête HTTP avec tous les détails
 */
logger.httpRequest = (req, res, duration) => {
  logger.http('HTTP Request', {
    filename: 'http-middleware',
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userId: req.user?.id || req.userId,
    requestId: req.id || req.requestId,
    userAgent: req.get('user-agent')
  });
};

/**
 * Log un événement de sécurité amélioré
 */
logger.securityEvent = (event, severity = 'warning', data = {}) => {
  const level = severity === 'critical' ? 'error' : severity === 'warning' ? 'warn' : 'info';
  logger[level](`[SECURITY] ${event}`, {
    filename: 'security',
    security: true,
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// ============================================================================
// GESTION ERREURS GLOBALES
// ============================================================================

// Exceptions non capturées
process.on('uncaughtException', (error) => {
  logger.error('[UNCAUGHT EXCEPTION]', {
    error: error.message,
    stack: error.stack,
    fatal: true
  });
  
  // En production, terminer proprement
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => process.exit(1), 1000);
  }
});

// Rejections de promesses non gérées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[UNHANDLED REJECTION]', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    fatal: false
  });
});

// Signal de terminaison
process.on('SIGTERM', () => {
  logger.info('[SIGTERM] Graceful shutdown initiated');
});

process.on('SIGINT', () => {
  logger.info('[SIGINT] Graceful shutdown initiated');
});

// ============================================================================
// LOG DÉMARRAGE
// ============================================================================

if (process.env.NODE_ENV !== 'test') {
  logger.info('Logger initialized', {
    level: logger.level,
    env: process.env.NODE_ENV || 'development',
    transports: logger.transports.length,
    logsDir: CONFIG.logsDir
  });
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = logger;

// Export additionnel pour les constantes
module.exports.CONFIG = CONFIG;
module.exports.LEVEL_CONFIG = LEVEL_CONFIG;