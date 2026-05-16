/**
 * ============================================================================
 * GO WITH SALLY - RIDE INSURANCE MODEL
 * ============================================================================
 * Modèle MongoDB pour l'assurance trajets
 *
 * @module models/RideInsurance
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const rideInsuranceSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    unique: true,
    index: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  insuranceType: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    default: 'basic',
  },

  premium: {
    type: Number,
    required: true,
  },

  coverage: {
    accidentalDamage: Number,
    personalBelongings: Number,
    medicalEmergency: Number,
    cancellation: Number,
  },

  status: {
    type: String,
    enum: ['active', 'claimed', 'expired'],
    default: 'active',
  },

  claims: [{
    claimType: String,
    description: String,
    amount: Number,
    status: String,
    submittedAt: Date,
    claimId: mongoose.Schema.Types.ObjectId,
  }],

  expiresAt: Date,

}, {
  timestamps: true,
  indexes: [
    { rideId: 1 },
    { userId: 1, status: 1 },
  ],
});

const RideInsurance = mongoose.model('RideInsurance', rideInsuranceSchema);

module.exports = RideInsurance;
