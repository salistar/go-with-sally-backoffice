/**
 * ============================================================================
 * GO WITH SALLY - LOST & FOUND MODEL
 * ============================================================================
 * Modèle MongoDB pour les objets perdus/trouvés
 *
 * @module models/LostAndFound
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const lostAndFoundSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
  },

  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  reporterType: {
    type: String,
    enum: ['passenger', 'driver'],
    required: true,
  },

  itemType: {
    type: String,
    enum: ['phone', 'wallet', 'keys', 'bag', 'clothing', 'jewelry', 'documents', 'other'],
    required: true,
  },

  itemDescription: {
    type: String,
    required: true,
  },

  color: String,

  brand: String,

  distinctive_marks: String,

  photos: [String],

  reportDate: {
    type: Date,
    default: Date.now,
  },

  lastSeenDate: Date,

  lastSeenLocation: {
    coordinates: {
      type: [Number],
    },
    address: String,
  },

  status: {
    type: String,
    enum: ['reported', 'claimed', 'unclaimed', 'returned', 'closed'],
    default: 'reported',
    index: true,
  },

  claimedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    claimedAt: Date,
    verificationCode: String,
    verified: Boolean,
  },

  handoverMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'local_station'],
  },

  handoverDetails: {
    location: String,
    scheduledDate: Date,
    completedDate: Date,
  },

  rewardOffered: Number,

  notes: String,

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },

}, {
  timestamps: true,
  indexes: [
    { reporterId: 1, status: 1 },
    { rideId: 1 },
    { status: 1, reportDate: -1 },
  ],
});

const LostAndFound = mongoose.model('LostAndFound', lostAndFoundSchema);

module.exports = LostAndFound;
