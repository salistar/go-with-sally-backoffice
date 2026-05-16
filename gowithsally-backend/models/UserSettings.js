/**
 * ============================================================================
 * GO WITH SALLY - USER SETTINGS MODEL
 * ============================================================================
 * Modèle MongoDB pour les paramètres utilisateurs
 *
 * @module models/UserSettings
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  language: {
    type: String,
    enum: ['fr', 'ar', 'en'],
    default: 'fr',
  },

  currency: {
    type: String,
    default: 'MAD',
  },

  notifications: {
    rideUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: true,
    },
    messages: {
      type: Boolean,
      default: true,
    },
    paymentReminders: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
  },

  privacy: {
    shareLocation: {
      type: Boolean,
      default: true,
    },
    shareRideHistory: {
      type: Boolean,
      default: false,
    },
    allowMessaging: {
      type: Boolean,
      default: true,
    },
    allowReviews: {
      type: Boolean,
      default: true,
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private',
    },
  },

  safety: {
    trustedContacts: [mongoose.Schema.Types.ObjectId],
    shareEmergencyContact: {
      type: Boolean,
      default: false,
    },
    sosAutomaticAlert: {
      type: Boolean,
      default: true,
    },
  },

  preferences: {
    preferredPaymentMethod: String,
    defaultPickupType: {
      type: String,
      enum: ['current_location', 'favorite', 'search'],
    },
    rideReminders: {
      type: Boolean,
      default: true,
    },
    reviewReminders: {
      type: Boolean,
      default: true,
    },
  },

  theme: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },

}, {
  timestamps: true,
});

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

module.exports = UserSettings;
