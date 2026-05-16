/**
 * ============================================================================
 * GO WITH SALLY - EMERGENCY CONTACT MODEL
 * ============================================================================
 * Modèle MongoDB pour les contacts d'urgence
 *
 * @module models/EmergencyContact
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true,
  },

  relationship: {
    type: String,
    enum: ['parent', 'sibling', 'spouse', 'friend', 'other'],
    required: true,
  },

  phoneNumber: {
    type: String,
    required: true,
  },

  email: String,

  isPrimary: {
    type: Boolean,
    default: false,
  },

  notifyOnSOS: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1, isPrimary: 1 },
  ],
});

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);

module.exports = EmergencyContact;
