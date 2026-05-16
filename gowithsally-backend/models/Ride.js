/**
 * ============================================================================
 * GO WITH SALLY - RIDE MODEL
 * ============================================================================
 * Modèle Mongoose pour les courses de l'application
 * Gère le cycle de vie complet d'une course: demande, assignation, trajet,
 * paiement, évaluation et sécurité
 * ============================================================================
 */

console.log('📄 [Ride.js] Fichier chargé');

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

console.log('📄 [Ride.js] Dépendances importées');

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const rideSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────────────────────
  // NUMÉRO DE COURSE UNIQUE
  // ─────────────────────────────────────────────────────────────────────────
  rideNumber: { 
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
    required: [true, 'L\'utilisatrice est requise'],
    index: true
  },
  driver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Driver',
    index: true,
    default: null
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUT DE LA COURSE
  // ─────────────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'searching',        // Recherche de conductrice
      'driver_assigned',  // Conductrice acceptée
      'driver_arriving',  // Conductrice en route
      'driver_arrived',   // Conductrice arrivée au point de départ
      'pickup_verified',  // QR code scanné au départ
      'in_progress',      // Course en cours
      'arriving',         // Arrivée proche
      'completed',        // Course terminée
      'cancelled',        // Course annulée
      'no_driver'         // Aucune conductrice trouvée
    ],
    default: 'searching',
    index: true
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 🆕 TYPE DE SERVICE (Sally Eco, Standard, Confort, Pool)
  // ─────────────────────────────────────────────────────────────────────────
  serviceType: {
    type: String,
    enum: ['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'],
    default: 'sally_standard'
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 🆕 RÉFÉRENCE À LA PROPOSITION DE PRIX
  // ─────────────────────────────────────────────────────────────────────────
  priceProposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceProposal'
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // QR CODES DE VÉRIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  qrCode: {
    // QR code pour le départ
    pickup: {
      code: { type: String },
      scanned: { type: Boolean, default: false },
      scannedAt: { type: Date },
      scannedBy: { type: String, enum: ['user', 'driver'] }
    },
    // QR code pour l'arrivée
    dropoff: {
      code: { type: String },
      scanned: { type: Boolean, default: false },
      scannedAt: { type: Date },
      scannedBy: { type: String, enum: ['user', 'driver'] }
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION FACIALE
  // ─────────────────────────────────────────────────────────────────────────
  faceVerification: {
    userVerified: { type: Boolean, default: false },
    userVerifiedAt: { type: Date },
    driverVerified: { type: Boolean, default: false },
    driverVerifiedAt: { type: Date },
    confidence: { type: Number, min: 0, max: 100 } // Confiance en %
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // POINT DE DÉPART
  // ─────────────────────────────────────────────────────────────────────────
  pickup: {
    address: { 
      type: String, 
      required: [true, 'L\'adresse de départ est requise']
    },
    city: { type: String },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { 
        type: [Number], 
        required: [true, 'Les coordonnées de départ sont requises']
      } // [longitude, latitude]
    },
    notes: { type: String }, // Instructions supplémentaires
    landmark: { type: String } // Point de repère
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // POINT D'ARRIVÉE
  // ─────────────────────────────────────────────────────────────────────────
  dropoff: {
    address: { 
      type: String, 
      required: [true, 'L\'adresse d\'arrivée est requise']
    },
    city: { type: String },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { 
        type: [Number], 
        required: [true, 'Les coordonnées d\'arrivée sont requises']
      }
    },
    notes: { type: String },
    landmark: { type: String }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ARRÊTS INTERMÉDIAIRES
  // ─────────────────────────────────────────────────────────────────────────
  stops: [{
    address: { type: String, required: true },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }
    },
    notes: { type: String },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    waitTime: { type: Number, default: 0 } // Minutes d'attente
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // INFORMATIONS DE ROUTE
  // ─────────────────────────────────────────────────────────────────────────
  route: {
    distance: { type: Number, default: 0 },        // Mètres (estimé)
    duration: { type: Number, default: 0 },        // Secondes (estimé)
    polyline: { type: String },                    // Polyline encodée
    actualDistance: { type: Number },              // Distance réelle parcourue
    actualDuration: { type: Number },              // Durée réelle
    waypoints: [{
      coordinates: { type: [Number], required: true },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TARIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  pricing: {
    estimatedFare: { 
      type: Number, 
      required: [true, 'Le tarif estimé est requis']
    },
    baseFare: { type: Number, default: 10 },           // Tarif de base (MAD)
    distanceFare: { type: Number, default: 0 },        // Tarif par distance
    timeFare: { type: Number, default: 0 },            // Tarif par temps
    bookingFee: { type: Number, default: 5 },          // Frais de réservation
    surgeMultiplier: { type: Number, default: 1 },     // Multiplicateur (heure de pointe)
    surgeReason: { type: String },                     // Raison du surge
    stopsFee: { type: Number, default: 0 },            // Frais pour arrêts
    waitingFee: { type: Number, default: 0 },          // Frais d'attente
    discount: { type: Number, default: 0 },            // Réduction
    discountCode: { type: String },                    // Code promo utilisé
    tip: { type: Number, default: 0 },                 // Pourboire
    finalFare: { type: Number },                       // Tarif final
    driverEarnings: { type: Number },                  // Gains conductrice
    platformFee: { type: Number },                     // Commission plateforme
    currency: { type: String, default: 'MAD' }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // 🆕 PRIX PROPOSÉ PAR L'UTILISATRICE (Name Your Price)
  // ─────────────────────────────────────────────────────────────────────────
  suggestedPrice: { type: Number },      // Prix suggéré par l'app
  minPrice: { type: Number },            // Prix minimum acceptable
  maxPrice: { type: Number },            // Prix maximum
  proposedPrice: { type: Number },       // Prix proposé par l'utilisatrice
  acceptedPrice: { type: Number },       // Prix accepté par la conductrice
  finalPrice: { type: Number },          // Prix final de la course
  
  // 🆕 Probabilité d'acceptation
  acceptanceLikelihood: {
    level: { 
      type: String, 
      enum: ['very_high', 'high', 'medium', 'low'] 
    },
    percentage: { type: Number, min: 0, max: 100 }
  },
  
  // 🆕 Info surge
  surgeInfo: {
    isActive: { type: Boolean, default: false },
    multiplier: { type: Number, default: 1 },
    reason: { type: String }
  },
  
  // 🆕 Commission
  commission: {
    amount: { type: Number },
    rate: { type: Number },
    driverEarnings: { type: Number }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // NÉGOCIATION DE PRIX (Legacy)
  // ─────────────────────────────────────────────────────────────────────────
  negotiation: {
    enabled: { type: Boolean, default: false },
    userProposedPrice: { type: Number },
    driverCounterPrice: { type: Number },
    acceptedPrice: { type: Number },
    negotiationHistory: [{
      proposedBy: { type: String, enum: ['user', 'driver'], required: true },
      amount: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PAIEMENT
  // ─────────────────────────────────────────────────────────────────────────
  payment: {
    method: { 
      type: String, 
      enum: ['cash', 'card', 'wallet'], 
      default: 'cash' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], 
      default: 'pending' 
    },
    transactionId: { type: String },
    paidAt: { type: Date },
    receiptUrl: { type: String },
    refundedAt: { type: Date },
    refundAmount: { type: Number }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONS DE COURSE
  // ─────────────────────────────────────────────────────────────────────────
  options: {
    rideType: { 
      type: String, 
      enum: ['standard', 'comfort', 'premium', 'shared'], 
      default: 'standard' 
    },
    scheduledTime: { type: Date },                     // Heure programmée
    isScheduled: { type: Boolean, default: false },    // Course programmée ?
    childSeat: { type: Boolean, default: false },      // Siège enfant
    wheelchairAccessible: { type: Boolean, default: false }, // Accessible PMR
    quietRide: { type: Boolean, default: false },      // Course silencieuse
    luggageSize: { 
      type: String, 
      enum: ['none', 'small', 'medium', 'large'], 
      default: 'none' 
    },
    passengers: { type: Number, default: 1, min: 1, max: 8 },
    femaleDriverOnly: { type: Boolean, default: true } // Conductrice femme uniquement
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMPS DE LA COURSE
  // ─────────────────────────────────────────────────────────────────────────
  timestamps: {
    requested: { type: Date, default: Date.now },      // Demande
    driverAssigned: { type: Date },                    // Conductrice assignée
    driverArriving: { type: Date },                    // En route
    driverArrived: { type: Date },                     // Arrivée conductrice
    pickupVerified: { type: Date },                    // QR scanné
    started: { type: Date },                           // Début course
    completed: { type: Date },                         // Fin course
    cancelled: { type: Date }                          // Annulation
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SUIVI ETA (Temps d'arrivée estimé)
  // ─────────────────────────────────────────────────────────────────────────
  eta: {
    toPickup: { type: Number },        // Secondes jusqu'au départ
    toDestination: { type: Number },   // Secondes jusqu'à l'arrivée
    lastUpdated: { type: Date }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TRACKING EN TEMPS RÉEL
  // ─────────────────────────────────────────────────────────────────────────
  tracking: [{
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    speed: { type: Number, default: 0 },             // km/h
    heading: { type: Number, default: 0 },           // Degrés (0-360)
    altitude: { type: Number },                      // Mètres
    accuracy: { type: Number },                      // Précision GPS
    timestamp: { type: Date, default: Date.now }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // ANNULATION
  // ─────────────────────────────────────────────────────────────────────────
  cancellation: {
    cancelledBy: { 
      type: String, 
      enum: ['user', 'driver', 'system', 'admin'] 
    },
    reason: { type: String },
    reasonCode: { 
      type: String,
      enum: [
        'changed_mind',           // A changé d'avis
        'driver_too_far',         // Conductrice trop loin
        'driver_not_moving',      // Conductrice ne bouge pas
        'wrong_address',          // Mauvaise adresse
        'found_other_transport',  // Autre transport trouvé
        'emergency',              // Urgence
        'driver_requested',       // Demande de la conductrice
        'user_no_show',           // Passagère absente
        'payment_issue',          // Problème de paiement
        'safety_concern',         // Problème de sécurité
        'other'                   // Autre
      ]
    },
    fee: { type: Number, default: 0 },
    feeWaived: { type: Boolean, default: false },
    refundAmount: { type: Number }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ÉVALUATION PAR L'UTILISATRICE
  // ─────────────────────────────────────────────────────────────────────────
  userRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
    tags: [{ 
      type: String,
      enum: ['safe', 'clean', 'friendly', 'professional', 'punctual', 'smooth_driving', 'good_music', 'great_conversation']
    }],
    createdAt: { type: Date },
    response: { type: String } // Réponse de la conductrice
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ÉVALUATION PAR LA CONDUCTRICE
  // ─────────────────────────────────────────────────────────────────────────
  driverRating: {
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
    tags: [{ 
      type: String,
      enum: ['polite', 'punctual', 'respectful', 'friendly', 'good_directions', 'pleasant']
    }],
    createdAt: { type: Date }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SÉCURITÉ
  // ─────────────────────────────────────────────────────────────────────────
  safety: {
    sosTriggered: { type: Boolean, default: false },
    sosTriggeredAt: { type: Date },
    sosTriggeredBy: { type: String, enum: ['user', 'driver'] },
    sosResolved: { type: Boolean, default: false },
    sosResolvedAt: { type: Date },
    sosResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    locationShared: { type: Boolean, default: false },
    locationSharedWith: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    incidentReport: { type: String },
    safetyScore: { type: Number, min: 0, max: 100 },
    emergencyServicesContacted: { type: Boolean, default: false }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // CHAT / MESSAGES
  // ─────────────────────────────────────────────────────────────────────────
  messages: [{
    sender: { 
      type: String, 
      enum: ['user', 'driver', 'system'], 
      required: true 
    },
    senderId: { type: mongoose.Schema.Types.ObjectId },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'image', 'location', 'audio', 'system'], 
      default: 'text' 
    },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    readAt: { type: Date }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // MÉTADONNÉES
  // ─────────────────────────────────────────────────────────────────────────
  metadata: {
    appVersion: { type: String },
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    deviceInfo: { type: String },
    ipAddress: { type: String },
    source: { type: String, enum: ['app', 'web', 'api'], default: 'app' },
    userAgent: { type: String }
  }
  
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

console.log('📄 [Ride.js] Schema défini');

// ============================================================================
// INDEXES
// ============================================================================

// Index géospatial pour le point de départ
rideSchema.index({ 'pickup.coordinates': '2dsphere' });

// Index géospatial pour le point d'arrivée
rideSchema.index({ 'dropoff.coordinates': '2dsphere' });

// Index composé pour les courses d'un utilisateur
rideSchema.index({ user: 1, status: 1 });

// Index composé pour les courses d'une conductrice
rideSchema.index({ driver: 1, status: 1 });

// Index pour les recherches par date
rideSchema.index({ createdAt: -1 });

// Index pour les courses en attente
rideSchema.index({ status: 1, createdAt: -1 });

// Index pour le numéro de course
rideSchema.index({ rideNumber: 1 });

// 🆕 Index pour le type de service
rideSchema.index({ serviceType: 1, status: 1 });

console.log('📄 [Ride.js] Indexes configurés');

// ============================================================================
// VIRTUALS (Propriétés calculées)
// ============================================================================

/**
 * 🆕 Prix à afficher (proposé ou final)
 */
rideSchema.virtual('priceToDisplay').get(function() {
  console.log('📄 [Ride.js] Virtual priceToDisplay appelé');
  return this.finalPrice || this.acceptedPrice || this.proposedPrice || this.pricing?.estimatedFare;
});

/**
 * Durée en minutes
 */
rideSchema.virtual('durationMinutes').get(function() {
  console.log('📄 [Ride.js] Virtual durationMinutes appelé');
  if (this.route?.actualDuration) {
    return Math.round(this.route.actualDuration / 60);
  }
  return Math.round((this.route?.duration || 0) / 60);
});

/**
 * 🆕 Temps d'attente en minutes
 */
rideSchema.virtual('waitTimeMinutes').get(function() {
  console.log('📄 [Ride.js] Virtual waitTimeMinutes appelé');
  if (this.timestamps?.driverArrived && this.timestamps?.started) {
    return Math.round((this.timestamps.started - this.timestamps.driverArrived) / 60000);
  }
  return 0;
});

/**
 * Distance en kilomètres
 */
rideSchema.virtual('distanceKm').get(function() {
  console.log('📄 [Ride.js] Virtual distanceKm appelé');
  const distance = this.route?.actualDistance || this.route?.distance || 0;
  return Math.round(distance / 100) / 10; // Arrondi à 1 décimale
});

/**
 * Vérifie si la course est active
 */
rideSchema.virtual('isActive').get(function() {
  console.log('📄 [Ride.js] Virtual isActive appelé');
  const activeStatuses = [
    'searching', 
    'driver_assigned', 
    'driver_arriving', 
    'driver_arrived', 
    'pickup_verified', 
    'in_progress', 
    'arriving'
  ];
  return activeStatuses.includes(this.status);
});

/**
 * Vérifie si la course peut être annulée
 */
rideSchema.virtual('canBeCancelled').get(function() {
  console.log('📄 [Ride.js] Virtual canBeCancelled appelé');
  const cancellableStatuses = [
    'searching', 
    'driver_assigned', 
    'driver_arriving', 
    'driver_arrived'
  ];
  return cancellableStatuses.includes(this.status);
});

/**
 * Vérifie si la course peut être notée
 */
rideSchema.virtual('canBeRated').get(function() {
  console.log('📄 [Ride.js] Virtual canBeRated appelé');
  return this.status === 'completed' && !this.userRating?.rating;
});

/**
 * Temps d'attente de la conductrice (en minutes)
 */
rideSchema.virtual('driverWaitTime').get(function() {
  console.log('📄 [Ride.js] Virtual driverWaitTime appelé');
  if (this.timestamps.driverArrived && this.timestamps.started) {
    const waitMs = this.timestamps.started - this.timestamps.driverArrived;
    return Math.round(waitMs / 60000);
  }
  return 0;
});

/**
 * Nombre total d'arrêts
 */
rideSchema.virtual('totalStops').get(function() {
  console.log('📄 [Ride.js] Virtual totalStops appelé');
  return this.stops?.length || 0;
});

console.log('📄 [Ride.js] Virtuals configurés');

// ============================================================================
// MIDDLEWARE (Pre/Post hooks)
// ============================================================================

/**
 * Génère le numéro de course et les QR codes avant la sauvegarde
 */
rideSchema.pre('save', function(next) {
  console.log('📄 [Ride.js] Pre-save middleware - Début');
  
  // Générer le numéro de course
  if (!this.rideNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.rideNumber = `GWS${timestamp}${random}`;
    console.log('📄 [Ride.js] Pre-save - Numéro de course généré:', this.rideNumber);
  }
  
  // Générer les QR codes
  if (!this.qrCode?.pickup?.code) {
    this.qrCode = this.qrCode || {};
    this.qrCode.pickup = this.qrCode.pickup || {};
    this.qrCode.pickup.code = `PICKUP-${uuidv4()}`;
    console.log('📄 [Ride.js] Pre-save - QR code pickup généré');
  }
  
  if (!this.qrCode?.dropoff?.code) {
    this.qrCode.dropoff = this.qrCode.dropoff || {};
    this.qrCode.dropoff.code = `DROPOFF-${uuidv4()}`;
    console.log('📄 [Ride.js] Pre-save - QR code dropoff généré');
  }
  
  next();
});

/**
 * Log après la sauvegarde
 */
rideSchema.post('save', function(doc) {
  console.log('📄 [Ride.js] Post-save - Course sauvegardée:', doc.rideNumber, 'status:', doc.status);
});

console.log('📄 [Ride.js] Middleware configurés');

// ============================================================================
// METHODS (Méthodes d'instance)
// ============================================================================

/**
 * 🆕 Assigne une conductrice à la course
 */
rideSchema.methods.assignDriver = async function(driverId) {
  console.log('📄 [Ride.js] assignDriver appelé, driverId:', driverId);
  
  this.driver = driverId;
  this.status = 'driver_assigned';
  this.timestamps.driverAssigned = new Date();
  
  return this.save();
};

/**
 * 🆕 Marque la conductrice comme arrivée
 */
rideSchema.methods.markDriverArrived = async function() {
  console.log('📄 [Ride.js] markDriverArrived appelé');
  
  this.status = 'driver_arrived';
  this.timestamps.driverArrived = new Date();
  
  return this.save();
};

/**
 * 🆕 Démarre la course
 */
rideSchema.methods.start = async function() {
  console.log('📄 [Ride.js] start appelé');
  
  this.status = 'in_progress';
  this.timestamps.started = new Date();
  
  return this.save();
};

/**
 * 🆕 Termine la course
 */
rideSchema.methods.complete = async function(finalPrice = null) {
  console.log('📄 [Ride.js] complete appelé');
  
  this.status = 'completed';
  this.timestamps.completed = new Date();
  
  if (finalPrice) {
    this.finalPrice = finalPrice;
  }
  
  // Calculer la durée réelle
  if (this.timestamps.started) {
    this.route.actualDuration = Math.round(
      (this.timestamps.completed - this.timestamps.started) / 1000
    );
  }
  
  return this.save();
};

/**
 * 🆕 Annule la course
 */
rideSchema.methods.cancel = async function(cancelledBy, reason, reasonCode = 'other') {
  console.log('📄 [Ride.js] cancel appelé par:', cancelledBy);
  
  this.status = 'cancelled';
  this.timestamps.cancelled = new Date();
  this.cancellation = {
    cancelledBy,
    reason,
    reasonCode
  };
  
  return this.save();
};

/**
 * 🆕 Évaluation par l'utilisatrice
 */
rideSchema.methods.rateByUser = async function(rating, review = '', tags = []) {
  console.log('📄 [Ride.js] rateByUser appelé, note:', rating);
  
  this.userRating = {
    rating,
    review,
    tags,
    createdAt: new Date()
  };
  
  return this.save();
};

/**
 * 🆕 Évaluation par la conductrice
 */
rideSchema.methods.rateByDriver = async function(rating, review = '', tags = []) {
  console.log('📄 [Ride.js] rateByDriver appelé, note:', rating);
  
  this.driverRating = {
    rating,
    review,
    tags,
    createdAt: new Date()
  };
  
  return this.save();
};

/**
 * Calcule le tarif estimé basé sur la distance et la durée
 */
rideSchema.methods.calculateEstimatedFare = function(config = {}) {
  console.log('📄 [Ride.js] calculateEstimatedFare appelé');
  
  const {
    baseFare = 10,
    perKm = 5,
    perMinute = 0.5,
    bookingFee = 5,
    minFare = 15
  } = config;
  
  const distanceKm = (this.route?.distance || 0) / 1000;
  const durationMin = (this.route?.duration || 0) / 60;
  
  this.pricing.baseFare = baseFare;
  this.pricing.distanceFare = Math.round(distanceKm * perKm * 100) / 100;
  this.pricing.timeFare = Math.round(durationMin * perMinute * 100) / 100;
  this.pricing.bookingFee = bookingFee;
  
  const total = baseFare + this.pricing.distanceFare + this.pricing.timeFare + bookingFee;
  this.pricing.estimatedFare = Math.max(minFare, Math.round(total * 100) / 100);
  
  console.log('📄 [Ride.js] calculateEstimatedFare - Tarif estimé:', this.pricing.estimatedFare, 'MAD');
  
  return this.pricing.estimatedFare;
};

/**
 * Calcule le tarif final
 */
rideSchema.methods.calculateFinalFare = function() {
  console.log('📄 [Ride.js] calculateFinalFare appelé');
  
  const { 
    baseFare = 10, 
    distanceFare = 0, 
    timeFare = 0, 
    bookingFee = 5, 
    surgeMultiplier = 1, 
    stopsFee = 0,
    waitingFee = 0,
    discount = 0, 
    tip = 0 
  } = this.pricing;
  
  const subtotal = (baseFare + distanceFare + timeFare + bookingFee + stopsFee + waitingFee) * surgeMultiplier;
  this.pricing.finalFare = Math.max(15, Math.round((subtotal - discount + tip) * 100) / 100);
  
  console.log('📄 [Ride.js] calculateFinalFare - Tarif final:', this.pricing.finalFare, 'MAD');
  
  return this.pricing.finalFare;
};

/**
 * Calcule les gains de la conductrice
 */
rideSchema.methods.calculateDriverEarnings = function(commissionRate = 0.15) {
  console.log('📄 [Ride.js] calculateDriverEarnings appelé');
  
  const fare = this.pricing.finalFare || this.calculateFinalFare();
  const tip = this.pricing.tip || 0;
  
  this.pricing.platformFee = Math.round(fare * commissionRate * 100) / 100;
  this.pricing.driverEarnings = Math.round((fare - this.pricing.platformFee + tip) * 100) / 100;
  
  console.log('📄 [Ride.js] calculateDriverEarnings - Gains conductrice:', this.pricing.driverEarnings, 'MAD');
  
  return this.pricing.driverEarnings;
};

/**
 * Ajoute un point de tracking
 */
rideSchema.methods.addTrackingPoint = function(coordinates, speed = 0, heading = 0, accuracy = null) {
  console.log('📄 [Ride.js] addTrackingPoint appelé:', coordinates);
  
  this.tracking.push({ 
    coordinates, 
    speed, 
    heading,
    accuracy,
    timestamp: new Date() 
  });
  
  if (this.tracking.length > 100) {
    this.tracking = this.tracking.slice(-100);
  }
  
  return this.save();
};

/**
 * Ajoute un message au chat
 */
rideSchema.methods.addMessage = function(sender, senderId, message, type = 'text') {
  console.log('📄 [Ride.js] addMessage appelé - Sender:', sender);
  
  this.messages.push({ 
    sender, 
    senderId, 
    message, 
    type,
    timestamp: new Date()
  });
  
  return this.save();
};

/**
 * Marque les messages comme lus
 */
rideSchema.methods.markMessagesAsRead = function(reader) {
  console.log('📄 [Ride.js] markMessagesAsRead appelé par:', reader);
  
  const senderToMark = reader === 'user' ? 'driver' : 'user';
  
  this.messages.forEach(msg => {
    if (msg.sender === senderToMark && !msg.read) {
      msg.read = true;
      msg.readAt = new Date();
    }
  });
  
  return this.save();
};

/**
 * Déclenche le SOS
 */
rideSchema.methods.triggerSOS = function(triggeredBy = 'user') {
  console.log('📄 [Ride.js] 🆘 triggerSOS appelé par:', triggeredBy);
  
  this.safety.sosTriggered = true;
  this.safety.sosTriggeredAt = new Date();
  this.safety.sosTriggeredBy = triggeredBy;
  
  this.messages.push({
    sender: 'system',
    message: `🆘 SOS déclenché par ${triggeredBy === 'user' ? 'la passagère' : 'la conductrice'}`,
    type: 'system',
    timestamp: new Date()
  });
  
  return this.save();
};

/**
 * Résout le SOS
 */
rideSchema.methods.resolveSOS = function(report = '', resolvedBy = null) {
  console.log('📄 [Ride.js] resolveSOS appelé');
  
  this.safety.sosResolved = true;
  this.safety.sosResolvedAt = new Date();
  this.safety.sosResolvedBy = resolvedBy;
  this.safety.incidentReport = report;
  
  this.messages.push({
    sender: 'system',
    message: '✅ SOS résolu',
    type: 'system',
    timestamp: new Date()
  });
  
  return this.save();
};

/**
 * Met à jour le statut avec validation des transitions
 */
rideSchema.methods.updateStatus = function(newStatus) {
  console.log('📄 [Ride.js] updateStatus:', this.status, '->', newStatus);
  
  const validTransitions = {
    'searching': ['driver_assigned', 'cancelled', 'no_driver'],
    'driver_assigned': ['driver_arriving', 'cancelled'],
    'driver_arriving': ['driver_arrived', 'cancelled'],
    'driver_arrived': ['pickup_verified', 'in_progress', 'cancelled'],
    'pickup_verified': ['in_progress', 'cancelled'],
    'in_progress': ['arriving', 'completed', 'cancelled'],
    'arriving': ['completed', 'cancelled']
  };
  
  const allowedNext = validTransitions[this.status] || [];
  
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Transition invalide de ${this.status} vers ${newStatus}`);
  }
  
  this.status = newStatus;
  
  switch (newStatus) {
    case 'driver_arriving':
      this.timestamps.driverArriving = new Date();
      break;
    case 'driver_arrived':
      this.timestamps.driverArrived = new Date();
      break;
    case 'pickup_verified':
      this.timestamps.pickupVerified = new Date();
      break;
    case 'in_progress':
      this.timestamps.started = new Date();
      break;
    case 'completed':
      this.timestamps.completed = new Date();
      break;
    case 'cancelled':
      this.timestamps.cancelled = new Date();
      break;
  }
  
  return this.save();
};

/**
 * Ajoute un pourboire
 */
rideSchema.methods.addTip = function(amount) {
  console.log('📄 [Ride.js] addTip appelé:', amount, 'MAD');
  
  if (this.status !== 'completed') {
    throw new Error('Le pourboire ne peut être ajouté qu\'après la course');
  }
  
  this.pricing.tip = amount;
  this.calculateFinalFare();
  this.calculateDriverEarnings();
  
  return this.save();
};

/**
 * Applique un code promo
 */
rideSchema.methods.applyDiscount = function(code, discount) {
  console.log('📄 [Ride.js] applyDiscount - Code:', code, 'Réduction:', discount, 'MAD');
  
  this.pricing.discountCode = code;
  this.pricing.discount = discount;
  
  if (this.pricing.finalFare) {
    this.calculateFinalFare();
  }
  
  return this.save();
};

/**
 * Partage la localisation avec des contacts
 */
rideSchema.methods.shareLocation = function(contactIds) {
  console.log('📄 [Ride.js] shareLocation avec', contactIds.length, 'contacts');
  
  this.safety.locationShared = true;
  this.safety.locationSharedWith = contactIds;
  
  return this.save();
};

console.log('📄 [Ride.js] Methods configurées');

// ============================================================================
// STATICS (Méthodes de classe)
// ============================================================================

/**
 * 🆕 Obtient les courses d'une utilisatrice
 */
rideSchema.statics.getUserRides = async function(userId, options = {}) {
  console.log('📄 [Ride.js] Static getUserRides appelé');
  
  const { limit = 20, skip = 0, status = null } = options;
  const query = { user: userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('driver');
};

/**
 * 🆕 Obtient les courses d'une conductrice
 */
rideSchema.statics.getDriverRides = async function(driverId, options = {}) {
  console.log('📄 [Ride.js] Static getDriverRides appelé');
  
  const { limit = 20, skip = 0, status = null } = options;
  const query = { driver: driverId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'firstName lastName avatar phone');
};

/**
 * 🆕 Statistiques utilisatrice
 */
rideSchema.statics.getUserStats = async function(userId) {
  console.log('📄 [Ride.js] Static getUserStats appelé');
  
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledRides: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$finalPrice', 0] } },
        avgRating: { $avg: '$driverRating.rating' }
      }
    }
  ]);
  
  return stats[0] || { totalRides: 0, completedRides: 0, cancelledRides: 0, totalSpent: 0, avgRating: 0 };
};

/**
 * 🆕 Statistiques conductrice
 */
rideSchema.statics.getDriverStats = async function(driverId) {
  console.log('📄 [Ride.js] Static getDriverStats appelé');
  
  const stats = await this.aggregate([
    { $match: { driver: new mongoose.Types.ObjectId(driverId) } },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledRides: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$commission.driverEarnings', 0] } },
        avgRating: { $avg: '$userRating.rating' }
      }
    }
  ]);
  
  return stats[0] || { totalRides: 0, completedRides: 0, cancelledRides: 0, totalEarnings: 0, avgRating: 0 };
};

/**
 * 🆕 Statistiques par type de service
 */
rideSchema.statics.getServiceStats = async function(serviceType = null) {
  console.log('📄 [Ride.js] Static getServiceStats appelé');
  
  const match = serviceType ? { serviceType } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$serviceType',
        totalRides: { $sum: 1 },
        completedRides: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgPrice: { $avg: '$finalPrice' },
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$finalPrice', 0] } }
      }
    }
  ]);
};

/**
 * Obtient la course active d'une utilisatrice
 */
rideSchema.statics.getActiveRide = async function(userId) {
  console.log('📄 [Ride.js] Static getActiveRide appelé');
  
  const activeStatuses = [
    'searching', 'driver_assigned', 'driver_arriving', 
    'driver_arrived', 'pickup_verified', 'in_progress', 'arriving'
  ];
  
  return this.findOne({
    user: userId,
    status: { $in: activeStatuses }
  })
  .populate({
    path: 'driver',
    populate: { path: 'user', select: 'firstName lastName avatar phone' }
  });
};

/**
 * Obtient la course active d'une conductrice
 */
rideSchema.statics.getDriverActiveRide = async function(driverId) {
  console.log('📄 [Ride.js] Static getDriverActiveRide appelé');
  
  const activeStatuses = [
    'driver_assigned', 'driver_arriving', 'driver_arrived', 
    'pickup_verified', 'in_progress', 'arriving'
  ];
  
  return this.findOne({
    driver: driverId,
    status: { $in: activeStatuses }
  })
  .populate('user', 'firstName lastName avatar phone');
};

/**
 * Trouve les courses en attente de conductrice
 */
rideSchema.statics.findWaitingRides = async function(coordinates, maxDistance = 10000) {
  console.log('📄 [Ride.js] Static findWaitingRides appelé');
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  return this.find({
    status: 'searching',
    'pickup.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistance
      }
    },
    createdAt: { $gte: tenMinutesAgo }
  })
  .populate('user', 'firstName lastName avatar phone stats')
  .sort({ createdAt: 1 });
};

/**
 * Compte les courses par statut
 */
rideSchema.statics.countByStatus = async function() {
  console.log('📄 [Ride.js] Static countByStatus appelé');
  
  const counts = await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  return counts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

/**
 * Obtient les statistiques des courses pour une période
 */
rideSchema.statics.getStats = async function(startDate, endDate) {
  console.log('📄 [Ride.js] Static getStats appelé');
  
  const stats = await this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledRides: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.finalFare', 0] } },
        totalDistance: { $sum: '$route.actualDistance' },
        avgRating: { $avg: '$userRating.rating' }
      }
    }
  ]);
  
  return stats[0] || {
    totalRides: 0, completedRides: 0, cancelledRides: 0,
    totalRevenue: 0, totalDistance: 0, avgRating: 0
  };
};

/**
 * Trouve les courses avec SOS actif
 */
rideSchema.statics.findActiveSOSRides = async function() {
  console.log('📄 [Ride.js] Static findActiveSOSRides appelé');
  
  return this.find({
    'safety.sosTriggered': true,
    'safety.sosResolved': false
  })
  .populate('user', 'firstName lastName phone')
  .populate({
    path: 'driver',
    populate: { path: 'user', select: 'firstName lastName phone' }
  })
  .sort({ 'safety.sosTriggeredAt': -1 });
};

console.log('📄 [Ride.js] Statics configurées');

// ============================================================================
// TRANSFORM OUTPUT
// ============================================================================

rideSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    
    if (ret.metadata) {
      delete ret.metadata.ipAddress;
    }
    
    return ret;
  }
});

console.log('📄 [Ride.js] Transform configuré');

// ============================================================================
// EXPORT
// ============================================================================

const Ride = mongoose.model('Ride', rideSchema);

console.log('📄 [Ride.js] Modèle Ride créé et exporté');

module.exports = Ride;