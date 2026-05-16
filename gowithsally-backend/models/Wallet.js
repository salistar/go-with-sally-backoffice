/**
 * ============================================================================
 * GO WITH SALLY - WALLET MODEL
 * ============================================================================
 * Modèle MongoDB pour les portefeuilles utilisateurs
 *
 * @module models/Wallet
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  balance: {
    type: Number,
    default: 0,
    min: 0,
  },

  currency: {
    type: String,
    default: 'MAD',
  },

  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
    },
    amount: Number,
    description: String,
    rideId: mongoose.Schema.Types.ObjectId,
    referenceId: String,
    source: {
      type: String,
      enum: ['ride', 'topup', 'refund', 'withdrawal', 'bonus', 'referral'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

  topupMethods: [{
    method: String, // 'card', 'bank_transfer', 'mobile_money'
    isDefault: Boolean,
    details: mongoose.Schema.Types.Mixed,
  }],

  withdrawalMethods: [{
    method: String,
    isDefault: Boolean,
    accountNumber: String,
    accountHolder: String,
  }],

  totalEarnings: {
    type: Number,
    default: 0,
  },

  totalSpent: {
    type: Number,
    default: 0,
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1 },
  ],
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
