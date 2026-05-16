// models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ rideId: 1 });
conversationSchema.index({ updatedAt: -1 });

// Ensure exactly 2 participants
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('A conversation must have exactly 2 participants'));
  }
  next();
});

// Methods
conversationSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(p => p.toString() !== userId.toString());
};

// Statics
conversationSchema.statics.findOrCreate = async function(participant1, participant2, rideId = null) {
  let conversation = await this.findOne({
    participants: { $all: [participant1, participant2] },
    ...(rideId && { rideId })
  });

  if (!conversation) {
    conversation = new this({
      participants: [participant1, participant2],
      rideId
    });
    await conversation.save();
  }

  return conversation;
};

conversationSchema.statics.getUserConversations = async function(userId) {
  return this.find({
    participants: userId,
    isActive: true
  })
    .populate('participants', 'firstName lastName avatar')
    .populate({
      path: 'lastMessage',
      select: 'content type createdAt status'
    })
    .sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Conversation', conversationSchema);