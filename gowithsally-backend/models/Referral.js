/**
 * ============================================================================
 * GO WITH SALLY - REFERRAL PROGRAM MODEL
 * ============================================================================
 * Modèle MongoDB pour le programme de parrainage
 *
 * @module models/Referral
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  referralCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    index: true,
  },

  referredUsers: [{
    userId: mongoose.Schema.Types.ObjectId,
    joinedAt: Date,
    rewardClaimed: {
      type: Boolean,
      default: false,
    },
    rewardAmount: Number,
    claimedAt: Date,
  }],

  successCount: {
    type: Number,
    default: 0,
  },

  totalRewardEarned: {
    type: Number,
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  rewardType: {
    type: String,
    enum: ['discount', 'points', 'cash', 'free_rides'],
    default: 'discount',
  },

  rewardValue: {
    type: Number,
    required: true,
  },

  minimumRidesRequired: {
    type: Number,
    default: 1,
  },

  expiryDate: Date,

}, {
  timestamps: true,
  indexes: [
    { referrerId: 1, isActive: 1 },
    { referralCode: 1 },
  ],
});

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;
