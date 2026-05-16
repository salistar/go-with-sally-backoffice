/**
 * GO WITH SALLY - NOTIFICATIONS ROUTES
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Import auth middleware - compatible avec les deux exports possibles
let authMiddleware;
try {
  const authModule = require('../middleware/auth');
  authMiddleware = authModule.verifyToken || authModule.auth || authModule.protect || authModule;
  if (typeof authMiddleware !== 'function') {
    authMiddleware = authModule.verifyToken || authModule.auth || authModule.protect;
  }
} catch (e) {
  console.error('❌ [routes/notifications.js] Erreur chargement auth middleware:', e.message);
  authMiddleware = (req, res, next) => {
    res.status(500).json({ success: false, message: 'Auth middleware non disponible' });
  };
}

// Helper pour émettre via Socket.IO (safe)
const safeEmit = (req, room, event, data) => {
  try {
    const io = req.io || (req.socketModule && req.socketModule.getIO ? req.socketModule.getIO() : null);
    if (io) {
      io.to(room).emit(event, data);
      return true;
    }
  } catch (e) {
    console.warn('⚠️ Socket emit failed:', e.message);
  }
  return false;
};

// ============================================================================
// ROUTES
// ============================================================================

// GET /api/notifications - Get user notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
    const userId = req.user._id;

    const user = await User.findById(userId).select('notifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    let notifications = user.notifications || [];

    // Filter unread only
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }

    // Sort by date desc (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = notifications.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginated = notifications.slice(startIndex, endIndex);

    // Count unread
    const unreadCount = (user.notifications || []).filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications: paginated,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: endIndex < total,
          hasPrev: parseInt(page) > 1
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread count only
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('notifications');
    const count = (user?.notifications || []).filter(n => !n.read).length;

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      unreadCount: 0
    });
  }
});

// GET /api/notifications/:id - Get single notification
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).select('notifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const notification = user.notifications.id(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('❌ Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const notification = user.notifications.id(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    // Mark as read
    notification.read = true;
    notification.readAt = new Date();
    await user.save();

    // Emit update
    safeEmit(req, `user:${userId}`, 'notification:read', { id });

    res.json({
      success: true,
      notification,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    let updatedCount = 0;
    const now = new Date();

    user.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        n.readAt = now;
        updatedCount++;
      }
    });

    await user.save();

    // Emit update
    safeEmit(req, `user:${userId}`, 'notifications:readAll', { count: updatedCount });

    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues',
      updatedCount
    });
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const notificationIndex = user.notifications.findIndex(
      n => n._id.toString() === id
    );

    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }

    // Remove notification
    user.notifications.splice(notificationIndex, 1);
    await user.save();

    // Emit update
    safeEmit(req, `user:${userId}`, 'notification:deleted', { id });

    res.json({
      success: true,
      message: 'Notification supprimée'
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

// DELETE /api/notifications - Clear all notifications
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await User.findByIdAndUpdate(
      userId,
      { notifications: [] },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Emit update
    safeEmit(req, `user:${userId}`, 'notifications:cleared', {});

    res.json({
      success: true,
      message: 'Toutes les notifications ont été supprimées'
    });
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

// POST /api/notifications/send - Send notification (admin/system use)
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { userId, type, title, message, icon, data } = req.body;

    // Vérifier si admin ou système
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, title et message sont requis'
      });
    }

    const notification = {
      type: type || 'system',
      title,
      message,
      icon: icon || 'ℹ️',
      data: data || {},
      read: false,
      createdAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { notifications: { $each: [notification], $position: 0 } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Emit notification in real-time
    safeEmit(req, `user:${userId}`, 'notification:new', notification);

    res.status(201).json({
      success: true,
      message: 'Notification envoyée',
      notification
    });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi"
    });
  }
});

// POST /api/notifications/broadcast - Broadcast to all users (admin only)
router.post('/broadcast', authMiddleware, async (req, res) => {
  try {
    const { type, title, message, icon, targetRole } = req.body;

    // Vérifier si admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Réservé aux administrateurs'
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title et message sont requis'
      });
    }

    const notification = {
      type: type || 'broadcast',
      title,
      message,
      icon: icon || '📢',
      read: false,
      createdAt: new Date()
    };

    // Build query
    const query = { isActive: true };
    if (targetRole) {
      query.role = targetRole;
    }

    // Add notification to all matching users
    const result = await User.updateMany(
      query,
      { $push: { notifications: { $each: [notification], $position: 0 } } }
    );

    // Emit to all connected users
    const io = req.io || (req.socketModule && req.socketModule.getIO ? req.socketModule.getIO() : null);
    if (io) {
      io.emit('notification:broadcast', notification);
    }

    res.status(201).json({
      success: true,
      message: `Notification envoyée à ${result.modifiedCount} utilisateurs`,
      sentTo: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error broadcasting notification:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi"
    });
  }
});

module.exports = router;