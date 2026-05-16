/**
 * ============================================================================
 * GO WITH SALLY - AFFILIATION MODEL
 * ============================================================================
 * Modèle pour les programmes d'affiliation et de parrainage
 * Gère les ambassadeurs, influenceurs et partenaires
 * ============================================================================
 */

console.log('[Affiliation.js] Fichier chargé');

const mongoose = require('mongoose');

console.log('[Affiliation.js] Dépendances importées');

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const affiliationSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────────────────────
  // UTILISATEUR AFFILIÉ
  // ─────────────────────────────────────────────────────────────────────────
  affiliateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur affilié est requis'],
    unique: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CODE D'AFFILIATION
  // ─────────────────────────────────────────────────────────────────────────
  code: {
    type: String,
    unique: true,
    required: [true, 'Le code d\'affiliation est requis'],
    uppercase: true,
    index: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TYPE D'AFFILIATION
  // ─────────────────────────────────────────────────────────────────────────
  type: {
    type: String,
    enum: ['ambassador', 'influencer', 'partner'],
    required: [true, 'Le type d\'affiliation est requis']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMMISSION ET RÉMUNÉRATION
  // ─────────────────────────────────────────────────────────────────────────
  commissionRate: {
    type: Number,
    min: [0, 'Commission minimum 0%'],
    max: [100, 'Commission maximum 100%'],
    required: [true, 'Le taux de commission est requis'],
    default: 10  // 10% par défaut
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────────────────────────
  totalReferrals: {
    type: Number,
    default: 0,
    index: true
  },

  successfulReferrals: {
    type: Number,
    default: 0  // Parrainages qui ont complété au moins 1 course
  },

  totalRides: {
    type: Number,
    default: 0
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  pendingEarnings: {
    type: Number,
    default: 0
  },

  paidEarnings: {
    type: Number,
    default: 0
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STATUT
  // ─────────────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'active',
    index: true
  },

  suspensionReason: String,

  // ─────────────────────────────────────────────────────────────────────────
  // RÉGION
  // ─────────────────────────────────────────────────────────────────────────
  region: {
    type: String,
    enum: [
      'casablanca-settat',
      'rabat-sale-kenitra',
      'marrakech-safi',
      'fes-meknes',
      'tanger-tetouan',
      'souss-massa',
      'oriental',
      'draa-tafilalet',
      'beni-mellal-khenifra',
      'laayoune-sakia',
      'dakhla-oued',
      'guelmim-oued'
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRÉATION ET GESTION
  // ─────────────────────────────────────────────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // Admin qui a créé l'affiliation
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: Date,

  // ─────────────────────────────────────────────────────────────────────────
  // DÉTAILS SUPPLÉMENTAIRES
  // ─────────────────────────────────────────────────────────────────────────
  description: {
    type: String,
    maxlength: [500, 'Maximum 500 caractères']
  },

  socialLinks: {
    instagram: String,
    facebook: String,
    twitter: String,
    tiktok: String,
    linkedin: String,
    website: String
  },

  followerCount: {
    type: Number,
    default: 0
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REFERRALS (Parrainages effectués)
  // ─────────────────────────────────────────────────────────────────────────
  referrals: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    referralCode: String,
    referralDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    commissionEarned: {
      type: Number,
      default: 0
    },
    completedAt: Date
  }],

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIQUE DES PAIEMENTS
  // ─────────────────────────────────────────────────────────────────────────
  payments: [{
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    method: String,
    reference: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date
  }],

  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────────────────────────────────────
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

console.log('[Affiliation.js] Schema défini');

// ============================================================================
// INDEXES
// ============================================================================

affiliationSchema.index({ code: 1 });
affiliationSchema.index({ affiliateUser: 1 });
affiliationSchema.index({ status: 1 });
affiliationSchema.index({ type: 1 });
affiliationSchema.index({ region: 1 });
affiliationSchema.index({ totalEarnings: -1 });
affiliationSchema.index({ createdAt: -1 });

console.log('[Affiliation.js] Indexes configurés');

// ============================================================================
// VIRTUALS
// ============================================================================

affiliationSchema.virtual('conversionRate').get(function() {
  console.log('[Affiliation.js] Virtual conversionRate appelé');
  if (this.totalReferrals === 0) return 0;
  return Math.round((this.successfulReferrals / this.totalReferrals) * 100);
});

affiliationSchema.virtual('averageCommissionPerReferral').get(function() {
  console.log('[Affiliation.js] Virtual averageCommissionPerReferral appelé');
  if (this.successfulReferrals === 0) return 0;
  return Math.round(this.totalEarnings / this.successfulReferrals * 100) / 100;
});

affiliationSchema.virtual('isActive').get(function() {
  console.log('[Affiliation.js] Virtual isActive appelé');
  return this.status === 'active';
});

console.log('[Affiliation.js] Virtuals configurés');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Génère le code d'affiliation
 */
affiliationSchema.pre('save', async function(next) {
  console.log('[Affiliation.js] Pre-save middleware - Début');

  if (!this.code) {
    // Générer un code unique à partir du nom d'utilisateur
    const user = await mongoose.model('User').findById(this.affiliateUser);
    if (user) {
      const base = `${user.firstName.substring(0, 3).toUpperCase()}${user.lastName.substring(0, 3).toUpperCase()}`;
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.code = `${base}${random}`;
      console.log('[Affiliation.js] Pre-save - Code généré:', this.code);
    }
  }

  this.updatedAt = new Date();
  next();
});

console.log('[Affiliation.js] Middleware configuré');

// ============================================================================
// METHODS
// ============================================================================

/**
 * Ajoute un parrainage
 */
affiliationSchema.methods.addReferral = function(userId, referralCode) {
  console.log('[Affiliation.js] addReferral appelé, userId:', userId);

  this.referrals.push({
    userId,
    referralCode,
    status: 'pending'
  });

  this.totalReferrals += 1;

  return this.save();
};

/**
 * Marque un parrainage comme complété
 */
affiliationSchema.methods.completeReferral = function(referralId, commission) {
  console.log('[Affiliation.js] completeReferral appelé');

  const referral = this.referrals.find(r => r._id.toString() === referralId);

  if (referral) {
    referral.status = 'completed';
    referral.completedAt = new Date();
    referral.commissionEarned = commission;

    this.successfulReferrals += 1;
    this.totalEarnings += commission;
    this.pendingEarnings += commission;

    console.log('[Affiliation.js] Parrainage complété, commission:', commission);
  }

  return this.save();
};

/**
 * Enregistre un paiement
 */
affiliationSchema.methods.recordPayment = function(amount, status = 'pending', method = 'bank_transfer') {
  console.log('[Affiliation.js] recordPayment appelé, montant:', amount);

  const reference = 'AFF' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();

  this.payments.push({
    amount,
    status,
    method,
    reference,
    requestedAt: new Date()
  });

  if (status === 'completed') {
    this.pendingEarnings -= amount;
    this.paidEarnings += amount;
  }

  return this.save();
};

/**
 * Suspend l'affiliation
 */
affiliationSchema.methods.suspend = function(reason) {
  console.log('[Affiliation.js] suspend appelé, reason:', reason);

  this.status = 'suspended';
  this.suspensionReason = reason;

  return this.save();
};

/**
 * Réactive l'affiliation
 */
affiliationSchema.methods.reactivate = function() {
  console.log('[Affiliation.js] reactivate appelé');

  this.status = 'active';
  this.suspensionReason = null;

  return this.save();
};

console.log('[Affiliation.js] Methods configurées');

// ============================================================================
// STATICS
// ============================================================================

/**
 * Trouve une affiliation par code
 */
affiliationSchema.statics.findByCode = async function(code) {
  console.log('[Affiliation.js] Static findByCode appelé');
  return this.findOne({ code: code.toUpperCase() })
    .populate('affiliateUser', 'firstName lastName email');
};

/**
 * Obtient les affiliations actives
 */
affiliationSchema.statics.getActive = async function() {
  console.log('[Affiliation.js] Static getActive appelé');
  return this.find({ status: 'active' })
    .populate('affiliateUser', 'firstName lastName email')
    .sort({ totalEarnings: -1 });
};

/**
 * Obtient les top affiliés
 */
affiliationSchema.statics.getTopAffiliates = async function(limit = 10) {
  console.log('[Affiliation.js] Static getTopAffiliates appelé');
  return this.find({ status: 'active' })
    .populate('affiliateUser', 'firstName lastName avatar')
    .sort({ totalEarnings: -1 })
    .limit(limit);
};

/**
 * Obtient les affiliations par région
 */
affiliationSchema.statics.getByRegion = async function(region) {
  console.log('[Affiliation.js] Static getByRegion appelé');
  return this.find({ region, status: 'active' })
    .populate('affiliateUser', 'firstName lastName email')
    .sort({ totalEarnings: -1 });
};

console.log('[Affiliation.js] Statics configurées');

// ============================================================================
// EXPORT
// ============================================================================

const Affiliation = mongoose.model('Affiliation', affiliationSchema);

console.log('[Affiliation.js] Modèle Affiliation créé et exporté');

module.exports = Affiliation;
