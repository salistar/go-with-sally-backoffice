/**
 * ============================================================================
 * GO WITH SALLY - SUBSCRIPTION MODEL
 * ============================================================================
 * Modèle MongoDB pour les plans d'abonnement
 *
 * @module models/Subscription
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  planType: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium', 'vip'],
    default: 'free',
    required: true,
  },

  monthlyRides: {
    type: Number,
    default: 0, // 0 = unlimited
  },

  monthlyDiscount: {
    type: Number,
    default: 0,
  },

  price: {
    type: Number,
    required: true,
  },

  currency: {
    type: String,
    default: 'MAD',
  },

  ridesUsedThisMonth: {
    type: Number,
    default: 0,
  },

  rideResetDate: Date,

  benefits: [String],

  startDate: {
    type: Date,
    default: Date.now,
  },

  endDate: Date,

  autoRenew: {
    type: Boolean,
    default: true,
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'active',
    index: true,
  },

  paymentMethod: String,

  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly',
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1, status: 1 },
    { planType: 1, status: 1 },
  ],
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
