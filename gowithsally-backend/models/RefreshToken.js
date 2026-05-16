// ============================================================
// 📄 RefreshToken.js — GoWithSally
// LOG SUMMARY:
//   • console.log('RefreshToken.js ▶ Module loaded')
//   • console.log('RefreshToken.js ▶ RefreshToken schema initialized')
// ============================================================

console.log('RefreshToken.js ▶ Module loaded');

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  // ============================================================
  // TOKEN ET UTILISATEUR
  // ============================================================
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // ============================================================
  // DURÉE DE VIE
  // ============================================================
  expiresAt: {
    type: Date,
    required: true,
    index: true,
    expires: 0, // Auto-suppression après expiration
  },

  // ============================================================
  // STATUT
  // ============================================================
  revokedAt: {
    type: Date,
    default: null,
    index: true,
  },

  // ============================================================
  // DEVICE ET SÉCURITÉ
  // ============================================================
  userAgent: String,

  ip: String,

  deviceId: String,

  // ============================================================
  // TIMESTAMPS
  // ============================================================
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

}, {
  timestamps: true,
  indexes: [
    { userId: 1, expiresAt: 1 },
    { userId: 1, revokedAt: 1 },
    { token: 1, revokedAt: 1 },
  ],
});

// ============================================================
// VIRTUAL
// ============================================================

refreshTokenSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

refreshTokenSchema.virtual('isRevoked').get(function() {
  return this.revokedAt !== null;
});

refreshTokenSchema.virtual('isValid').get(function() {
  return !this.isExpired && !this.isRevoked;
});

// ============================================================
// MÉTHODES D'INSTANCE
// ============================================================

refreshTokenSchema.methods.revoke = async function() {
  console.log('RefreshToken.js ▶ revoke() called');
  this.revokedAt = new Date();
  await this.save();
  return this;
};

// ============================================================
// MÉTHODES STATIQUES
// ============================================================

refreshTokenSchema.statics.createToken = async function(userId, options = {}) {
  console.log('RefreshToken.js ▶ createToken() called');

  const {
    expiresIn = 7 * 24 * 60 * 60 * 1000, // 7 jours par défaut
    userAgent = null,
    ip = null,
    deviceId = null,
  } = options;

  // Générer un token sécurisé
  const crypto = require('crypto');
  const tokenBuffer = crypto.randomBytes(32);
  const token = tokenBuffer.toString('hex');

  const expiresAt = new Date(Date.now() + expiresIn);

  const refreshToken = new this({
    token,
    userId,
    expiresAt,
    userAgent,
    ip,
    deviceId,
  });

  await refreshToken.save();
  return refreshToken;
};

refreshTokenSchema.statics.findValidToken = async function(token) {
  console.log('RefreshToken.js ▶ findValidToken() called');

  return this.findOne({
    token,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate('userId', 'id email phone firstName lastName role');
};

refreshTokenSchema.statics.revokeToken = async function(token) {
  console.log('RefreshToken.js ▶ revokeToken() called');

  const refreshToken = await this.findOne({ token });

  if (!refreshToken) {
    throw new Error('Token not found');
  }

  await refreshToken.revoke();
  return refreshToken;
};

refreshTokenSchema.statics.revokeAllUserTokens = async function(userId) {
  console.log('RefreshToken.js ▶ revokeAllUserTokens() called');

  const result = await this.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );

  return result.modifiedCount;
};

refreshTokenSchema.statics.getUserActiveTokens = async function(userId) {
  console.log('RefreshToken.js ▶ getUserActiveTokens() called');

  return this.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

refreshTokenSchema.statics.cleanExpiredTokens = async function() {
  console.log('RefreshToken.js ▶ cleanExpiredTokens() called');

  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return result.deletedCount;
};

// ============================================================
// PRE-SAVE
// ============================================================

refreshTokenSchema.pre('save', function(next) {
  // Générer le token si non présent
  if (!this.token) {
    const crypto = require('crypto');
    this.token = crypto.randomBytes(32).toString('hex');
  }

  // Définir l'expiration si non définie
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
  }

  next();
});

// ============================================================
// EXPORT
// ============================================================

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
console.log('RefreshToken.js ▶ RefreshToken schema initialized');

module.exports = RefreshToken;
