/**
 * ============================================================================
 * GO WITH SALLY - SURGE PRICING MODEL
 * ============================================================================
 * Modèle MongoDB pour la tarification dynamique
 *
 * @module models/SurgePricing
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const surgePricingSchema = new mongoose.Schema({
  area: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },

  zone: {
    type: String,
    required: true,
    index: true,
  },

  multiplier: {
    type: Number,
    default: 1.0,
    min: 1.0,
  },

  reason: {
    type: String,
    enum: ['high_demand', 'bad_weather', 'events', 'special', 'peak_hours'],
  },

  activeSince: {
    type: Date,
    default: Date.now,
  },

  activeUntil: Date,

  demandratio: Number, // ratio de demande / disponibilité

  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },

  notes: String,

}, {
  timestamps: true,
  indexes: [
    { zone: 1, isActive: 1 },
    { 'area': '2dsphere' },
  ],
});

const SurgePricing = mongoose.model('SurgePricing', surgePricingSchema);

module.exports = SurgePricing;
