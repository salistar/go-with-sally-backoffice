/**
 * ============================================================================
 * GO WITH SALLY - LOYALTY/REWARDS MODEL
 * ============================================================================
 * Modèle MongoDB pour le système de loyauté
 *
 * @module models/Loyalty
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const loyaltySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  points: {
    type: Number,
    default: 0,
    min: 0,
  },

  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  },

  tiersProgression: {
    bronze: {
      minPoints: 0,
      benefits: [String],
    },
    silver: {
      minPoints: 1000,
      benefits: [String],
    },
    gold: {
      minPoints: 5000,
      benefits: [String],
    },
    platinum: {
      minPoints: 10000,
      benefits: [String],
    },
  },

  pointsEarned: {
    type: Number,
    default: 0,
  },

  pointsRedeemed: {
    type: Number,
    default: 0,
  },

  pointsHistory: [{
    type: String, // 'ride', 'referral', 'review', 'redemption'
    amount: Number,
    description: String,
    rideId: mongoose.Schema.Types.ObjectId,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

  rewardsRedeemed: [{
    rewardId: mongoose.Schema.Types.ObjectId,
    pointsUsed: Number,
    redeemedAt: Date,
  }],

  expiryDate: Date,

}, {
  timestamps: true,
  indexes: [
    { userId: 1 },
    { tier: 1, points: -1 },
  ],
});

const Loyalty = mongoose.model('Loyalty', loyaltySchema);

module.exports = Loyalty;
