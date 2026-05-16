/**
 * ============================================================================
 * GO WITH SALLY - SUPPORT TICKET MODEL
 * ============================================================================
 * Modèle MongoDB pour les tickets de support
 *
 * @module models/SupportTicket
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  category: {
    type: String,
    enum: ['ride_issue', 'payment', 'driver_behavior', 'app_bug', 'safety', 'other'],
    required: true,
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  subject: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  relatedRideId: mongoose.Schema.Types.ObjectId,

  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  attachments: [String],

  messages: [{
    senderId: mongoose.Schema.Types.ObjectId,
    senderType: {
      type: String,
      enum: ['user', 'support'],
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

  resolution: {
    resolutionType: String,
    refundAmount: Number,
    notes: String,
    resolvedAt: Date,
  },

  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
  },

  satisfactionComment: String,

}, {
  timestamps: true,
  indexes: [
    { userId: 1, status: 1 },
    { ticketNumber: 1 },
    { priority: 1, status: 1, createdAt: -1 },
  ],
});

// Generate ticket number
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TKT-${Date.now()}-${count + 1}`;
  }
  next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
