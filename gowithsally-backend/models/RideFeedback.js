/**
 * ============================================================================
 * GO WITH SALLY - RIDE FEEDBACK MODEL
 * ============================================================================
 * Modèle MongoDB pour les retours de trajet
 *
 * @module models/RideFeedback
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const rideFeedbackSchema = new mongoose.Schema({
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

  feedbackType: {
    type: String,
    enum: ['nps', 'survey', 'detailed_review'],
    default: 'nps',
  },

  npsScore: {
    type: Number,
    min: 0,
    max: 10,
  },

  wouldRecommend: {
    type: Boolean,
  },

  surveyResponses: [{
    question: String,
    answer: mongoose.Schema.Types.Mixed,
  }],

  likeAspects: [String],

  dislikeAspects: [String],

  suggestedImprovements: String,

  detailedComment: String,

  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
  },

  followUpNeeded: {
    type: Boolean,
    default: false,
  },

  followUpStatus: {
    type: String,
    enum: ['pending', 'contacted', 'resolved'],
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1, createdAt: -1 },
    { rideId: 1 },
    { npsScore: 1, sentiment: 1 },
  ],
});

const RideFeedback = mongoose.model('RideFeedback', rideFeedbackSchema);

module.exports = RideFeedback;
