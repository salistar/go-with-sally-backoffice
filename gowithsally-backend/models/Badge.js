/**
 * ============================================================================
 * GO WITH SALLY - BADGE MODEL
 * ============================================================================
 * Modèle MongoDB pour les badges des conductrices
 * 
 * @module models/Badge
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  // Référence à l'utilisateur
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Niveau du badge
  level: {
    type: String,
    enum: ['none', 'basic', 'verified', 'premium', 'elite'],
    default: 'none',
    index: true,
  },
  
  // Icône et couleur
  icon: {
    type: String,
    default: '⚪',
  },
  color: {
    type: String,
    default: '#9CA3AF',
  },
  
  // Bonus sur les gains
  earningsBonus: {
    type: Number,
    default: 0,
    min: 0,
    max: 0.5, // Max 50% bonus
  },
  
  // Avantages
  benefits: [{
    type: String,
  }],
  
  // Date d'obtention
  earnedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Historique des badges
  history: [{
    level: {
      type: String,
      enum: ['none', 'basic', 'verified', 'premium', 'elite'],
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    reason: String,
  }],
  
  // Progression vers le prochain niveau
  progress: {
    nextLevel: {
      type: String,
      enum: ['none', 'basic', 'verified', 'premium', 'elite', null],
    },
    percentage: {
      type: Number,
      default: 0,
    },
    missingRequirements: [{
      type: { type: String },
      label: String,
      current: mongoose.Schema.Types.Mixed,
      required: mongoose.Schema.Types.Mixed,
    }],
  },
  
  // Stats
  stats: {
    ridesAtEarning: Number,
    ratingAtEarning: Number,
    documentsAtEarning: Number,
  },
  
}, {
  timestamps: true,
});

// ============================================================================
// INDEX
// ============================================================================

badgeSchema.index({ level: 1, earnedAt: -1 });
badgeSchema.index({ userId: 1, level: 1 });

// ============================================================================
// MÉTHODES D'INSTANCE
// ============================================================================

/**
 * Vérifier si le badge donne accès à un service
 */
badgeSchema.methods.canAccessService = function(serviceType) {
  const serviceRequirements = {
    sally_eco: 'basic',
    sally_standard: 'basic',
    sally_confort: 'premium',
    sally_pool: 'basic',
  };
  
  const levels = ['none', 'basic', 'verified', 'premium', 'elite'];
  const userLevel = levels.indexOf(this.level);
  const requiredLevel = levels.indexOf(serviceRequirements[serviceType] || 'basic');
  
  return userLevel >= requiredLevel;
};

/**
 * Obtenir le bonus en pourcentage
 */
badgeSchema.methods.getBonusPercentage = function() {
  return Math.round(this.earningsBonus * 100);
};

// ============================================================================
// MÉTHODES STATIQUES
// ============================================================================

/**
 * Obtenir ou créer un badge pour un utilisateur
 */
badgeSchema.statics.getOrCreate = async function(userId) {
  let badge = await this.findOne({ userId });
  
  if (!badge) {
    badge = await this.create({ userId });
  }
  
  return badge;
};

/**
 * Mettre à jour le badge d'un utilisateur
 */
badgeSchema.statics.updateLevel = async function(userId, newLevel, config) {
  const badge = await this.getOrCreate(userId);
  
  // Ajouter à l'historique si le niveau change
  if (badge.level !== newLevel) {
    badge.history.push({
      level: newLevel,
      earnedAt: new Date(),
      reason: `Upgraded from ${badge.level} to ${newLevel}`,
    });
  }
  
  badge.level = newLevel;
  badge.icon = config.icon;
  badge.color = config.color;
  badge.earningsBonus = config.earningsBonus;
  badge.benefits = config.benefits;
  badge.earnedAt = new Date();
  
  await badge.save();
  return badge;
};

/**
 * Obtenir les stats des badges
 */
badgeSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
      },
    },
  ]);
  
  return stats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

// ============================================================================
// EXPORT
// ============================================================================

const Badge = mongoose.model('Badge', badgeSchema);

module.exports = Badge;