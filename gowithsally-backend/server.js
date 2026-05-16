/**
 * ============================================================================
 * GO WITH SALLY - BACKEND SERVER
 * ============================================================================
 * @version 2.1.0
 * Point d'entrée principal de l'API backend
 * FIXED: Socket handlers integration
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log at line 12
// - startServer() function entry at line 807

require('dotenv').config();
console.log('📄 server.js ▶ Module loaded');

// ============================================================================
// IMPORTS
// ============================================================================

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

// Configuration
const config = require('./config');
const { connectMongoDB, connectRedis, getRedisStatus, getMongoDBStatus } = require('./config/database');
const logger = require('./utils/logger');

// Middleware
const { authenticateSocket, verifyToken, optionalAuth } = require('./middleware/auth');

// ============================================================================
// INITIALISATION EXPRESS
// ============================================================================

const app = express();
const server = http.createServer(app);

// ============================================================================
// CRÉATION DOSSIERS
// ============================================================================

const directories = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/avatars'),
  path.join(__dirname, 'uploads/documents'),
  path.join(__dirname, 'uploads/chat'),
  path.join(__dirname, 'uploads/vehicles'),
  path.join(__dirname, 'logs')
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// SOCKET.IO INITIALISATION
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGINS || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e7 // 10MB pour les fichiers
});

// ============================================================================
// SOCKET MODULE (Export pour les routes)
// ============================================================================

const socketModule = {
  io,
  
  getIO: () => io,
  
  emitToUser: (userId, event, data) => {
    if (userId) io.to(`user:${userId}`).emit(event, data);
  },
  
  emitToDriver: (driverId, event, data) => {
    if (driverId) io.to(`driver:${driverId}`).emit(event, data);
  },
  
  emitToConversation: (conversationId, event, data) => {
    if (conversationId) io.to(`conversation:${conversationId}`).emit(event, data);
  },
  
  emitToRide: (rideId, event, data) => {
    if (rideId) io.to(`ride:${rideId}`).emit(event, data);
  },
  
  emitToRoom: (room, event, data) => {
    if (room) io.to(room).emit(event, data);
  },
  
  emitToAll: (event, data) => {
    io.emit(event, data);
  },
  
  emitToAdmins: (event, data) => {
    io.to('admins').emit(event, data);
  },
  
  getConnectedUsers: () => {
    return io.sockets.sockets.size;
  },
  
  isUserOnline: (userId) => {
    const room = io.sockets.adapter.rooms.get(`user:${userId}`);
    return room ? room.size > 0 : false;
  }
};

// ============================================================================
// MIDDLEWARE DE SÉCURITÉ
// ============================================================================

// Helmet (sécurité headers HTTP)
app.use(helmet({
  contentSecurityPolicy: config.isProduction() ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:']
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Permettre les requêtes sans origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = config.CORS_ORIGINS || ['http://localhost:3000'];
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-Id', 'X-App-Version', 'X-App-Mode'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400 // 24h
};
app.use(cors(corsOptions));

// Protection NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (logger.security) {
      logger.security('NoSQL Injection Attempt', { ip: req.ip, path: req.path, key });
    }
  }
}));

// Protection HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'status', 'type']
}));

// ============================================================================
// RATE LIMITING
// ============================================================================

// Rate limiter global
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT?.WINDOW_MS || 15 * 60 * 1000,
  max: config.RATE_LIMIT?.MAX_REQUESTS || 100,
  message: { 
    success: false, 
    message: 'Trop de requêtes. Veuillez réessayer plus tard.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health' || req.path === '/api/health') return true;
    return false;
  },
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  }
});

// Rate limiter strict pour l'auth
const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT?.AUTH_WINDOW_MS || 60 * 1000,
  max: config.RATE_LIMIT?.AUTH_MAX_REQUESTS || 10,
  message: { 
    success: false, 
    message: 'Trop de tentatives. Veuillez réessayer dans 1 minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// ============================================================================
// MIDDLEWARE DE PARSING
// ============================================================================

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// ============================================================================
// LOGGING HTTP
// ============================================================================

const morganFormat = config.NODE_ENV === 'production' 
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
  : 'dev';

const morganSkip = (req) => {
  return req.path === '/health' || req.path === '/api/health';
};

app.use(morgan(morganFormat, { 
  stream: logger.stream,
  skip: morganSkip
}));

// ============================================================================
// MIDDLEWARE PERSONNALISÉS
// ============================================================================

// Request ID
app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// Socket.IO disponible dans les requêtes
app.use((req, res, next) => {
  req.io = io;
  req.socketModule = socketModule;
  next();
});

// Response time header
app.use((req, res, next) => {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (duration > 1000 && !req.path.includes('/health')) {
      logger.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Trust proxy
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));

// ============================================================================
// ROUTES DE SANTÉ
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Go With Sally API is running 🚗💖', 
    version: config.APP?.VERSION || '2.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

app.get('/api/health', async (req, res) => {
  const mongoStatus = getMongoDBStatus();
  const redisStatus = getRedisStatus();
  
  const healthy = mongoStatus === 'connected';
  
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: 'Go With Sally API',
    version: config.APP?.VERSION || '2.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    status: {
      server: 'running',
      mongodb: mongoStatus,
      redis: redisStatus
    },
    connections: {
      sockets: io.engine?.clientsCount || 0
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  });
});

// Service URLs config (dynamique: dev=localhost, prod=domaines depuis .env)
app.get('/api/config/urls', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.json({
    success: true,
    environment: process.env.NODE_ENV || 'development',
    urls: {
      api: process.env.APP_URL || 'http://localhost:5000',
      frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
      admin: process.env.ADMIN_URL || 'http://localhost:5000/admin',
      faceApi: process.env.FACE_API_PUBLIC_URL || 'http://localhost:8000',
      mongoExpress: isProduction ? null : (process.env.MONGO_EXPRESS_URL || 'http://localhost:8081'),
      redisCommander: isProduction ? null : (process.env.REDIS_COMMANDER_URL || 'http://localhost:8082'),
      kibana: process.env.KIBANA_URL || 'http://localhost:5601',
      elasticsearch: isProduction ? null : (process.env.ELASTICSEARCH_URL || 'http://localhost:9200'),
      apiDocs: (process.env.APP_URL || 'http://localhost:5000') + '/api-docs'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l\'API Go With Sally 🚗💖',
    version: config.APP?.VERSION || '2.0.0',
    documentation: '/api-docs',
    endpoints: {
      // Core Features
      auth: '/api/auth',
      users: '/api/users',
      drivers: '/api/drivers',
      rides: '/api/rides',
      services: '/api/services',
      badges: '/api/badges',
      pricing: '/api/pricing',
      notifications: '/api/notifications',
      chat: '/api/chat',
      affiliations: '/api/affiliations',
      verification: '/api/verification',
      admin: '/api/admin',
      // New Features (23 additions)
      scheduledRides: '/api/scheduled-rides',
      favorites: '/api/favorites',
      emergencyContacts: '/api/emergency-contacts',
      reviews: '/api/reviews',
      promotions: '/api/promotions',
      wallet: '/api/wallet',
      subscriptions: '/api/subscriptions',
      insurance: '/api/insurance',
      earnings: '/api/earnings',
      vehicles: '/api/vehicles',
      surge: '/api/surge',
      support: '/api/support',
      faq: '/api/faq',
      settings: '/api/settings',
      zones: '/api/zones',
      loyalty: '/api/loyalty',
      referrals: '/api/referrals',
      training: '/api/training',
      feedback: '/api/feedback',
      lostFound: '/api/lost-found'
    }
  });
});

// ============================================================================
// ROUTES API
// ============================================================================

// Fonction de chargement sécurisé des routes
const loadRoute = (routePath, mountPath) => {
  try {
    const route = require(routePath);
    app.use(mountPath, route);
    console.log(`✅ Route loaded: ${mountPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to load route ${mountPath}: ${error.message}`);
    logger.error(`Failed to load route ${mountPath}: ${error.message}`);
    return false;
  }
};

// Auth avec rate limiting strict
app.use('/api/auth', authLimiter, (() => {
  try { 
    console.log('✅ Route loaded: /api/auth');
    return require('./routes/auth'); 
  } 
  catch (e) { 
    console.error('❌ Failed to load route /api/auth:', e.message);
    return (req, res) => res.status(503).json({ success: false, message: 'Auth service unavailable' }); 
  }
})());

// Web interface routes (login, dashboard, admin)
loadRoute('./routes/web', '/');

// Static files for web interface
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Autres routes
loadRoute('./routes/users', '/api/users');
loadRoute('./routes/drivers', '/api/drivers');
loadRoute('./routes/rides', '/api/rides');
loadRoute('./routes/services', '/api/services');
loadRoute('./routes/badges', '/api/badges');
loadRoute('./routes/pricing', '/api/pricing');
loadRoute('./routes/notifications', '/api/notifications');
loadRoute('./routes/chat', '/api/chat');
loadRoute('./routes/affiliations', '/api/affiliations');
loadRoute('./routes/admin', '/api/admin');
loadRoute('./routes/verification.routes', '/api/verification');
loadRoute('./routes/faceai', '/api/face');

// ============================================================================
// NEW FEATURE ROUTES (23 FEATURES)
// ============================================================================

// 1. Scheduled Rides
loadRoute('./routes/scheduled-rides', '/api/scheduled-rides');

// 2. Favorites/Saved Places
loadRoute('./routes/favorites', '/api/favorites');

// 4. Emergency Contacts
loadRoute('./routes/emergency-contacts', '/api/emergency-contacts');

// 5. Reviews/Ratings
loadRoute('./routes/reviews', '/api/reviews');

// 6. Promotions/Coupons
loadRoute('./routes/promotions', '/api/promotions');

// 7. Wallet/Payments
loadRoute('./routes/wallet', '/api/wallet');

// 8. Subscription Plans
loadRoute('./routes/subscriptions', '/api/subscriptions');

// 9. Ride Insurance
loadRoute('./routes/insurance', '/api/insurance');

// 10. Driver Earnings
loadRoute('./routes/earnings', '/api/earnings');

// 11. Vehicle Management
loadRoute('./routes/vehicles', '/api/vehicles');

// 12. Surge Pricing
loadRoute('./routes/surge-pricing', '/api/surge');

// 14. Support Tickets
loadRoute('./routes/support', '/api/support');

// 15. FAQ/Help Center
loadRoute('./routes/faq', '/api/faq');

// 16. App Settings
loadRoute('./routes/settings', '/api/settings');

// 18. Geofencing Zones
loadRoute('./routes/zones', '/api/zones');

// 19. Loyalty/Rewards
loadRoute('./routes/loyalty', '/api/loyalty');

// 20. Referral Program
loadRoute('./routes/referrals', '/api/referrals');

// 21. Driver Training
loadRoute('./routes/training', '/api/training');

// 22. Ride Feedback
loadRoute('./routes/feedback', '/api/feedback');

// 23. Lost & Found
loadRoute('./routes/lost-found', '/api/lost-found');

// ============================================================================
// SOCKET.IO HANDLERS - FIXED
// ============================================================================

// Importer le chatHandler du dossier socket
let chatHandler = null;
try {
  chatHandler = require('./socket/chatHandler');
  console.log('✅ Chat handler loaded');
} catch (e) {
  console.warn('⚠️ Chat handler not found:', e.message);
}

// Authentification Socket
io.use(authenticateSocket);

// Connexion Socket
io.on('connection', (socket) => {
  const user = socket.user;
  const driver = socket.driver;
  const userId = user?._id?.toString();
  const driverId = driver?._id?.toString();
  
  console.log(`🔌 [socket] Connected: ${socket.id} | User: ${user?.firstName || 'Unknown'} (${userId || 'no-id'})`);
  
  // Rejoindre les rooms
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`   └─ Joined room: user:${userId}`);
    
    if (driver) {
      socket.join('drivers');
      socket.join(`driver:${driverId}`);
    }
    
    if (user.role === 'admin') {
      socket.join('admins');
    }
    
    if (user.role === 'support') {
      socket.join('support');
    }
  }
  
  // Confirmer la connexion
  socket.emit('connected', { 
    socketId: socket.id, 
    userId, 
    driverId,
    timestamp: new Date(),
    serverTime: Date.now()
  });
  
  // Utiliser le chatHandler si disponible
  if (chatHandler && typeof chatHandler === 'function') {
    try {
      chatHandler(io, socket);
    } catch (e) {
      console.error('❌ Chat handler error:', e.message);
    }
  }
  
  // ========================================================================
  // HANDLERS SOCKET INLINE
  // ========================================================================
  
  // Driver location update
  socket.on('driver:updateLocation', async (data) => {
    if (!driver) return socket.emit('error', { message: 'Non autorisé' });
    
    try {
      const { coordinates, heading, speed } = data;
      
      socket.broadcast.emit('driver:location', { 
        driverId, 
        coordinates, 
        heading, 
        speed,
        timestamp: new Date()
      });
      
      if (driver.currentRide) {
        io.to(`ride:${driver.currentRide}`).emit('ride:driverLocation', { 
          coordinates, 
          heading, 
          speed, 
          eta: data.eta 
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Erreur de mise à jour position' });
    }
  });
  
  // Location update générique
  socket.on('location:update', (data) => {
    const { latitude, longitude, heading, speed, rideId } = data;
    
    if (!latitude || !longitude) return;
    
    const locationData = {
      userId,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: new Date()
    };
    
    if (rideId) {
      io.to(`ride:${rideId}`).emit('driver:location', { ...locationData, rideId });
    }
  });
  
  // Driver online/offline
  socket.on('driver:goOnline', () => {
    if (!driver) return;
    socket.emit('driver:statusChanged', { isOnline: true, isAvailable: true });
    io.to('admins').emit('driver:status', { driverId, status: 'online' });
  });
  
  socket.on('driver:goOffline', () => {
    if (!driver) return;
    socket.emit('driver:statusChanged', { isOnline: false, isAvailable: false });
    io.to('admins').emit('driver:status', { driverId, status: 'offline' });
  });
  
  // Join/Leave ride room
  socket.on('ride:join', (rideId) => {
    if (rideId) {
      socket.join(`ride:${rideId}`);
      socket.to(`ride:${rideId}`).emit('ride:user_joined', {
        userId,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`,
        timestamp: new Date()
      });
    }
  });
  
  socket.on('ride:leave', (rideId) => {
    if (rideId) {
      socket.leave(`ride:${rideId}`);
      socket.to(`ride:${rideId}`).emit('ride:user_left', { userId, timestamp: new Date() });
    }
  });
  
  // Join/Leave conversation room
  socket.on('conversation:join', (conversationId) => {
    if (conversationId && userId) {
      socket.join(`conversation:${conversationId}`);
    }
  });
  
  socket.on('conversation:leave', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });
  
  // Typing indicators
  socket.on('typing:start', ({ conversationId, recipientId }) => {
    const payload = { conversationId, userId, userName: user?.firstName, isTyping: true, timestamp: new Date() };
    if (recipientId) io.to(`user:${recipientId}`).emit('typing:update', payload);
    if (conversationId) socket.to(`conversation:${conversationId}`).emit('typing:update', payload);
  });
  
  socket.on('typing:stop', ({ conversationId, recipientId }) => {
    const payload = { conversationId, userId, isTyping: false, timestamp: new Date() };
    if (recipientId) io.to(`user:${recipientId}`).emit('typing:update', payload);
    if (conversationId) socket.to(`conversation:${conversationId}`).emit('typing:update', payload);
  });
  
  // Message status
  socket.on('message:delivered', (data) => {
    const { messageId, senderId } = data;
    if (senderId) io.to(`user:${senderId}`).emit('message:status', { messageId, status: 'delivered', timestamp: new Date() });
  });
  
  socket.on('message:read', (data) => {
    const { messageId, senderId, conversationId } = data;
    if (senderId) io.to(`user:${senderId}`).emit('message:status', { messageId, conversationId, status: 'read', timestamp: new Date() });
  });
  
  // Presence
  socket.on('presence:online', () => {
    if (userId) socket.broadcast.emit('presence:update', { userId, status: 'online', lastSeen: new Date() });
  });
  
  socket.on('presence:away', () => {
    if (userId) socket.broadcast.emit('presence:update', { userId, status: 'away', lastSeen: new Date() });
  });
  
  // Admin room join
  socket.on('admin:join', () => {
    if (user?.role === 'admin' || user?.role === 'support') {
      socket.join('admin');
      socket.join('support');
    }
  });
  
  // Ping/Pong
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ pong: true, timestamp: Date.now() });
    } else {
      socket.emit('pong', { timestamp: Date.now() });
    }
  });
  
  // SOS Alert
  socket.on('sos:trigger', (data) => {
    const { rideId, location, message } = data;
    
    console.log(`🚨 [socket] SOS triggered by ${userId}`);
    if (logger.security) logger.security('SOS_ALERT', { rideId, userId, location });
    
    const sosData = {
      userId,
      userName: `${user?.firstName || ''} ${user?.lastName || ''}`,
      userPhone: user?.phone,
      rideId,
      location,
      message: message || 'Urgence!',
      timestamp: new Date(),
      priority: 'CRITICAL'
    };
    
    if (rideId) io.to(`ride:${rideId}`).emit('sos:alert', sosData);
    io.to('admins').emit('sos:alert', sosData);
    io.to('support').emit('sos:alert', sosData);
    
    socket.emit('sos:confirmed', { message: 'Alerte SOS envoyée. Les secours ont été prévenus.', timestamp: new Date() });
  });
  
  // Déconnexion
  socket.on('disconnect', (reason) => {
    console.log(`🔌 [socket] Disconnected: ${socket.id} | User: ${userId} | Reason: ${reason}`);
    if (userId) socket.broadcast.emit('presence:update', { userId, status: 'offline', lastSeen: new Date() });
  });
  
  // Erreurs socket
  socket.on('error', (error) => {
    console.error(`❌ [socket] Error for ${socket.id}:`, error);
    logger.error(`Socket error: ${error.message}`, { socketId: socket.id });
  });
});

console.log('✅ Socket.IO handlers configured');

// ============================================================================
// GESTIONNAIRE 404
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId
  });
});

// ============================================================================
// GESTIONNAIRE D'ERREURS GLOBAL
// ============================================================================

app.use((err, req, res, next) => {
  if (logger.logError) {
    logger.logError('Express', err, { requestId: req.requestId, method: req.method, path: req.path, userId: req.user?._id });
  } else {
    logger.error(`Express error: ${err.message}`);
  }
  
  let statusCode = err.status || err.statusCode || 500;
  
  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'UnauthorizedError') statusCode = 401;
  if (err.name === 'CastError') statusCode = 400;
  if (err.code === 11000) statusCode = 409;
  
  let message = err.message || 'Une erreur est survenue';
  
  if (config.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Une erreur interne est survenue';
  }
  
  res.status(statusCode).json({ 
    success: false, 
    message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    requestId: req.requestId
  });
});

// ============================================================================
// DÉMARRAGE SERVEUR
// ============================================================================

const startServer = async () => {
  console.log('📄 server.js ▶ startServer() called');
  try {
    await connectMongoDB();
    logger.info('MongoDB connected');
    
    try {
      await connectRedis();
      logger.info('Redis connected');
    } catch (redisError) {
      logger.warn(`Redis connection failed: ${redisError.message}`);
    }
    
    const PORT = config.PORT || 5000;
    const HOST = config.HOST || '0.0.0.0';
    
    server.listen(PORT, HOST, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════════════╗');
      console.log('║                                                                   ║');
      console.log('║     🚗  GO WITH SALLY - Backend Server  🚗                        ║');
      console.log('║                                                                   ║');
      console.log('╠═══════════════════════════════════════════════════════════════════╣');
      console.log('║                                                                   ║');
      console.log(`║   📍 Port:          ${String(PORT).padEnd(45)}║`);
      console.log(`║   🌍 Environment:   ${String(config.NODE_ENV).padEnd(45)}║`);
      console.log(`║   📦 MongoDB:       ${'Connected ✅'.padEnd(45)}║`);
      console.log(`║   🔌 Socket.IO:     ${'Active ✅'.padEnd(45)}║`);
      console.log(`║   💬 Chat:          ${(chatHandler ? 'Enabled ✅' : 'Inline Mode ⚠️').padEnd(45)}║`);
      console.log(`║   📱 Verification:  ${'Enabled ✅'.padEnd(45)}║`);
      console.log('║                                                                   ║');
      console.log(`║   🌐 API:           http://${HOST}:${PORT}/api`.padEnd(68) + '║');
      console.log(`║   ❤️  Health:        http://${HOST}:${PORT}/health`.padEnd(68) + '║');
      console.log('║                                                                   ║');
      console.log('║   🎉 Server is ready!                                             ║');
      console.log('║                                                                   ║');
      console.log('╚═══════════════════════════════════════════════════════════════════╝');
      console.log('');
      
      logger.info('Server started', { port: PORT, host: HOST, environment: config.NODE_ENV, pid: process.pid });
    });
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// ============================================================================
// GESTION PROCESSUS
// ============================================================================

process.on('uncaughtException', (error) => {
  logger.error('[FATAL] Uncaught Exception', { error: error.message, stack: error.stack });
  console.error('❌ UNCAUGHT EXCEPTION:', error.message);
  if (config.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 10000);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection', { reason: reason instanceof Error ? reason.message : reason });
  console.error('⚠️ UNHANDLED REJECTION:', reason);
});

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received - Graceful shutdown...`);
  logger.info(`${signal} received - Shutting down`);
  
  server.close(() => {
    console.log('✅ Server closed');
    logger.info('Server closed');
    io.close(() => {
      console.log('✅ Socket.IO closed');
      process.exit(0);
    });
    setTimeout(() => { console.log('⚠️ Forced shutdown'); process.exit(1); }, 10000);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// DÉMARRAGE
// ============================================================================

startServer();

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = { 
  app, 
  server, 
  io,
  socketModule,
  getIO: () => io,
  emitToUser: socketModule.emitToUser,
  emitToDriver: socketModule.emitToDriver,
  emitToRoom: socketModule.emitToRoom,
  emitToConversation: socketModule.emitToConversation,
  emitToRide: socketModule.emitToRide,
  emitToAdmins: socketModule.emitToAdmins
};