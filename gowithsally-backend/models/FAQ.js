/**
 * ============================================================================
 * GO WITH SALLY - FAQ MODEL
 * ============================================================================
 * Modèle MongoDB pour les FAQ
 *
 * @module models/FAQ
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    index: true,
  },

  answer: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: ['getting_started', 'safety', 'payments', 'account', 'rides', 'drivers', 'other'],
    required: true,
    index: true,
  },

  subcategory: String,

  order: {
    type: Number,
    default: 0,
  },

  helpfulness: {
    type: Number,
    default: 0,
  },

  views: {
    type: Number,
    default: 0,
  },

  votes: [{
    userId: mongoose.Schema.Types.ObjectId,
    helpful: Boolean,
    timestamp: Date,
  }],

  tags: [String],

  relatedQuestions: [mongoose.Schema.Types.ObjectId],

  language: {
    type: String,
    default: 'fr',
  },

  active: {
    type: Boolean,
    default: true,
    index: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

}, {
  timestamps: true,
  indexes: [
    { category: 1, active: 1, order: 1 },
    { question: 'text', answer: 'text' },
  ],
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;
