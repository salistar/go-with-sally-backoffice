/**
 * ============================================================================
 * GO WITH SALLY - FAVORITE PLACES MODEL
 * ============================================================================
 * Modèle MongoDB pour les lieux favoris
 *
 * @module models/Favorite
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  label: {
    type: String,
    enum: ['home', 'work', 'gym', 'school', 'shopping', 'custom'],
    required: true,
  },

  customLabel: String,

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

  placeId: String, // Google Places ID

  notes: String,

}, {
  timestamps: true,
  indexes: [
    { userId: 1, label: 1 },
    { 'coordinates': '2dsphere' },
  ],
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
