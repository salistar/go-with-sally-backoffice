/**
 * GO WITH SALLY - CHAT HANDLER (Socket.IO)
 * @version 2.0.0
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - Handler initialization (io, socket) entry

console.log('📄 chatHandler.js ▶ Module loaded');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

module.exports = (io, socket) => {
  console.log('📄 chatHandler.js ▶ handler(io, socket) called');
  const userId = socket.user._id;
  const userIdStr = userId.toString();
  const userName = `${socket.user.firstName} ${socket.user.lastName}`;

  console.log(`💬 [chatHandler] User ${userName} (${userIdStr}) connected to chat`);

  // ============================================================================
  // JOIN CONVERSATION
  // ============================================================================
  
  socket.on('conversation:join', async (conversationId) => {
    try {
      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId requis' });
      }

      // Verify user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        return socket.emit('error', { 
          message: 'Conversation non trouvée ou accès refusé',
          conversationId 
        });
      }

      // Join room
      socket.join(`conversation:${conversationId}`);
      console.log(`   └─ ${userName} joined conversation:${conversationId}`);

      // Mark messages as delivered when user joins
      const deliveredResult = await Message.updateMany(
        {
          conversationId,
          recipient: userId,
          status: 'sent'
        },
        {
          $set: {
            status: 'delivered',
            deliveredAt: new Date()
          }
        }
      );

      if (deliveredResult.modifiedCount > 0) {
        console.log(`   └─ ${deliveredResult.modifiedCount} messages marked as delivered`);
        
        // Notify senders that their messages were delivered
        const messages = await Message.find({
          conversationId,
          recipient: userId,
          status: 'delivered'
        }).distinct('sender');

        messages.forEach(senderId => {
          io.to(`user:${senderId}`).emit('messages:delivered:batch', {
            conversationId,
            recipientId: userIdStr,
            timestamp: new Date()
          });
        });
      }

      // Emit success
      socket.emit('conversation:joined', { conversationId });

    } catch (error) {
      console.error('❌ [chatHandler] Error joining conversation:', error);
      socket.emit('error', { 
        message: 'Erreur lors de la connexion à la conversation',
        error: error.message 
      });
    }
  });

  // ============================================================================
  // LEAVE CONVERSATION
  // ============================================================================
  
  socket.on('conversation:leave', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
      console.log(`   └─ ${userName} left conversation:${conversationId}`);
      socket.emit('conversation:left', { conversationId });
    }
  });

  // ============================================================================
  // TYPING INDICATORS
  // ============================================================================
  
  socket.on('typing:start', ({ conversationId, recipientId }) => {
    const payload = {
      conversationId,
      userId: userIdStr,
      userName: socket.user.firstName,
      isTyping: true,
      timestamp: new Date()
    };

    if (recipientId) {
      io.to(`user:${recipientId}`).emit('typing:update', payload);
    }
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit('typing:update', payload);
    }
  });

  socket.on('typing:stop', ({ conversationId, recipientId }) => {
    const payload = {
      conversationId,
      userId: userIdStr,
      isTyping: false,
      timestamp: new Date()
    };

    if (recipientId) {
      io.to(`user:${recipientId}`).emit('typing:update', payload);
    }
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit('typing:update', payload);
    }
  });

  // ============================================================================
  // MESSAGE READ ACKNOWLEDGMENT
  // ============================================================================
  
  socket.on('message:read', async ({ messageId, conversationId }) => {
    try {
      if (!messageId) {
        return socket.emit('error', { message: 'messageId requis' });
      }

      const message = await Message.findOne({
        _id: messageId,
        recipient: userId
      });

      if (!message) {
        return socket.emit('error', { message: 'Message non trouvé' });
      }

      // Mark as read
      if (message.markAsRead && typeof message.markAsRead === 'function') {
        await message.markAsRead();
      } else {
        message.status = 'read';
        message.readAt = new Date();
        await message.save();
      }

      // Notify sender
      io.to(`user:${message.sender}`).emit('message:status', {
        messageId: message._id,
        conversationId: conversationId || message.conversationId,
        status: 'read',
        readAt: message.readAt,
        readBy: userIdStr
      });

      console.log(`   └─ Message ${messageId} marked as read by ${userName}`);

    } catch (error) {
      console.error('❌ [chatHandler] Error marking message as read:', error);
      socket.emit('error', { message: 'Erreur lors du marquage du message' });
    }
  });

  // ============================================================================
  // BATCH READ MESSAGES
  // ============================================================================
  
  socket.on('messages:read:batch', async ({ conversationId }) => {
    try {
      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId requis' });
      }

      // Verify access
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation non trouvée' });
      }

      // Find unread messages
      const messages = await Message.find({
        conversationId,
        recipient: userId,
        status: { $ne: 'read' }
      });

      if (messages.length === 0) {
        return socket.emit('messages:read:batch:complete', { 
          conversationId, 
          count: 0 
        });
      }

      const senderIds = new Set();
      const now = new Date();

      // Mark all as read
      for (const message of messages) {
        if (message.markAsRead && typeof message.markAsRead === 'function') {
          await message.markAsRead();
        } else {
          message.status = 'read';
          message.readAt = now;
          await message.save();
        }
        senderIds.add(message.sender.toString());
      }

      // Notify all senders
      for (const senderId of senderIds) {
        io.to(`user:${senderId}`).emit('messages:read:batch', {
          conversationId,
          readBy: userIdStr,
          readByName: socket.user.firstName,
          count: messages.length,
          readAt: now
        });
      }

      // Confirm to sender
      socket.emit('messages:read:batch:complete', {
        conversationId,
        count: messages.length
      });

      console.log(`   └─ ${messages.length} messages marked as read in ${conversationId}`);

    } catch (error) {
      console.error('❌ [chatHandler] Error batch reading messages:', error);
      socket.emit('error', { message: 'Erreur lors du marquage des messages' });
    }
  });

  // ============================================================================
  // MESSAGE DELIVERY CONFIRMATION
  // ============================================================================
  
  socket.on('message:delivered', async ({ messageId }) => {
    try {
      if (!messageId) return;

      const message = await Message.findOne({
        _id: messageId,
        recipient: userId
      });

      if (!message) return;

      // Mark as delivered
      if (message.markAsDelivered && typeof message.markAsDelivered === 'function') {
        await message.markAsDelivered();
      } else {
        message.status = 'delivered';
        message.deliveredAt = new Date();
        await message.save();
      }

      // Notify sender
      io.to(`user:${message.sender}`).emit('message:status', {
        messageId: message._id,
        conversationId: message.conversationId,
        status: 'delivered',
        deliveredAt: message.deliveredAt
      });

    } catch (error) {
      console.error('❌ [chatHandler] Error marking message as delivered:', error);
    }
  });

  // ============================================================================
  // SEND MESSAGE VIA SOCKET (alternative to REST)
  // ============================================================================
  
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, recipientId, content, type = 'text', rideId, clientMessageId, replyTo } = data;

      if (!conversationId || !recipientId) {
        return socket.emit('error', { message: 'conversationId et recipientId requis' });
      }

      if (type === 'text' && (!content || !content.trim())) {
        return socket.emit('error', { message: 'Contenu requis' });
      }

      // Create message
      const message = new Message({
        conversationId,
        rideId: rideId || null,
        sender: userId,
        recipient: recipientId,
        type,
        content: content ? content.trim() : null,
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

      // Emit to recipient
      io.to(`user:${recipientId}`).emit('message:new', message);

      // Emit to conversation room
      socket.to(`conversation:${conversationId}`).emit('message:new', message);

      // Confirm to sender
      socket.emit('message:sent', {
        clientMessageId,
        message
      });

      console.log(`   └─ Message sent from ${userName} to ${recipientId}`);

    } catch (error) {
      console.error('❌ [chatHandler] Error sending message:', error);
      socket.emit('error', { 
        message: 'Erreur lors de l\'envoi du message',
        clientMessageId: data.clientMessageId 
      });
    }
  });

  // ============================================================================
  // DELETE MESSAGE
  // ============================================================================
  
  socket.on('message:delete', async ({ messageId }) => {
    try {
      if (!messageId) return;

      const message = await Message.findOne({
        _id: messageId,
        sender: userId
      });

      if (!message) {
        return socket.emit('error', { message: 'Message non trouvé' });
      }

      // Soft delete
      if (message.softDelete && typeof message.softDelete === 'function') {
        await message.softDelete();
      } else {
        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();
      }

      // Notify recipient
      io.to(`user:${message.recipient}`).emit('message:deleted', {
        messageId: message._id,
        conversationId: message.conversationId
      });

      // Notify conversation room
      socket.to(`conversation:${message.conversationId}`).emit('message:deleted', {
        messageId: message._id
      });

      // Confirm to sender
      socket.emit('message:deleted:confirm', { messageId });

      console.log(`   └─ Message ${messageId} deleted by ${userName}`);

    } catch (error) {
      console.error('❌ [chatHandler] Error deleting message:', error);
      socket.emit('error', { message: 'Erreur lors de la suppression' });
    }
  });

  // ============================================================================
  // ONLINE STATUS / PRESENCE
  // ============================================================================
  
  socket.on('presence:online', async () => {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      socket.broadcast.emit('presence:update', {
        userId: userIdStr,
        userName: socket.user.firstName,
        status: 'online',
        lastSeen: new Date()
      });
    } catch (e) {
      console.warn('⚠️ [chatHandler] Failed to update online status');
    }
  });

  socket.on('presence:away', async () => {
    socket.broadcast.emit('presence:update', {
      userId: userIdStr,
      status: 'away',
      lastSeen: new Date()
    });
  });

  // ============================================================================
  // GET UNREAD COUNT
  // ============================================================================
  
  socket.on('unread:count', async () => {
    try {
      let count = 0;
      
      if (Message.getUnreadCount && typeof Message.getUnreadCount === 'function') {
        count = await Message.getUnreadCount(userId);
      } else {
        count = await Message.countDocuments({
          recipient: userId,
          status: { $in: ['sent', 'delivered'] },
          isDeleted: { $ne: true }
        });
      }

      socket.emit('unread:count', { count });
    } catch (error) {
      console.error('❌ [chatHandler] Error getting unread count:', error);
      socket.emit('unread:count', { count: 0 });
    }
  });

  // ============================================================================
  // DISCONNECT HANDLER
  // ============================================================================
  
  socket.on('disconnect', async () => {
    console.log(`💬 [chatHandler] User ${userName} (${userIdStr}) disconnected from chat`);

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });
    } catch (e) {
      // Silent fail
    }

    // Broadcast offline status
    socket.broadcast.emit('presence:update', {
      userId: userIdStr,
      status: 'offline',
      lastSeen: new Date()
    });
  });
};