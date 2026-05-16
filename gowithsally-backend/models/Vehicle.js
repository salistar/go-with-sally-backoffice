/**
 * ============================================================================
 * GO WITH SALLY - VEHICLE MODEL
 * ============================================================================
 * Modèle MongoDB pour les véhicules des conductrices
 *
 * @module models/Vehicle
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true,
  },

  make: {
    type: String,
    required: true,
  },

  model: {
    type: String,
    required: true,
  },

  year: {
    type: Number,
    required: true,
  },

  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  color: String,

  vin: {
    type: String,
    unique: true,
    sparse: true,
  },

  serviceType: {
    type: String,
    enum: ['eco', 'standard', 'comfort'],
    required: true,
  },

  registrationDocument: String, // File path

  insuranceDocument: String,

  technicalInspectionDocument: String,

  registrationExpiry: Date,

  insuranceExpiry: Date,

  technicalInspectionExpiry: Date,

  mileage: {
    type: Number,
    default: 0,
  },

  lastMaintenanceDate: Date,

  nextMaintenanceDate: Date,

  isActive: {
    type: Boolean,
    default: true,
  },

  inspections: [{
    date: Date,
    type: String,
    status: String,
    notes: String,
    inspector: mongoose.Schema.Types.ObjectId,
  }],

  maintenanceRecords: [{
    date: Date,
    type: String,
    cost: Number,
    description: String,
    provider: String,
  }],

}, {
  timestamps: true,
  indexes: [
    { driverId: 1, isActive: 1 },
    { licensePlate: 1 },
  ],
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
