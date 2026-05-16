/**
 * ============================================================================
 * GO WITH SALLY - DRIVER EARNINGS MODEL
 * ============================================================================
 * Modèle MongoDB pour les gains des conductrices
 *
 * @module models/DriverEarnings
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const driverEarningsSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true,
  },

  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },

  date: {
    type: Date,
    required: true,
    index: true,
  },

  totalEarnings: {
    type: Number,
    default: 0,
  },

  breakdown: {
    grossRevenue: Number,
    platformCommission: Number,
    netEarnings: Number,
    bonuses: Number,
    penalties: Number,
  },

  ridesCount: {
    type: Number,
    default: 0,
  },

  rides: [{
    rideId: mongoose.Schema.Types.ObjectId,
    fare: Number,
    commission: Number,
    net: Number,
  }],

  bonuses: [{
    type: String,
    amount: Number,
    reason: String,
  }],

  penalties: [{
    type: String,
    amount: Number,
    reason: String,
  }],

  onlineHours: Number,

  rating: Number,

  cancellationRate: Number,

  notes: String,

}, {
  timestamps: true,
  indexes: [
    { driverId: 1, date: -1 },
    { driverId: 1, period: 1, date: -1 },
  ],
});

const DriverEarnings = mongoose.model('DriverEarnings', driverEarningsSchema);

module.exports = DriverEarnings;
