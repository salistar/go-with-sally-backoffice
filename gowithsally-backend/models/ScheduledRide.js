/**
 * ============================================================================
 * GO WITH SALLY - SCHEDULED RIDE MODEL
 * ============================================================================
 * Modèle MongoDB pour les trajets planifiés
 *
 * @module models/ScheduledRide
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const scheduledRideSchema = new mongoose.Schema({
  // Référence à l'utilisateur (passagère)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Détails du trajet
  pickupLocation: {
    address: {
      type: String,
      required: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },

  dropoffLocation: {
    address: {
      type: String,
      required: true,
    },
    coordinates: {
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
  },

  // Horaire
  scheduledDateTime: {
    type: Date,
    required: true,
    index: true,
  },

  // Récurrence
  recurring: {
    type: Boolean,
    default: false,
  },

  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: null,
  },

  recurrenceDays: [String], // ['monday', 'tuesday', ...]

  recurrenceEndDate: Date,

  // Préférences
  preferences: {
    serviceType: {
      type: String,
      enum: ['eco', 'standard', 'comfort'],
      default: 'standard',
    },
    maxPassengers: {
      type: Number,
      default: 1,
    },
    allowSharing: {
      type: Boolean,
      default: false,
    },
    specialRequirements: String,
  },

  // Statut
  status: {
    type: String,
    enum: ['scheduled', 'assigned', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },

  // Assignation conductrice
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null,
  },

  // Estimations
  estimatedFare: Number,
  estimatedDuration: Number, // en minutes
  estimatedDistance: Number, // en km

  // Historique des instances complétées
  completedInstances: [{
    rideId: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    actualFare: Number,
    driverId: mongoose.Schema.Types.ObjectId,
  }],

  // Notes
  notes: String,

  // Annulations
  cancellationReason: String,
  cancelledAt: Date,

}, {
  timestamps: true,
  indexes: [
    { userId: 1, scheduledDateTime: 1 },
    { status: 1, scheduledDateTime: 1 },
    { 'pickupLocation.coordinates': '2dsphere' },
  ],
});

// ============================================================================
// EXPORT
// ============================================================================

const ScheduledRide = mongoose.model('ScheduledRide', scheduledRideSchema);

module.exports = ScheduledRide;
