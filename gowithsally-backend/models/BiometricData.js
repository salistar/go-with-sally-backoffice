// ============================================================
// 📄 BiometricData.js — GoWithSally
// LOG SUMMARY:
//   • console.log('BiometricData.js ▶ Module loaded')
//   • console.log('BiometricData.js ▶ BiometricData schema initialized')
// ============================================================

console.log('BiometricData.js ▶ Module loaded');

const mongoose = require('mongoose');

const biometricDataSchema = new mongoose.Schema({
  // ============================================================
  // UTILISATEUR
  // ============================================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // ============================================================
  // DONNÉES BIOMÉTRIQUES CHIFFRÉES
  // ============================================================
  embeddings: {
    type: String, // Données chiffrées (AES-256)
    required: true,
  },

  embeddingsType: {
    type: String,
    enum: ['face', 'fingerprint', 'voice', 'iris'],
    default: 'face',
  },

  // ============================================================
  // MÉTADONNÉES
  // ============================================================
  capturedAt: {
    type: Date,
    default: Date.now,
  },

  captureLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  },

  // ============================================================
  // EXPIRATION ET SUPPRESSION
  // ============================================================
  expiresAt: {
    type: Date,
    index: true,
    // 12 mois par défaut
    default: () => new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000),
  },

  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },

  deletedAt: Date,

  deletedReason: String,

  // ============================================================
  // CONSENTEMENT
  // ============================================================
  consentGiven: {
    type: Boolean,
    default: false,
  },

  consentVersion: String,

  consentGivenAt: Date,

  // ============================================================
  // AUDIT
  // ============================================================
  accessLog: [
    {
      accessedAt: Date,
      purpose: String,
      ipAddress: String,
      userAgent: String,
    },
  ],

  // ============================================================
  // TIMESTAMPS
  // ============================================================
  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1, expiresAt: 1 },
    { isDeleted: 1, expiresAt: 1 },
  ],
});

// ============================================================
// TTL INDEX (Auto-suppression à l'expiration)
// ============================================================

biometricDataSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { isDeleted: false } }
);

// ============================================================
// METHODS
// ============================================================

biometricDataSchema.methods.logAccess = async function(purpose, options = {}) {
  console.log('BiometricData.js ▶ logAccess() called');

  this.accessLog.push({
    accessedAt: new Date(),
    purpose,
    ipAddress: options.ip,
    userAgent: options.userAgent,
  });

  // Garder seulement les 100 derniers accès
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100);
  }

  await this.save();
  return this;
};

biometricDataSchema.methods.delete = async function(reason = 'User request') {
  console.log('BiometricData.js ▶ delete() called');

  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedReason = reason;
  await this.save();

  return this;
};

biometricDataSchema.methods.revokeConsent = async function() {
  console.log('BiometricData.js ▶ revokeConsent() called');

  this.consentGiven = false;
  // Supprimer immédiatement si consentement retiré
  await this.delete('Consent revoked');

  return this;
};

// ============================================================
// STATICS
// ============================================================

biometricDataSchema.statics.createBiometricData = async function(userId, embeddings, options = {}) {
  console.log('BiometricData.js ▶ createBiometricData() called');

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12); // Expiration dans 12 mois

  const biometricData = new this({
    userId,
    embeddings,
    embeddingsType: options.type || 'face',
    captureLocation: options.location,
    consentGiven: options.consentGiven || false,
    consentVersion: options.consentVersion,
    consentGivenAt: options.consentGivenAt,
    expiresAt,
  });

  await biometricData.save();
  return biometricData;
};

biometricDataSchema.statics.getUserBiometricData = async function(userId) {
  console.log('BiometricData.js ▶ getUserBiometricData() called');

  return this.findOne({
    userId,
    isDeleted: false,
    expiresAt: { $gt: new Date() },
  });
};

biometricDataSchema.statics.cleanupExpiredData = async function() {
  console.log('BiometricData.js ▶ cleanupExpiredData() called');

  const result = await this.deleteMany({
    isDeleted: true,
    deletedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Plus de 30 jours
  });

  return result.deletedCount;
};

// ============================================================
// EXPORT
// ============================================================

const BiometricData = mongoose.model('BiometricData', biometricDataSchema);
console.log('BiometricData.js ▶ BiometricData schema initialized');

module.exports = BiometricData;
