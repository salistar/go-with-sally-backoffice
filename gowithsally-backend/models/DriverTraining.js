/**
 * ============================================================================
 * GO WITH SALLY - DRIVER TRAINING MODEL
 * ============================================================================
 * Modèle MongoDB pour la formation des conductrices
 *
 * @module models/DriverTraining
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const driverTrainingSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true,
  },

  modules: [{
    moduleId: mongoose.Schema.Types.ObjectId,
    moduleName: String,
    description: String,
    category: {
      type: String,
      enum: ['safety', 'customer_service', 'vehicle_maintenance', 'navigation', 'compliance'],
    },
    duration: Number, // minutes
    content: String,
    startedAt: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    score: Number,
    certificateUrl: String,
    expiryDate: Date,
  }],

  certifications: [{
    certificationName: String,
    issuedAt: Date,
    expiryDate: Date,
    certificateNumber: String,
    isActive: Boolean,
  }],

  totalModulesCompleted: {
    type: Number,
    default: 0,
  },

  averageScore: Number,

  complianceStatus: {
    type: String,
    enum: ['compliant', 'pending', 'non_compliant'],
    default: 'pending',
  },

  lastTrainingDate: Date,

  nextTrainingDue: Date,

  trainingHistory: [{
    moduleId: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    score: Number,
  }],

}, {
  timestamps: true,
  indexes: [
    { driverId: 1 },
    { complianceStatus: 1, nextTrainingDue: 1 },
  ],
});

const DriverTraining = mongoose.model('DriverTraining', driverTrainingSchema);

module.exports = DriverTraining;
