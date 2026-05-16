/**
 * GO WITH SALLY - SOCKET.IO
 * @version 2.0.0
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - initSocket() function entry
// - Other exported function entries

console.log('📄 index.js ▶ Module loaded');

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Import chatHandler avec try/catch (optionnel)
let chatHandler = null;
try {
  chatHandler = require('./chatHandler');
  console.log('✅ [socket] chatHandler chargé');
} catch (e) {
  console.log('⚠️ [socket] chatHandler non disponible:', e.message);
}

let io = null;

// ============================================================================
// INIT SOCKET
// ============================================================================

const initSocket = (server) => {
  console.log('📄 index.js ▶ initSocket() called');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // ============================================================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================================================
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        console.log('⚠️ [socket] No token provided');
        return next(new Error('Authentication required'));
      }

      const jwtSecret = process.env.JWT_SECRET || 'gowithsally-super-secret-key-2024';
      const decoded = jwt.verify(token, jwtSecret);
      
      // Compatibilité avec différents formats de token
      const userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
      
      if (!userId) {
        console.log('⚠️ [socket] No userId in token');
        return next(new Error('Invalid token format'));
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.log('⚠️ [socket] User not found:', userId);
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      console.error('❌ [socket] Auth error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // ============================================================================
  // CONNECTION HANDLER
  // ============================================================================
  
  io.on('connection', async (socket) => {
    console.log(`🔌 [socket] Connected: ${socket.id} | User: ${socket.user.firstName} ${socket.user.lastName} (${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    console.log(`   └─ Joined room: user:${socket.userId}`);

    // Update online status
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
      });
    } catch (e) {
      console.warn('⚠️ [socket] Failed to update online status:', e.message);
    }

    // Broadcast online status to contacts (optional)
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      timestamp: new Date()
    });

    // ========================================================================
    // CHAT HANDLER
    // ========================================================================
    
    if (chatHandler && typeof chatHandler === 'function') {
      chatHandler(io, socket);
    }

    // ========================================================================
    // CONVERSATION EVENTS
    // ========================================================================

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        console.log(`   └─ User ${socket.userId} joined conversation:${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`   └─ User ${socket.userId} left conversation:${conversationId}`);
      }
    });

    // ========================================================================
    // RIDE EVENTS
    // ========================================================================
    
    // Join ride room
    socket.on('ride:join', (rideId) => {
      if (rideId) {
        socket.join(`ride:${rideId}`);
        console.log(`   └─ User ${socket.userId} joined ride:${rideId}`);
        
        // Notify others in ride
        socket.to(`ride:${rideId}`).emit('ride:user_joined', {
          userId: socket.userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          timestamp: new Date()
        });
      }
    });

    // Leave ride room
    socket.on('ride:leave', (rideId) => {
      if (rideId) {
        socket.leave(`ride:${rideId}`);
        console.log(`   └─ User ${socket.userId} left ride:${rideId}`);
        
        // Notify others in ride
        socket.to(`ride:${rideId}`).emit('ride:user_left', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // ========================================================================
    // LOCATION EVENTS (for drivers)
    // ========================================================================
    
    socket.on('location:update', (data) => {
      const { latitude, longitude, heading, speed, rideId } = data;
      
      if (!latitude || !longitude) return;

      const locationData = {
        userId: socket.userId,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date()
      };

      // Emit to specific ride
      if (rideId) {
        io.to(`ride:${rideId}`).emit('driver:location', {
          ...locationData,
          rideId
        });
      }

      // Update driver location in DB (optional, throttled)
      if (socket.user.role === 'driver') {
        // Throttle to avoid too many DB writes
        if (!socket.lastLocationUpdate || Date.now() - socket.lastLocationUpdate > 5000) {
          socket.lastLocationUpdate = Date.now();
          User.findByIdAndUpdate(socket.userId, {
            'location.coordinates': [longitude, latitude],
            'location.updatedAt': new Date()
          }).catch(() => {});
        }
      }
    });

    // ========================================================================
    // TYPING INDICATORS
    // ========================================================================
    
    socket.on('typing:start', (data) => {
      const { conversationId, recipientId } = data;
      
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:start', {
          conversationId,
          userId: socket.userId,
          userName: socket.user.firstName
        });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:start', {
          conversationId,
          userId: socket.userId,
          userName: socket.user.firstName
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { conversationId, recipientId } = data;
      
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('typing:stop', {
          conversationId,
          userId: socket.userId
        });
      } else if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
          conversationId,
          userId: socket.userId
        });
      }
    });

    // ========================================================================
    // MESSAGE EVENTS
    // ========================================================================

    // Mark messages as delivered
    socket.on('message:delivered', (data) => {
      const { messageId, senderId } = data;
      if (senderId) {
        io.to(`user:${senderId}`).emit('message:status', {
          messageId,
          status: 'delivered',
          timestamp: new Date()
        });
      }
    });

    // Mark messages as read
    socket.on('message:read', (data) => {
      const { messageId, senderId, conversationId } = data;
      if (senderId) {
        io.to(`user:${senderId}`).emit('message:status', {
          messageId,
          conversationId,
          status: 'read',
          timestamp: new Date()
        });
      }
    });

    // ========================================================================
    // SOS / EMERGENCY
    // ========================================================================

    socket.on('sos:trigger', async (data) => {
      const { rideId, location, message } = data;
      
      console.log(`🚨 [socket] SOS triggered by ${socket.userId}`);

      const sosData = {
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        userPhone: socket.user.phone,
        rideId,
        location,
        message: message || 'Urgence!',
        timestamp: new Date()
      };

      // Emit to ride participants
      if (rideId) {
        io.to(`ride:${rideId}`).emit('sos:alert', sosData);
      }

      // Emit to admin/support room
      io.to('admin').emit('sos:alert', sosData);
      io.to('support').emit('sos:alert', sosData);
    });

    // ========================================================================
    // ADMIN ROOM JOIN
    // ========================================================================

    socket.on('admin:join', () => {
      if (socket.user.role === 'admin' || socket.user.role === 'support') {
        socket.join('admin');
        socket.join('support');
        console.log(`   └─ ${socket.user.role} joined admin/support rooms`);
      }
    });

    // ========================================================================
    // PING / PONG (keep alive)
    // ========================================================================

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ========================================================================
    // ERROR HANDLER
    // ========================================================================
    
    socket.on('error', (error) => {
      console.error(`❌ [socket] Error for user ${socket.userId}:`, error);
    });

    // ========================================================================
    // DISCONNECT HANDLER
    // ========================================================================
    
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 [socket] Disconnected: ${socket.id} | User: ${socket.userId} | Reason: ${reason}`);

      // Update offline status
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
          socketId: null
        });
      } catch (e) {
        console.warn('⚠️ [socket] Failed to update offline status:', e.message);
      }

      // Broadcast offline status
      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });
  });

  console.log('✅ [socket] Socket.IO initialized');
  return io;
};

// ============================================================================
// GETTER
// ============================================================================

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket(server) first.');
  }
  return io;
};

// Safe getter (doesn't throw)
const getIOSafe = () => {
  return io || null;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
    return true;
  }
  return false;
};

const emitToConversation = (conversationId, event, data) => {
  if (io && conversationId) {
    io.to(`conversation:${conversationId}`).emit(event, data);
    return true;
  }
  return false;
};

const emitToRide = (rideId, event, data) => {
  if (io && rideId) {
    io.to(`ride:${rideId}`).emit(event, data);
    return true;
  }
  return false;
};

const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    return true;
  }
  return false;
};

const emitToRoom = (room, event, data) => {
  if (io && room) {
    io.to(room).emit(event, data);
    return true;
  }
  return false;
};

// Get connected users count
const getConnectedUsersCount = () => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

// Check if user is online
const isUserOnline = (userId) => {
  if (!io || !userId) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return room && room.size > 0;
};

// Get user's socket
const getUserSocket = (userId) => {
  if (!io || !userId) return null;
  for (const [id, socket] of io.sockets.sockets) {
    if (socket.userId === userId.toString()) {
      return socket;
    }
  }
  return null;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initSocket,
  getIO,
  getIOSafe,
  emitToUser,
  emitToConversation,
  emitToRide,
  emitToAll,
  emitToRoom,
  getConnectedUsersCount,
  isUserOnline,
  getUserSocket
};