/**
 * ============================================================================
 * GO WITH SALLY - CLAIM MODEL
 * ============================================================================
 * Modèle pour les réclamations et les problèmes signalés
 * par les utilisatrices et les conductrices
 * ============================================================================
 */

console.log('[Claim.js] Fichier chargé');

const mongoose = require('mongoose');

console.log('[Claim.js] Dépendances importées');

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const claimSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTIFIANT
  // ─────────────────────────────────────────────────────────────────────────
  claimNumber: {
    type: String,
    unique: true,
    index: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PARTICIPANTS
  // ─────────────────────────────────────────────────────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisatrice est requise']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: [true, 'La course est requise']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TYPE DE RÉCLAMATION
  // ─────────────────────────────────────────────────────────────────────────
  type: {
    type: String,
    enum: [
      'service_quality',     // Qualité du service
      'safety',              // Sécurité
      'payment',             // Problème de paiement
      'driver_behavior',     // Comportement du chauffeur
      'app_issue',           // Problème technique
      'vehicle_condition',   // État du véhicule
      'missing_item',        // Objet oublié
      'other'                // Autre
    ],
    required: [true, 'Le type est requis']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DESCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  description: {
    type: String,
    required: [true, 'La description est requise'],
    maxlength: [1000, 'Maximum 1000 caractères']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PREUVES / DOCUMENTS
  // ─────────────────────────────────────────────────────────────────────────
  attachments: [{
    type: String,           // URL de l'image/document
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ─────────────────────────────────────────────────────────────────────────
  // STATUT ET PRIORITÉ
  // ─────────────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GESTION ADMINISTRATIVE
  // ─────────────────────────────────────────────────────────────────────────
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // Admin ou sub-admin assigné
  },

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

  adminNotes: {
    type: String,
    maxlength: [1000, 'Maximum 1000 caractères']
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RÉSOLUTION
  // ─────────────────────────────────────────────────────────────────────────
  resolution: {
    description: String,
    type: {
      type: String,
      enum: ['refund', 'credit', 'compensation', 'warning', 'suspension', 'no_action'],
      default: null
    },
    amount: Number,           // Montant du remboursement/crédit
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    executedAt: Date
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'driver', 'admin'],
      required: true
    },
    senderId: mongoose.Schema.Types.ObjectId,
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
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
  },
  resolvedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

console.log('[Claim.js] Schema défini');

// ============================================================================
// INDEXES
// ============================================================================

claimSchema.index({ user: 1, status: 1 });
claimSchema.index({ driver: 1, status: 1 });
claimSchema.index({ ride: 1 });
claimSchema.index({ status: 1, priority: 1 });
claimSchema.index({ region: 1, status: 1 });
claimSchema.index({ assignedTo: 1, status: 1 });
claimSchema.index({ createdAt: -1 });

console.log('[Claim.js] Indexes configurés');

// ============================================================================
// VIRTUALS
// ============================================================================

claimSchema.virtual('isResolved').get(function() {
  console.log('[Claim.js] Virtual isResolved appelé');
  return ['resolved', 'dismissed'].includes(this.status);
});

claimSchema.virtual('daysOpen').get(function() {
  console.log('[Claim.js] Virtual daysOpen appelé');
  const now = new Date();
  const createdDate = new Date(this.createdAt);
  return Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
});

console.log('[Claim.js] Virtuals configurés');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Génère le numéro de réclamation
 */
claimSchema.pre('save', async function(next) {
  console.log('[Claim.js] Pre-save middleware - Début');

  if (!this.claimNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.claimNumber = `CLM${timestamp}${random}`;
    console.log('[Claim.js] Pre-save - Numéro généré:', this.claimNumber);
  }

  next();
});

console.log('[Claim.js] Middleware configuré');

// ============================================================================
// METHODS
// ============================================================================

/**
 * Ajoute un message à la réclamation
 */
claimSchema.methods.addMessage = function(sender, senderId, message) {
  console.log('[Claim.js] addMessage appelé');

  this.messages.push({
    sender,
    senderId,
    message,
    timestamp: new Date()
  });

  return this.save();
};

/**
 * Assigne la réclamation à un admin
 */
claimSchema.methods.assignTo = function(adminId) {
  console.log('[Claim.js] assignTo appelé, adminId:', adminId);

  this.assignedTo = adminId;
  this.status = 'investigating';

  return this.save();
};

/**
 * Résout la réclamation
 */
claimSchema.methods.resolve = async function(resolution, adminId) {
  console.log('[Claim.js] resolve appelé');

  this.resolution = {
    ...resolution,
    approvedBy: adminId,
    approvedAt: new Date()
  };

  this.status = 'resolved';
  this.resolvedAt = new Date();

  return this.save();
};

/**
 * Rejette la réclamation
 */
claimSchema.methods.dismiss = async function(adminId) {
  console.log('[Claim.js] dismiss appelé');

  this.status = 'dismissed';
  this.resolution = {
    type: 'no_action',
    approvedBy: adminId,
    approvedAt: new Date()
  };
  this.resolvedAt = new Date();

  return this.save();
};

console.log('[Claim.js] Methods configurées');

// ============================================================================
// STATICS
// ============================================================================

/**
 * Obtient les réclamations par statut
 */
claimSchema.statics.getByStatus = async function(status) {
  console.log('[Claim.js] Static getByStatus appelé');

  return this.find({ status })
    .populate('user', 'firstName lastName email phone')
    .populate('driver', 'user')
    .populate('ride', 'rideNumber')
    .sort({ priority: 1, createdAt: 1 });
};

/**
 * Obtient les réclamations en attente
 */
claimSchema.statics.getPending = async function() {
  console.log('[Claim.js] Static getPending appelé');

  return this.find({ status: 'pending' })
    .populate('user', 'firstName lastName email phone')
    .populate('ride', 'rideNumber')
    .sort({ priority: 1, createdAt: 1 });
};

/**
 * Obtient les réclamations critiques
 */
claimSchema.statics.getCritical = async function() {
  console.log('[Claim.js] Static getCritical appelé');

  return this.find({ priority: 'critical', status: { $ne: 'resolved' } })
    .populate('user', 'firstName lastName email')
    .populate('driver', 'user')
    .sort({ createdAt: 1 });
};

console.log('[Claim.js] Statics configurées');

// ============================================================================
// EXPORT
// ============================================================================

const Claim = mongoose.model('Claim', claimSchema);

console.log('[Claim.js] Modèle Claim créé et exporté');

module.exports = Claim;
