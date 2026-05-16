/**
 * ============================================================================
 * GO WITH SALLY - PRICE PROPOSAL MODEL
 * ============================================================================
 * Modèle MongoDB pour les propositions de prix
 * 
 * @module models/PriceProposal
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const priceProposalSchema = new mongoose.Schema({
  // Références
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    index: true,
  },
  
  // Localisation
  pickup: {
    name: String,
    address: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  destination: {
    name: String,
    address: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  
  // Distance et durée estimées
  estimatedDistance: {
    type: Number,
    required: true, // en km
  },
  estimatedDuration: {
    type: Number,
    required: true, // en minutes
  },
  
  // Type de service
  serviceType: {
    type: String,
    enum: ['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'],
    required: true,
    index: true,
  },
  
  // Prix
  suggestedPrice: {
    type: Number,
    required: true,
  },
  minPrice: {
    type: Number,
    required: true,
  },
  maxPrice: {
    type: Number,
    required: true,
  },
  proposedPrice: {
    type: Number,
    required: true,
  },
  
  // Ratio prix proposé / suggéré
  priceRatio: {
    type: Number,
  },
  
  // Likelihood
  acceptanceLikelihood: {
    level: {
      type: String,
      enum: ['very_high', 'high', 'medium', 'low'],
    },
    percentage: Number,
    estimatedMinutes: Number,
  },
  
  // Surge info
  surgeInfo: {
    isActive: Boolean,
    multiplier: Number,
    reason: String,
  },
  
  // Statut
  status: {
    type: String,
    enum: ['pending', 'searching', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Conductrice qui a accepté
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  acceptedAt: Date,
  
  // Historique des refus
  rejectedBy: [{
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: String,
    rejectedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Méthode de paiement souhaitée
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'any'],
    default: 'any',
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  
  // Mode simulation
  isSimulated: {
    type: Boolean,
    default: false,
  },
  
}, {
  timestamps: true,
});

// ============================================================================
// INDEX
// ============================================================================

priceProposalSchema.index({ userId: 1, status: 1, createdAt: -1 });
priceProposalSchema.index({ status: 1, expiresAt: 1 });
priceProposalSchema.index({ serviceType: 1, status: 1 });
priceProposalSchema.index({ 'pickup.latitude': 1, 'pickup.longitude': 1 });

// ============================================================================
// VIRTUALS
// ============================================================================

priceProposalSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

priceProposalSchema.virtual('priceDifference').get(function() {
  return this.proposedPrice - this.suggestedPrice;
});

priceProposalSchema.virtual('priceDifferencePercent').get(function() {
  return Math.round((this.proposedPrice / this.suggestedPrice - 1) * 100);
});

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

priceProposalSchema.pre('save', function(next) {
  // Calculer le ratio
  if (this.suggestedPrice > 0) {
    this.priceRatio = Math.round((this.proposedPrice / this.suggestedPrice) * 100) / 100;
  }
  
  // Définir l'expiration si non définie (5 minutes par défaut)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  }
  
  next();
});

// ============================================================================
// MÉTHODES D'INSTANCE
// ============================================================================

/**
 * Marquer comme accepté
 */
priceProposalSchema.methods.accept = async function(driverId) {
  this.status = 'accepted';
  this.acceptedBy = driverId;
  this.acceptedAt = new Date();
  await this.save();
  return this;
};

/**
 * Marquer comme rejeté par une conductrice
 */
priceProposalSchema.methods.rejectBy = async function(driverId, reason = '') {
  this.rejectedBy.push({
    driverId,
    reason,
    rejectedAt: new Date(),
  });
  await this.save();
  return this;
};

/**
 * Annuler
 */
priceProposalSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  await this.save();
  return this;
};

/**
 * Vérifier et marquer comme expiré si nécessaire
 */
priceProposalSchema.methods.checkExpiration = async function() {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
    await this.save();
    return true;
  }
  return false;
};

// ============================================================================
// MÉTHODES STATIQUES
// ============================================================================

/**
 * Créer une nouvelle proposition
 */
priceProposalSchema.statics.createProposal = async function(data) {
  const proposal = new this({
    ...data,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
  
  await proposal.save();
  return proposal;
};

/**
 * Obtenir les propositions actives pour une zone
 */
priceProposalSchema.statics.getActiveInArea = async function(lat, lng, radiusKm = 5, serviceType = null) {
  const earthRadiusKm = 6371;
  const latDelta = (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos(lat * Math.PI / 180);
  
  const query = {
    status: 'pending',
    expiresAt: { $gt: new Date() },
    'pickup.latitude': { $gte: lat - latDelta, $lte: lat + latDelta },
    'pickup.longitude': { $gte: lng - lngDelta, $lte: lng + lngDelta },
  };
  
  if (serviceType) {
    query.serviceType = serviceType;
  }
  
  return this.find(query)
    .populate('userId', 'firstName lastName rating')
    .sort({ proposedPrice: -1, createdAt: 1 });
};

/**
 * Obtenir les propositions d'un utilisateur
 */
priceProposalSchema.statics.getUserProposals = async function(userId, status = null, limit = 20) {
  const query = { userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('acceptedBy', 'firstName lastName avatar rating vehicle');
};

/**
 * Nettoyer les propositions expirées
 */
priceProposalSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    {
      status: 'expired',
    }
  );
  
  return result.modifiedCount;
};

/**
 * Obtenir les stats de pricing
 */
priceProposalSchema.statics.getPricingStats = async function(serviceType = null, days = 30) {
  const matchStage = {
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    status: { $in: ['accepted', 'rejected', 'expired'] },
  };
  
  if (serviceType) {
    matchStage.serviceType = serviceType;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$serviceType',
        totalProposals: { $sum: 1 },
        acceptedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
        },
        avgProposedPrice: { $avg: '$proposedPrice' },
        avgSuggestedPrice: { $avg: '$suggestedPrice' },
        avgPriceRatio: { $avg: '$priceRatio' },
        avgAcceptedRatio: {
          $avg: {
            $cond: [{ $eq: ['$status', 'accepted'] }, '$priceRatio', null],
          },
        },
      },
    },
  ]);
  
  return stats;
};

// ============================================================================
// EXPORT
// ============================================================================

const PriceProposal = mongoose.model('PriceProposal', priceProposalSchema);

module.exports = PriceProposal;