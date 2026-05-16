/**
 * ============================================================================
 * GO WITH SALLY - GEOFENCING ZONE MODEL
 * ============================================================================
 * Modèle MongoDB pour les zones géographiques
 *
 * @module models/Zone
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  city: String,

  area: {
    type: {
      type: String,
      enum: ['Polygon', 'Point'],
      default: 'Polygon',
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },

  zoneType: {
    type: String,
    enum: ['service_area', 'restricted', 'premium', 'eco'],
    default: 'service_area',
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'testing'],
    default: 'active',
    index: true,
  },

  pricingZone: {
    baseFare: Number,
    perKmRate: Number,
    perMinuteRate: Number,
    surgePricingMultiplier: {
      type: Number,
      default: 1.0,
    },
  },

  restrictions: {
    allowedServices: [String], // ['eco', 'standard', 'comfort']
    minWaitTime: Number, // minutes
    maxDetour: Number, // percentage
  },

  availableHours: {
    start: String, // "06:00"
    end: String, // "23:00"
  },

  description: String,

  isActive: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
  indexes: [
    { name: 1 },
    { status: 1, isActive: 1 },
    { 'area': '2dsphere' },
  ],
});

const Zone = mongoose.model('Zone', zoneSchema);

module.exports = Zone;
