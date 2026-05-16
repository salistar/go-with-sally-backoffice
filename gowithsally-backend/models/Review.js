/**
 * ============================================================================
 * GO WITH SALLY - REVIEW/RATING MODEL
 * ============================================================================
 * Modèle MongoDB pour les avis détaillés
 *
 * @module models/Review
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    unique: true,
    index: true,
  },

  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  revieweeType: {
    type: String,
    enum: ['driver', 'passenger'],
    required: true,
  },

  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },

  categories: {
    safety: {
      type: Number,
      min: 1,
      max: 5,
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
    },
    driving: {
      type: Number,
      min: 1,
      max: 5,
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
  },

  comment: String,

  tags: [String], // ['friendly', 'professional', 'quiet', 'chatty', etc]

  anonymous: {
    type: Boolean,
    default: false,
  },

  visible: {
    type: Boolean,
    default: true,
  },

}, {
  timestamps: true,
  indexes: [
    { revieweeId: 1, createdAt: -1 },
    { reviewerId: 1, rideId: 1 },
  ],
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
