/**
 * GO WITH SALLY - CHAT ROUTES
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Import auth middleware - compatible avec les deux exports possibles
let authMiddleware;
try {
  const authModule = require('../middleware/auth');
  authMiddleware = authModule.verifyToken || authModule.auth || authModule.protect || authModule;
  if (typeof authMiddleware !== 'function') {
    // Si c'est un objet, chercher la bonne fonction
    authMiddleware = authModule.verifyToken || authModule.auth || authModule.protect;
  }
} catch (e) {
  console.error('❌ [routes/chat.js] Erreur chargement auth middleware:', e.message);
  authMiddleware = (req, res, next) => {
    res.status(500).json({ success: false, message: 'Auth middleware non disponible' });
  };
}

// Helper pour obtenir io depuis req (sans throw pour éviter crash)
const getIO = (req) => {
  if (req.io) return req.io;
  if (req.socketModule) {
    if (req.socketModule.io) return req.socketModule.io;
    if (req.socketModule.getIO) return req.socketModule.getIO();
  }
  return null; // Retourne null au lieu de throw
};

// Emit helper (safe)
const safeEmit = (req, room, event, data) => {
  try {
    const io = getIO(req);
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
// MULTER CONFIG
// ============================================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// ============================================================================
// ROUTES
// ============================================================================

// POST /api/chat/conversation - Get or create conversation
router.post('/conversation', authMiddleware, async (req, res) => {
  try {
    const { recipientId, rideId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'recipientId est requis'
      });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
      ...(rideId && { rideId })
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, recipientId],
        rideId: rideId || null
      });
      await conversation.save();
    }

    await conversation.populate('participants', 'firstName lastName avatar phone');

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la conversation',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// GET /api/chat/conversations - Get conversations list
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'firstName lastName avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        let unreadCount = 0;
        try {
          // Méthode statique si elle existe
          if (Message.getUnreadCount) {
            unreadCount = await Message.getUnreadCount(userId, conv._id);
          } else {
            // Fallback: compter manuellement
            unreadCount = await Message.countDocuments({
              conversationId: conv._id,
              recipient: userId,
              status: { $in: ['sent', 'delivered'] },
              isDeleted: { $ne: true }
            });
          }
        } catch (e) {
          unreadCount = 0;
        }
        return {
          ...conv.toJSON(),
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithUnread
    });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des conversations'
    });
  }
});

// GET /api/chat/messages/:conversationId - Get messages for a conversation
router.get('/messages/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Get messages
    let messages;
    if (Message.getConversationMessages) {
      messages = await Message.getConversationMessages(conversationId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } else {
      // Fallback: query manuelle
      messages = await Message.find({
        conversationId,
        isDeleted: { $ne: true }
      })
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('sender', 'firstName lastName avatar');
    }

    // Mark messages as read
    if (Message.markConversationAsRead) {
      await Message.markConversationAsRead(conversationId, userId);
    } else {
      // Fallback: update manuel
      await Message.updateMany(
        {
          conversationId,
          recipient: userId,
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          readAt: new Date()
        }
      );
    }

    res.json({
      success: true,
      messages: Array.isArray(messages) ? messages.reverse() : [],
      page: parseInt(page),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages'
    });
  }
});

// POST /api/chat/messages - Send text message
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId, recipientId, content, rideId, clientMessageId, replyTo } = req.body;
    const senderId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis'
      });
    }

    if (!conversationId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId et recipientId sont requis'
      });
    }

    const message = new Message({
      conversationId,
      rideId: rideId || null,
      sender: senderId,
      recipient: recipientId,
      type: 'text',
      content: content.trim(),
      status: 'sent',
      replyTo: replyTo || null,
      metadata: { clientMessageId }
    });

    await message.save();
    await message.populate('sender', 'firstName lastName avatar');

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Emit via Socket.IO (safe)
    safeEmit(req, `user:${recipientId}`, 'message:new', message);

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du message"
    });
  }
});

// POST /api/chat/messages/media - Upload and send media message
router.post('/messages/media', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { conversationId, recipientId, type, rideId, clientMessageId, duration } = req.body;
    const senderId = req.user._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Fichier requis'
      });
    }

    // Generate public URL for the file
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/uploads/chat/${file.filename}`;

    // Thumbnail (simplified)
    const thumbnail = type === 'image' ? fileUrl : null;

    const message = new Message({
      conversationId,
      rideId: rideId || null,
      sender: senderId,
      recipient: recipientId,
      type: type || 'file',
      media: {
        uri: fileUrl,
        thumbnail,
        duration: duration ? parseFloat(duration) : undefined,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      },
      status: 'sent',
      metadata: { clientMessageId }
    });

    await message.save();
    await message.populate('sender', 'firstName lastName avatar');

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Emit via Socket.IO (safe)
    safeEmit(req, `user:${recipientId}`, 'message:new', message);

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Error sending media message:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du média"
    });
  }
});

// POST /api/chat/messages/location - Send location message
router.post('/messages/location', authMiddleware, async (req, res) => {
  try {
    const { conversationId, recipientId, latitude, longitude, address, rideId, clientMessageId } = req.body;
    const senderId = req.user._id;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'latitude et longitude sont requis'
      });
    }

    const message = new Message({
      conversationId,
      rideId: rideId || null,
      sender: senderId,
      recipient: recipientId,
      type: 'location',
      location: { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude), 
        address: address || '' 
      },
      status: 'sent',
      metadata: { clientMessageId }
    });

    await message.save();
    await message.populate('sender', 'firstName lastName avatar');

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Emit via Socket.IO (safe)
    safeEmit(req, `user:${recipientId}`, 'message:new', message);

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Error sending location:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de la position"
    });
  }
});

// PATCH /api/chat/messages/:messageId/status - Update message status
router.patch('/messages/:messageId/status', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!['delivered', 'read'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status invalide (delivered ou read)'
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      recipient: userId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Update status
    if (status === 'delivered') {
      if (message.markAsDelivered) {
        await message.markAsDelivered();
      } else {
        message.status = 'delivered';
        message.deliveredAt = new Date();
        await message.save();
      }
    } else if (status === 'read') {
      if (message.markAsRead) {
        await message.markAsRead();
      } else {
        message.status = 'read';
        message.readAt = new Date();
        await message.save();
      }
    }

    // Notify sender about status change
    safeEmit(req, `user:${message.sender}`, 'message:status', {
      messageId: message._id,
      status: message.status,
      timestamp: status === 'read' ? message.readAt : message.deliveredAt
    });

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Error updating message status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// DELETE /api/chat/messages/:messageId - Delete message (soft delete)
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Soft delete
    if (message.softDelete) {
      await message.softDelete();
    } else {
      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();
    }

    // Notify recipient about deletion
    safeEmit(req, `user:${message.recipient}`, 'message:deleted', {
      messageId: message._id
    });

    res.json({
      success: true,
      message: 'Message supprimé'
    });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

// GET /api/chat/unread-count - Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    let count = 0;

    if (Message.getUnreadCount) {
      count = await Message.getUnreadCount(userId);
    } else {
      // Fallback: compter manuellement
      count = await Message.countDocuments({
        recipient: userId,
        status: { $in: ['sent', 'delivered'] },
        isDeleted: { $ne: true }
      });
    }

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

// GET /api/chat/conversation/:recipientId - Get conversation by recipient
router.get('/conversation/:recipientId', authMiddleware, async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    }).populate('participants', 'firstName lastName avatar phone');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
});

module.exports = router;