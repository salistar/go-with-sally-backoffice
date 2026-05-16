// models/Message.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  uri: { type: String, required: true },
  thumbnail: { type: String },
  duration: { type: Number },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  width: { type: Number },
  height: { type: Number }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'file', 'location'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  media: mediaSchema,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  readAt: Date,
  deliveredAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  metadata: {
    clientMessageId: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ rideId: 1, createdAt: -1 });
messageSchema.index({ 'metadata.clientMessageId': 1 });

// Virtual for formatted time
messageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Methods
messageSchema.methods.markAsDelivered = async function() {
  if (this.status === 'sent') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    await this.save();
  }
  return this;
};

messageSchema.methods.markAsRead = async function() {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

messageSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
  return this;
};

// Statics
messageSchema.statics.getConversationMessages = async function(conversationId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    conversationId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'firstName lastName avatar')
    .populate('replyTo', 'content type')
    .lean();
};

messageSchema.statics.getUnreadCount = async function(userId, conversationId = null) {
  const query = {
    recipient: userId,
    status: { $in: ['sent', 'delivered'] },
    isDeleted: false
  };
  
  if (conversationId) {
    query.conversationId = conversationId;
  }
  
  return this.countDocuments(query);
};

messageSchema.statics.markConversationAsRead = async function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      recipient: userId,
      status: { $ne: 'read' }
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// Pre-save hook
messageSchema.pre('save', function(next) {
  // Validate media for non-text messages
  if (this.type !== 'text' && this.type !== 'location' && !this.media) {
    next(new Error('Media is required for non-text messages'));
  }
  next();
});

// Transform for JSON
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    if (ret.isDeleted) {
      ret.content = null;
      ret.media = null;
    }
    return ret;
  }
});

module.exports = mongoose.model('Message', messageSchema);