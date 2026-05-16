// backend/src/models/OTP.js
// Modèle OTP Go With Sally

const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  phone: {
    type: String,
    index: true
  },
  email: {
    type: String,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['phone', 'email', 'password_reset'],
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // TTL: suppression automatique après 1 heure
  },
  metadata: {
    ip: String,
    userAgent: String,
    deviceId: String
  }
});

// Index composé pour nettoyage
OTPSchema.index({ expiresAt: 1, used: 1 });

// Méthodes statiques
OTPSchema.statics.cleanExpired = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { used: true, usedAt: { $lt: new Date(Date.now() - 3600000) } }
    ]
  });
  return result.deletedCount;
};

OTPSchema.statics.findValidBySessionId = function(sessionId) {
  return this.findOne({
    sessionId,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

module.exports = mongoose.model('OTP', OTPSchema);