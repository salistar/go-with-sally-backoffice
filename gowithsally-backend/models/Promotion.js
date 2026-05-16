/**
 * ============================================================================
 * GO WITH SALLY - PROMOTION/COUPON MODEL
 * ============================================================================
 * Modèle MongoDB pour les promotions et coupons
 *
 * @module models/Promotion
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },

  description: String,

  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },

  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },

  maxDiscount: Number, // Pour les pourcentages

  minRideAmount: {
    type: Number,
    default: 0,
  },

  usageLimit: {
    type: Number,
    default: null, // null = illimité
  },

  usageCount: {
    type: Number,
    default: 0,
  },

  usagePerUser: {
    type: Number,
    default: 1,
  },

  applicableServices: [String], // ['eco', 'standard', 'comfort'] - empty = all

  applicableAreas: [String], // zone codes

  validFrom: {
    type: Date,
    required: true,
  },

  validUntil: {
    type: Date,
    required: true,
  },

  usedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    usedAt: Date,
    rideId: mongoose.Schema.Types.ObjectId,
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  active: {
    type: Boolean,
    default: true,
    index: true,
  },

}, {
  timestamps: true,
  indexes: [
    { code: 1, active: 1 },
    { validFrom: 1, validUntil: 1 },
  ],
});

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
