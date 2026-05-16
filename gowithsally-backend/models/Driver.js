/**
 * ============================================================================
 * GO WITH SALLY - DRIVER MODEL
 * ============================================================================
 * Modèle Mongoose pour les conductrices de l'application
 * Gère les documents, véhicules, gains et statistiques
 * ============================================================================
 */

console.log('📄 [Driver.js] Fichier chargé');

const mongoose = require('mongoose');

console.log('📄 [Driver.js] Dépendances importées');

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const driverSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────────────────────
  // LIEN VERS L'UTILISATEUR
  // ─────────────────────────────────────────────────────────────────────────
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'L\'utilisateur est requis'],
    unique: true 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUT D'INSCRIPTION
  // ─────────────────────────────────────────────────────────────────────────
  status: { 
    type: String, 
    enum: ['pending_documents', 'pending_verification', 'under_review', 'approved', 'suspended', 'rejected'],
    default: 'pending_documents'
  },
  statusReason: { type: String }, // Raison du statut (ex: "Documents expirés")
  statusUpdatedAt: { type: Date }, // Date du dernier changement de statut
  
  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENTS OFFICIELS
  // ─────────────────────────────────────────────────────────────────────────
  documents: {
    // Carte d'identité nationale
    nationalId: {
      front: { type: String }, // URL image recto
      back: { type: String }, // URL image verso
      number: { type: String }, // Numéro CIN
      expiryDate: { type: Date }, // Date d'expiration
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    // Permis de conduire
    drivingLicense: {
      front: { type: String },
      back: { type: String },
      number: { type: String },
      category: { type: String }, // B, C, D, etc.
      expiryDate: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    // Fiche anthropométrique
    anthropometricRecord: {
      file: { type: String },
      issueDate: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    // Photo de profil
    profilePhoto: {
      url: { type: String },
      faceDescriptor: { type: [Number], default: [] }, // Pour la reconnaissance faciale
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // INFORMATIONS VÉHICULE
  // ─────────────────────────────────────────────────────────────────────────
  vehicle: {
    brand: { 
      type: String, 
      required: [true, 'La marque du véhicule est requise']
    },
    model: { 
      type: String, 
      required: [true, 'Le modèle du véhicule est requis']
    },
    year: { 
      type: Number, 
      required: [true, 'L\'année du véhicule est requise'],
      min: [2010, 'Le véhicule doit être de 2010 ou plus récent']
    },
    color: { 
      type: String, 
      required: [true, 'La couleur du véhicule est requise']
    },
    plateNumber: { 
      type: String, 
      required: [true, 'Le numéro de plaque est requis'],
      unique: true 
    },
    seats: { 
      type: Number, 
      default: 4, 
      min: [2, 'Minimum 2 places'],
      max: [8, 'Maximum 8 places']
    },
    type: { 
      type: String, 
      enum: ['standard', 'comfort', 'premium'], 
      default: 'standard' 
    },
    hasAC: { type: Boolean, default: true }, // Climatisation
    // Photos du véhicule
    photos: {
      front: { type: String },
      back: { type: String },
      left: { type: String },
      right: { type: String },
      interior: { type: String }
    },
    // Carte grise
    registration: {
      file: { type: String },
      expiryDate: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date }
    },
    // Assurance
    insurance: {
      company: { type: String },
      policyNumber: { type: String },
      file: { type: String },
      expiryDate: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date }
    },
    // Visite technique
    technicalInspection: {
      file: { type: String },
      expiryDate: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date }
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUT EN TEMPS RÉEL
  // ─────────────────────────────────────────────────────────────────────────
  isOnline: { type: Boolean, default: false }, // Connectée à l'app
  isAvailable: { type: Boolean, default: false }, // Disponible pour courses
  currentRide: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ride',
    default: null
  },
  lastOnlineAt: { type: Date }, // Dernière connexion
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOCALISATION ACTUELLE (pour requêtes géospatiales)
  // ─────────────────────────────────────────────────────────────────────────
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    heading: { type: Number, default: 0 }, // Direction en degrés (0-360)
    speed: { type: Number, default: 0 }, // Vitesse en km/h
    accuracy: { type: Number }, // Précision GPS en mètres
    updatedAt: { type: Date }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────────────────────────
  stats: {
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, // En kilomètres
    totalHours: { type: Number, default: 0 }, // Heures de conduite
    averageRating: { type: Number, default: 5, min: 1, max: 5 },
    totalRatings: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 100, min: 0, max: 100 }, // Taux d'acceptation %
    responseTime: { type: Number, default: 0 } // Temps de réponse moyen en secondes
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // GAINS
  // ─────────────────────────────────────────────────────────────────────────
  earnings: {
    today: { type: Number, default: 0 },
    week: { type: Number, default: 0 },
    month: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 }, // Disponible pour retrait
    pending: { type: Number, default: 0 }, // En attente de validation
    withdrawn: { type: Number, default: 0 } // Total retiré
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // COORDONNÉES BANCAIRES (pour retraits)
  // ─────────────────────────────────────────────────────────────────────────
  bankDetails: {
    rib: { type: String }, // Relevé d'identité bancaire
    bankName: { type: String },
    accountHolder: { type: String }, // Titulaire du compte
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMMISSION
  // ─────────────────────────────────────────────────────────────────────────
  commissionRate: { 
    type: Number, 
    default: 0.15, // 15% par défaut
    min: [0, 'Commission minimum 0%'],
    max: [0.5, 'Commission maximum 50%']
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // HORAIRES DE TRAVAIL
  // ─────────────────────────────────────────────────────────────────────────
  workingHours: {
    monday: { 
      start: { type: String, default: '08:00' }, 
      end: { type: String, default: '20:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    tuesday: { 
      start: { type: String, default: '08:00' }, 
      end: { type: String, default: '20:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    wednesday: { 
      start: { type: String, default: '08:00' }, 
      end: { type: String, default: '20:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    thursday: { 
      start: { type: String, default: '08:00' }, 
      end: { type: String, default: '20:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    friday: { 
      start: { type: String, default: '08:00' }, 
      end: { type: String, default: '20:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    saturday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '18:00' }, 
      enabled: { type: Boolean, default: true } 
    },
    sunday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '18:00' }, 
      enabled: { type: Boolean, default: false } 
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ZONES PRÉFÉRÉES
  // ─────────────────────────────────────────────────────────────────────────
  preferredAreas: [{
    name: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    radius: { type: Number, default: 5000 } // Rayon en mètres
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIQUE DES ÉVALUATIONS
  // ─────────────────────────────────────────────────────────────────────────
  ratings: [{
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String },
    tags: [{ type: String }], // Tags: "Ponctuelle", "Conduite douce", etc.
    createdAt: { type: Date, default: Date.now }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIQUE DES RETRAITS
  // ─────────────────────────────────────────────────────────────────────────
  withdrawals: [{
    amount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    method: { type: String, default: 'bank_transfer' },
    reference: { type: String },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date }
  }]
  
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

console.log('📄 [Driver.js] Schema défini');

// ============================================================================
// INDEXES
// ============================================================================

// Index géospatial pour trouver les conductrices proches
driverSchema.index({ currentLocation: '2dsphere' });

// Index composé pour les requêtes de disponibilité
driverSchema.index({ isOnline: 1, isAvailable: 1, status: 1 });

// Index pour la plaque d'immatriculation
driverSchema.index({ 'vehicle.plateNumber': 1 });

// Index pour le lien utilisateur
driverSchema.index({ user: 1 });

// Index pour les statistiques
driverSchema.index({ 'stats.averageRating': -1, 'stats.completedRides': -1 });

console.log('📄 [Driver.js] Indexes configurés');

// ============================================================================
// VIRTUALS (Propriétés calculées)
// ============================================================================

/**
 * Vérifie si la conductrice est approuvée
 */
driverSchema.virtual('isApproved').get(function() {
  console.log('📄 [Driver.js] Virtual isApproved appelé');
  return this.status === 'approved';
});

/**
 * Vérifie si tous les documents sont validés
 */
driverSchema.virtual('documentsComplete').get(function() {
  console.log('📄 [Driver.js] Virtual documentsComplete appelé');
  return (
    this.documents.nationalId.verified &&
    this.documents.drivingLicense.verified &&
    this.documents.profilePhoto.verified &&
    this.vehicle.registration.verified &&
    this.vehicle.insurance.verified
  );
});

/**
 * Calcule le taux de complétion des documents
 */
driverSchema.virtual('documentsProgress').get(function() {
  console.log('📄 [Driver.js] Virtual documentsProgress appelé');
  
  const documents = [
    this.documents.nationalId.verified,
    this.documents.drivingLicense.verified,
    this.documents.anthropometricRecord.verified,
    this.documents.profilePhoto.verified,
    this.vehicle.registration.verified,
    this.vehicle.insurance.verified,
    this.vehicle.technicalInspection.verified
  ];
  
  const verified = documents.filter(Boolean).length;
  const total = documents.length;
  
  return Math.round((verified / total) * 100);
});

/**
 * Nom complet du véhicule
 */
driverSchema.virtual('vehicleName').get(function() {
  console.log('📄 [Driver.js] Virtual vehicleName appelé');
  return `${this.vehicle.brand} ${this.vehicle.model} ${this.vehicle.year}`;
});

/**
 * Vérifie si la conductrice peut accepter des courses
 */
driverSchema.virtual('canAcceptRides').get(function() {
  console.log('📄 [Driver.js] Virtual canAcceptRides appelé');
  return this.status === 'approved' && this.isOnline && this.isAvailable && !this.currentRide;
});

/**
 * Montant total gagné (calculé)
 */
driverSchema.virtual('totalEarned').get(function() {
  console.log('📄 [Driver.js] Virtual totalEarned appelé');
  return this.earnings.total;
});

console.log('📄 [Driver.js] Virtuals configurés');

// ============================================================================
// MIDDLEWARE (Pre/Post hooks)
// ============================================================================

/**
 * Met à jour lastOnlineAt quand isOnline change
 */
driverSchema.pre('save', function(next) {
  console.log('📄 [Driver.js] Pre-save middleware - Début');
  
  if (this.isModified('isOnline') && this.isOnline) {
    this.lastOnlineAt = new Date();
    console.log('📄 [Driver.js] Pre-save - lastOnlineAt mis à jour');
  }
  
  if (this.isModified('status')) {
    this.statusUpdatedAt = new Date();
    console.log('📄 [Driver.js] Pre-save - statusUpdatedAt mis à jour');
  }
  
  next();
});

/**
 * Log après la sauvegarde
 */
driverSchema.post('save', function(doc) {
  console.log('📄 [Driver.js] Post-save - Driver sauvegardé, status:', doc.status);
});

console.log('📄 [Driver.js] Middleware configurés');

// ============================================================================
// STATICS (Méthodes de classe)
// ============================================================================

/**
 * Trouve les conductrices disponibles à proximité
 * @param {Array} coordinates - [longitude, latitude]
 * @param {number} maxDistance - Distance max en mètres (défaut: 10000)
 * @returns {Promise<Array>} - Liste des conductrices proches
 */
driverSchema.statics.findNearbyAvailable = async function(coordinates, maxDistance = 10000) {
  console.log('📄 [Driver.js] Static findNearbyAvailable appelé');
  console.log('📄 [Driver.js] Coordinates:', coordinates);
  console.log('📄 [Driver.js] Max distance:', maxDistance, 'm');
  
  try {
    const drivers = await this.find({
      isOnline: true,
      isAvailable: true,
      status: 'approved',
      currentLocation: {
        $near: {
          $geometry: { 
            type: 'Point', 
            coordinates: coordinates // [longitude, latitude]
          },
          $maxDistance: maxDistance // En mètres
        }
      }
    })
    .populate('user', 'firstName lastName avatar phone stats')
    .limit(20);
    
    console.log('📄 [Driver.js] findNearbyAvailable - Trouvées:', drivers.length);
    return drivers;
  } catch (error) {
    console.log('📄 [Driver.js] findNearbyAvailable - Erreur:', error.message);
    throw error;
  }
};

/**
 * Obtient les meilleures conductrices par note
 * @param {number} limit - Nombre max de résultats (défaut: 10)
 * @returns {Promise<Array>} - Liste des meilleures conductrices
 */
driverSchema.statics.getTopDrivers = async function(limit = 10) {
  console.log('📄 [Driver.js] Static getTopDrivers appelé, limit:', limit);
  
  try {
    const drivers = await this.find({ status: 'approved' })
      .sort({ 'stats.averageRating': -1, 'stats.completedRides': -1 })
      .populate('user', 'firstName lastName avatar')
      .limit(limit);
    
    console.log('📄 [Driver.js] getTopDrivers - Trouvées:', drivers.length);
    return drivers;
  } catch (error) {
    console.log('📄 [Driver.js] getTopDrivers - Erreur:', error.message);
    throw error;
  }
};

/**
 * Obtient les conductrices en ligne
 * @returns {Promise<Array>} - Liste des conductrices en ligne
 */
driverSchema.statics.getOnlineDrivers = async function() {
  console.log('📄 [Driver.js] Static getOnlineDrivers appelé');
  
  try {
    const drivers = await this.find({
      isOnline: true,
      status: 'approved'
    })
    .populate('user', 'firstName lastName avatar')
    .select('currentLocation isAvailable stats.averageRating vehicle');
    
    console.log('📄 [Driver.js] getOnlineDrivers - Trouvées:', drivers.length);
    return drivers;
  } catch (error) {
    console.log('📄 [Driver.js] getOnlineDrivers - Erreur:', error.message);
    throw error;
  }
};

/**
 * Compte les conductrices par statut
 * @returns {Promise<Object>} - Comptage par statut
 */
driverSchema.statics.countByStatus = async function() {
  console.log('📄 [Driver.js] Static countByStatus appelé');
  
  try {
    const counts = await this.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transformer en objet
    const result = counts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    console.log('📄 [Driver.js] countByStatus - Résultat:', result);
    return result;
  } catch (error) {
    console.log('📄 [Driver.js] countByStatus - Erreur:', error.message);
    throw error;
  }
};

/**
 * Trouve les conductrices avec documents expirés
 * @returns {Promise<Array>} - Liste des conductrices avec documents expirés
 */
driverSchema.statics.findWithExpiredDocuments = async function() {
  console.log('📄 [Driver.js] Static findWithExpiredDocuments appelé');
  
  const now = new Date();
  
  try {
    const drivers = await this.find({
      $or: [
        { 'documents.nationalId.expiryDate': { $lt: now } },
        { 'documents.drivingLicense.expiryDate': { $lt: now } },
        { 'vehicle.registration.expiryDate': { $lt: now } },
        { 'vehicle.insurance.expiryDate': { $lt: now } },
        { 'vehicle.technicalInspection.expiryDate': { $lt: now } }
      ]
    }).populate('user', 'firstName lastName email phone');
    
    console.log('📄 [Driver.js] findWithExpiredDocuments - Trouvées:', drivers.length);
    return drivers;
  } catch (error) {
    console.log('📄 [Driver.js] findWithExpiredDocuments - Erreur:', error.message);
    throw error;
  }
};

console.log('📄 [Driver.js] Statics configurées');

// ============================================================================
// METHODS (Méthodes d'instance)
// ============================================================================

/**
 * Passe la conductrice en ligne
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.goOnline = async function() {
  console.log('📄 [Driver.js] goOnline appelé');
  
  if (this.status !== 'approved') {
    console.log('📄 [Driver.js] goOnline - ERREUR: Conductrice non approuvée');
    throw new Error('Vous devez être approuvée pour passer en ligne');
  }
  
  this.isOnline = true;
  this.isAvailable = true;
  this.lastOnlineAt = new Date();
  
  console.log('📄 [Driver.js] goOnline - Conductrice en ligne');
  return this.save();
};

/**
 * Passe la conductrice hors ligne
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.goOffline = async function() {
  console.log('📄 [Driver.js] goOffline appelé');
  
  this.isOnline = false;
  this.isAvailable = false;
  
  console.log('📄 [Driver.js] goOffline - Conductrice hors ligne');
  return this.save();
};

/**
 * Met à jour la localisation
 * @param {Array} coordinates - [longitude, latitude]
 * @param {number} heading - Direction en degrés (0-360)
 * @param {number} speed - Vitesse en km/h
 * @param {number} accuracy - Précision GPS en mètres
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.updateLocation = async function(coordinates, heading = 0, speed = 0, accuracy = null) {
  console.log('📄 [Driver.js] updateLocation appelé:', coordinates);
  
  this.currentLocation = {
    type: 'Point',
    coordinates: coordinates, // [longitude, latitude]
    heading,
    speed,
    accuracy,
    updatedAt: new Date()
  };
  
  console.log('📄 [Driver.js] updateLocation - Position mise à jour');
  return this.save();
};

/**
 * Accepte une course
 * @param {ObjectId} rideId - ID de la course
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.acceptRide = async function(rideId) {
  console.log('📄 [Driver.js] acceptRide appelé, rideId:', rideId);
  
  if (!this.isAvailable) {
    console.log('📄 [Driver.js] acceptRide - ERREUR: Conductrice non disponible');
    throw new Error('Vous n\'êtes pas disponible');
  }
  
  this.isAvailable = false;
  this.currentRide = rideId;
  
  console.log('📄 [Driver.js] acceptRide - Course acceptée');
  return this.save();
};

/**
 * Rejette une course
 * @param {ObjectId} rideId - ID de la course
 * @param {string} reason - Raison du rejet
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.rejectRide = async function(rideId, reason) {
  console.log('📄 [Driver.js] rejectRide appelé, rideId:', rideId, 'reason:', reason);
  
  // Mettre à jour le taux d'acceptation
  const totalRequests = this.stats.completedRides + this.stats.cancelledRides + 1;
  const rejectedRequests = this.stats.cancelledRides + 1;
  this.stats.acceptanceRate = Math.round(((totalRequests - rejectedRequests) / totalRequests) * 100);
  
  console.log('📄 [Driver.js] rejectRide - Nouveau taux d\'acceptation:', this.stats.acceptanceRate, '%');
  return this.save();
};

/**
 * Termine une course
 * @param {number} earnings - Montant gagné
 * @param {number} distance - Distance parcourue en km
 * @param {number} duration - Durée en minutes
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.completeRide = async function(earnings, distance = 0, duration = 0) {
  console.log('📄 [Driver.js] completeRide appelé');
  console.log('📄 [Driver.js] Gains:', earnings, 'MAD');
  console.log('📄 [Driver.js] Distance:', distance, 'km');
  console.log('📄 [Driver.js] Durée:', duration, 'min');
  
  // Libérer la conductrice
  this.isAvailable = true;
  this.currentRide = null;
  
  // Mettre à jour les statistiques
  this.stats.completedRides += 1;
  this.stats.totalDistance += distance;
  this.stats.totalHours += duration / 60;
  
  // Mettre à jour les gains
  this.earnings.today += earnings;
  this.earnings.week += earnings;
  this.earnings.month += earnings;
  this.earnings.total += earnings;
  this.earnings.pending += earnings;
  
  console.log('📄 [Driver.js] completeRide - Course terminée');
  console.log('📄 [Driver.js] Total courses:', this.stats.completedRides);
  console.log('📄 [Driver.js] Gains totaux:', this.earnings.total, 'MAD');
  
  return this.save();
};

/**
 * Annule une course (côté conductrice)
 * @param {string} reason - Raison de l'annulation
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.cancelRide = async function(reason) {
  console.log('📄 [Driver.js] cancelRide appelé, reason:', reason);
  
  // Libérer la conductrice
  this.isAvailable = true;
  this.currentRide = null;
  
  // Mettre à jour les statistiques
  this.stats.cancelledRides += 1;
  
  // Recalculer le taux d'acceptation
  const totalRides = this.stats.completedRides + this.stats.cancelledRides;
  if (totalRides > 0) {
    this.stats.acceptanceRate = Math.round((this.stats.completedRides / totalRides) * 100);
  }
  
  console.log('📄 [Driver.js] cancelRide - Course annulée');
  console.log('📄 [Driver.js] Nouveau taux d\'acceptation:', this.stats.acceptanceRate, '%');
  
  return this.save();
};

/**
 * Ajoute une évaluation
 * @param {ObjectId} rideId - ID de la course
 * @param {ObjectId} userId - ID de l'utilisatrice
 * @param {number} rating - Note (1-5)
 * @param {string} review - Commentaire
 * @param {Array} tags - Tags
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.addRating = async function(rideId, userId, rating, review, tags) {
  console.log('📄 [Driver.js] addRating appelé');
  console.log('📄 [Driver.js] Note:', rating, '/5');
  
  // Ajouter l'évaluation à l'historique
  this.ratings.push({ rideId, userId, rating, review, tags });
  
  // Recalculer la moyenne
  const oldRating = this.stats.averageRating;
  const totalRatings = this.stats.totalRatings + 1;
  const totalScore = (this.stats.averageRating * this.stats.totalRatings) + rating;
  
  this.stats.averageRating = Math.round((totalScore / totalRatings) * 10) / 10;
  this.stats.totalRatings = totalRatings;
  
  console.log('📄 [Driver.js] addRating - Note moyenne:', oldRating, '->', this.stats.averageRating);
  console.log('📄 [Driver.js] addRating - Total évaluations:', totalRatings);
  
  return this.save();
};

/**
 * Réinitialise les gains journaliers
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.resetDailyEarnings = function() {
  console.log('📄 [Driver.js] resetDailyEarnings appelé');
  console.log('📄 [Driver.js] Gains du jour remis à 0 (était:', this.earnings.today, 'MAD)');
  
  this.earnings.today = 0;
  return this.save();
};

/**
 * Réinitialise les gains hebdomadaires
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.resetWeeklyEarnings = function() {
  console.log('📄 [Driver.js] resetWeeklyEarnings appelé');
  console.log('📄 [Driver.js] Gains de la semaine remis à 0 (était:', this.earnings.week, 'MAD)');
  
  this.earnings.week = 0;
  return this.save();
};

/**
 * Réinitialise les gains mensuels
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.resetMonthlyEarnings = function() {
  console.log('📄 [Driver.js] resetMonthlyEarnings appelé');
  console.log('📄 [Driver.js] Gains du mois remis à 0 (était:', this.earnings.month, 'MAD)');
  
  this.earnings.month = 0;
  return this.save();
};

/**
 * Valide les gains en attente (les rend disponibles pour retrait)
 * @param {number} amount - Montant à valider (si null, valide tout)
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.validatePendingEarnings = function(amount = null) {
  console.log('📄 [Driver.js] validatePendingEarnings appelé');
  
  const toValidate = amount || this.earnings.pending;
  
  if (toValidate > this.earnings.pending) {
    console.log('📄 [Driver.js] validatePendingEarnings - ERREUR: Montant supérieur au pending');
    throw new Error('Montant invalide');
  }
  
  this.earnings.pending -= toValidate;
  this.earnings.available += toValidate;
  
  console.log('📄 [Driver.js] validatePendingEarnings - Validé:', toValidate, 'MAD');
  console.log('📄 [Driver.js] Disponible:', this.earnings.available, 'MAD');
  
  return this.save();
};

/**
 * Effectue un retrait
 * @param {number} amount - Montant à retirer
 * @param {string} method - Méthode de retrait
 * @returns {Promise<Driver>} - La conductrice mise à jour
 */
driverSchema.methods.withdraw = async function(amount, method = 'bank_transfer') {
  console.log('📄 [Driver.js] withdraw appelé');
  console.log('📄 [Driver.js] Montant:', amount, 'MAD');
  console.log('📄 [Driver.js] Méthode:', method);
  
  if (amount > this.earnings.available) {
    console.log('📄 [Driver.js] withdraw - ERREUR: Solde insuffisant');
    console.log('📄 [Driver.js] Disponible:', this.earnings.available, 'MAD');
    throw new Error('Solde insuffisant');
  }
  
  if (amount < 50) {
    console.log('📄 [Driver.js] withdraw - ERREUR: Montant minimum 50 MAD');
    throw new Error('Montant minimum de retrait: 50 MAD');
  }
  
  // Créer l'historique de retrait
  const withdrawal = {
    amount,
    status: 'pending',
    method,
    reference: 'WD' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase(),
    requestedAt: new Date()
  };
  
  this.withdrawals.push(withdrawal);
  
  // Mettre à jour les gains
  this.earnings.available -= amount;
  this.earnings.withdrawn += amount;
  
  console.log('📄 [Driver.js] withdraw - Retrait créé, ref:', withdrawal.reference);
  console.log('📄 [Driver.js] Nouveau solde disponible:', this.earnings.available, 'MAD');
  
  return this.save();
};

/**
 * Vérifie si un document est expiré
 * @param {string} documentType - Type de document
 * @returns {boolean} - True si expiré
 */
driverSchema.methods.isDocumentExpired = function(documentType) {
  console.log('📄 [Driver.js] isDocumentExpired appelé pour:', documentType);
  
  const now = new Date();
  let expiryDate;
  
  switch (documentType) {
    case 'nationalId':
      expiryDate = this.documents.nationalId.expiryDate;
      break;
    case 'drivingLicense':
      expiryDate = this.documents.drivingLicense.expiryDate;
      break;
    case 'registration':
      expiryDate = this.vehicle.registration.expiryDate;
      break;
    case 'insurance':
      expiryDate = this.vehicle.insurance.expiryDate;
      break;
    case 'technicalInspection':
      expiryDate = this.vehicle.technicalInspection.expiryDate;
      break;
    default:
      console.log('📄 [Driver.js] isDocumentExpired - Type inconnu');
      return false;
  }
  
  const isExpired = expiryDate ? expiryDate < now : false;
  console.log('📄 [Driver.js] isDocumentExpired -', documentType, ':', isExpired ? 'EXPIRÉ' : 'VALIDE');
  
  return isExpired;
};

/**
 * Obtient les documents expirés ou bientôt expirés
 * @param {number} daysWarning - Nombre de jours avant expiration pour alerter (défaut: 30)
 * @returns {Array} - Liste des documents expirés ou à renouveler
 */
driverSchema.methods.getExpiringDocuments = function(daysWarning = 30) {
  console.log('📄 [Driver.js] getExpiringDocuments appelé, warning:', daysWarning, 'jours');
  
  const now = new Date();
  const warningDate = new Date(now.getTime() + daysWarning * 24 * 60 * 60 * 1000);
  const expiring = [];
  
  const checkDocument = (name, expiryDate) => {
    if (expiryDate) {
      if (expiryDate < now) {
        expiring.push({ name, status: 'expired', expiryDate });
      } else if (expiryDate < warningDate) {
        expiring.push({ name, status: 'expiring_soon', expiryDate });
      }
    }
  };
  
  checkDocument('Carte d\'identité', this.documents.nationalId.expiryDate);
  checkDocument('Permis de conduire', this.documents.drivingLicense.expiryDate);
  checkDocument('Carte grise', this.vehicle.registration.expiryDate);
  checkDocument('Assurance', this.vehicle.insurance.expiryDate);
  checkDocument('Visite technique', this.vehicle.technicalInspection.expiryDate);
  
  console.log('📄 [Driver.js] getExpiringDocuments - Trouvés:', expiring.length);
  return expiring;
};

console.log('📄 [Driver.js] Methods configurées');

// ============================================================================
// TRANSFORM OUTPUT
// ============================================================================

/**
 * Transforme la sortie JSON pour retirer les champs sensibles
 */
driverSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    console.log('📄 [Driver.js] toJSON transform');
    
    // Renommer _id en id
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    
    // Supprimer les données sensibles
    if (ret.documents?.profilePhoto) {
      delete ret.documents.profilePhoto.faceDescriptor;
    }
    if (ret.bankDetails) {
      // Masquer le RIB
      if (ret.bankDetails.rib) {
        ret.bankDetails.rib = '****' + ret.bankDetails.rib.slice(-4);
      }
    }
    
    return ret;
  }
});

console.log('📄 [Driver.js] Transform configuré');

// ============================================================================
// EXPORT
// ============================================================================

const Driver = mongoose.model('Driver', driverSchema);

console.log('📄 [Driver.js] Modèle Driver créé et exporté');

module.exports = Driver;