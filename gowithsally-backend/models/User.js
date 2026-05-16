/**
 * ============================================================================
 * GO WITH SALLY - USER MODEL
 * ============================================================================
 * Modèle Mongoose pour les utilisatrices de l'application
 * Gère l'authentification, les préférences et les statistiques
 * ============================================================================
 */

console.log('📄 [User.js] Fichier chargé');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('📄 [User.js] Dépendances importées');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  JWT_SECRET: process.env.JWT_SECRET || 'gowithsally-secret-key-2024',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gowithsally-refresh-secret-2024',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d'
};

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const userSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────────────────────
  // INFORMATIONS DE BASE
  // ─────────────────────────────────────────────────────────────────────────
  firstName: { 
    type: String, 
    required: [true, 'Le prénom est requis'], 
    trim: true,
    minlength: [2, 'Le prénom doit contenir au moins 2 caractères']
  },
  lastName: { 
    type: String, 
    required: [true, 'Le nom est requis'], 
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères']
  },
  email: { 
    type: String, 
    required: [true, 'L\'email est requis'], 
    unique: true, 
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: { 
    type: String, 
    required: [true, 'Le téléphone est requis'], 
    unique: true,
    match: [/^\+212[0-9]{9}$/, 'Format: +212XXXXXXXXX']
  },
  password: { 
    type: String, 
    required: [true, 'Le mot de passe est requis'], 
    minlength: [8, 'Minimum 8 caractères'],
    select: false // Ne pas inclure par défaut dans les requêtes
  },
  avatar: { 
    type: String, 
    default: null 
  },
  dateOfBirth: { 
    type: Date, 
    required: [true, 'La date de naissance est requise']
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // RÔLE UTILISATEUR
  // ─────────────────────────────────────────────────────────────────────────
  role: {
    type: String,
    enum: ['user', 'driver', 'admin', 'sub_admin'],
    default: 'user'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUB-ADMIN FIELDS
  // ─────────────────────────────────────────────────────────────────────────
  region: {
    type: String,
    enum: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda'],
    default: null
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // VÉRIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  faceVerified: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: [] }, // Descripteur facial pour reconnaissance
  faceImages: [{ type: String }], // Références aux images faciales
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOCALISATION
  // ─────────────────────────────────────────────────────────────────────────
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // LIEUX FAVORIS
  // ─────────────────────────────────────────────────────────────────────────
  savedPlaces: [{
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    icon: { type: String, default: 'map-marker' },
    color: { type: String, default: '#FF69B4' }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTACTS D'URGENCE
  // ─────────────────────────────────────────────────────────────────────────
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRÉFÉRENCES
  // ─────────────────────────────────────────────────────────────────────────
  preferredLanguage: { 
    type: String, 
    enum: ['ar', 'fr', 'en'], 
    default: 'fr' 
  },
  notifications: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    rideUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    socialActivity: { type: Boolean, default: true }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────────────────────────
  stats: {
    totalRides: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5 },
    totalRatings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // GAMIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ 
    name: { type: String, required: true },
    icon: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // PORTEFEUILLE
  // ─────────────────────────────────────────────────────────────────────────
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'MAD' }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // MÉTHODES DE PAIEMENT
  // ─────────────────────────────────────────────────────────────────────────
  paymentMethods: [{
    type: { type: String, enum: ['card', 'cash', 'wallet'] },
    isDefault: { type: Boolean, default: false },
    cardLast4: { type: String },
    cardBrand: { type: String },
    stripePaymentMethodId: { type: String }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // PARRAINAGE
  // ─────────────────────────────────────────────────────────────────────────
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUT DU COMPTE
  // ─────────────────────────────────────────────────────────────────────────
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  lastLoginAt: { type: Date },
  lastLocationUpdate: { type: Date }
  
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

console.log('📄 [User.js] Schema défini');

// ============================================================================
// INDEXES
// ============================================================================

// Index géospatial pour les requêtes de localisation
userSchema.index({ currentLocation: '2dsphere' });

// Index composé pour recherche rapide
userSchema.index({ email: 1, phone: 1 });

// Index pour le code de parrainage
userSchema.index({ referralCode: 1 });

// Index pour les requêtes par rôle
userSchema.index({ role: 1, isActive: 1 });

console.log('📄 [User.js] Indexes configurés');

// ============================================================================
// VIRTUALS (Propriétés calculées)
// ============================================================================

/**
 * Nom complet de l'utilisatrice
 */
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Âge calculé à partir de la date de naissance
 */
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // Ajuster si l'anniversaire n'est pas encore passé cette année
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
});

/**
 * Vérifier si l'utilisatrice est complètement vérifiée
 */
userSchema.virtual('isVerified').get(function() {
  return this.phoneVerified && this.faceVerified;
});

/**
 * Étape de vérification actuelle
 */
userSchema.virtual('verificationStep').get(function() {
  if (!this.phoneVerified) return 'phone';
  if (!this.faceVerified) return 'face';
  return 'complete';
});

console.log('📄 [User.js] Virtuals configurés');

// ============================================================================
// MIDDLEWARE (Pre/Post hooks)
// ============================================================================

/**
 * Hash le mot de passe avant la sauvegarde
 */
userSchema.pre('save', async function(next) {
  console.log('📄 [User.js] Pre-save middleware - Début');
  
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified('password')) {
    console.log('📄 [User.js] Pre-save - Password non modifié, skip');
    return next();
  }
  
  try {
    console.log('📄 [User.js] Pre-save - Hashage du password...');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('📄 [User.js] Pre-save - Password hashé avec succès');
    next();
  } catch (error) {
    console.log('📄 [User.js] Pre-save - Erreur hashage:', error.message);
    next(error);
  }
});

/**
 * Génère un code de parrainage si non existant
 */
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'GWS' + Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('📄 [User.js] Pre-save - Code parrainage généré:', this.referralCode);
  }
  next();
});

/**
 * Log après la sauvegarde
 */
userSchema.post('save', function(doc) {
  console.log('📄 [User.js] Post-save - User sauvegardé:', doc.email);
});

console.log('📄 [User.js] Middleware configurés');

// ============================================================================
// METHODS (Méthodes d'instance)
// ============================================================================

/**
 * Compare le mot de passe candidat avec le mot de passe hashé
 * @param {string} candidatePassword - Le mot de passe à vérifier
 * @returns {Promise<boolean>} - True si les mots de passe correspondent
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log('📄 [User.js] comparePassword appelé pour:', this.email);
  
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('📄 [User.js] comparePassword - Résultat:', isMatch ? 'MATCH' : 'NO MATCH');
    return isMatch;
  } catch (error) {
    console.log('📄 [User.js] comparePassword - Erreur:', error.message);
    throw error;
  }
};

/**
 * Génère un token JWT d'accès
 * @returns {string} - Le token JWT
 */
userSchema.methods.generateAuthToken = function() {
  console.log('📄 [User.js] generateAuthToken appelé pour:', this.email);
  
  const token = jwt.sign(
    { 
      id: this._id, 
      role: this.role,
      email: this.email
    }, 
    config.JWT_SECRET, 
    { expiresIn: config.JWT_EXPIRE }
  );
  
  console.log('📄 [User.js] generateAuthToken - Token généré (expire:', config.JWT_EXPIRE, ')');
  return token;
};

/**
 * Génère un token JWT de rafraîchissement
 * @returns {string} - Le refresh token JWT
 */
userSchema.methods.generateRefreshToken = function() {
  console.log('📄 [User.js] generateRefreshToken appelé pour:', this.email);
  
  const refreshToken = jwt.sign(
    { id: this._id }, 
    config.JWT_REFRESH_SECRET, 
    { expiresIn: config.JWT_REFRESH_EXPIRE }
  );
  
  console.log('📄 [User.js] generateRefreshToken - Token généré (expire:', config.JWT_REFRESH_EXPIRE, ')');
  return refreshToken;
};

/**
 * Ajoute des points à l'utilisatrice (gamification)
 * @param {number} points - Nombre de points à ajouter
 * @param {string} reason - Raison de l'ajout de points
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.addPoints = function(points, reason) {
  console.log('📄 [User.js] addPoints appelé:', points, 'points pour', reason);
  
  const oldPoints = this.points;
  const oldLevel = this.level;
  
  this.points += points;
  
  // Calcul du niveau (100 points par niveau)
  const newLevel = Math.floor(this.points / 100) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    console.log('📄 [User.js] addPoints - LEVEL UP!', oldLevel, '->', newLevel);
  }
  
  console.log('📄 [User.js] addPoints - Points:', oldPoints, '->', this.points);
  return this.save();
};

/**
 * Met à jour la note moyenne de l'utilisatrice
 * @param {number} newRating - Nouvelle note (1-5)
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.updateRating = function(newRating) {
  console.log('📄 [User.js] updateRating appelé:', newRating, '/5');
  
  const oldRating = this.stats.averageRating;
  const totalRatings = this.stats.totalRatings + 1;
  const totalScore = (this.stats.averageRating * this.stats.totalRatings) + newRating;
  
  this.stats.averageRating = Math.round((totalScore / totalRatings) * 10) / 10;
  this.stats.totalRatings = totalRatings;
  
  console.log('📄 [User.js] updateRating - Note:', oldRating, '->', this.stats.averageRating);
  return this.save();
};

/**
 * Ajoute un contact d'urgence
 * @param {Object} contact - Le contact à ajouter { name, phone, relationship }
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.addEmergencyContact = function(contact) {
  console.log('📄 [User.js] addEmergencyContact appelé:', contact.name);
  
  // Maximum 5 contacts
  if (this.emergencyContacts.length >= 5) {
    console.log('📄 [User.js] addEmergencyContact - ERREUR: Maximum 5 contacts atteint');
    throw new Error('Maximum 5 contacts d\'urgence');
  }
  
  this.emergencyContacts.push(contact);
  console.log('📄 [User.js] addEmergencyContact - Contact ajouté, total:', this.emergencyContacts.length);
  return this.save();
};

/**
 * Supprime un contact d'urgence par index
 * @param {number} index - Index du contact à supprimer
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.removeEmergencyContact = function(index) {
  console.log('📄 [User.js] removeEmergencyContact appelé, index:', index);
  
  if (index < 0 || index >= this.emergencyContacts.length) {
    console.log('📄 [User.js] removeEmergencyContact - ERREUR: Index invalide');
    throw new Error('Contact non trouvé');
  }
  
  const removed = this.emergencyContacts.splice(index, 1);
  console.log('📄 [User.js] removeEmergencyContact - Contact supprimé:', removed[0]?.name);
  return this.save();
};

/**
 * Ajoute un lieu favori
 * @param {Object} place - Le lieu à ajouter { name, address, coordinates, icon, color }
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.addSavedPlace = function(place) {
  console.log('📄 [User.js] addSavedPlace appelé:', place.name);
  
  // Maximum 10 lieux
  if (this.savedPlaces.length >= 10) {
    console.log('📄 [User.js] addSavedPlace - ERREUR: Maximum 10 lieux atteint');
    throw new Error('Maximum 10 lieux favoris');
  }
  
  this.savedPlaces.push(place);
  console.log('📄 [User.js] addSavedPlace - Lieu ajouté, total:', this.savedPlaces.length);
  return this.save();
};

/**
 * Supprime un lieu favori par index
 * @param {number} index - Index du lieu à supprimer
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.removeSavedPlace = function(index) {
  console.log('📄 [User.js] removeSavedPlace appelé, index:', index);
  
  if (index < 0 || index >= this.savedPlaces.length) {
    console.log('📄 [User.js] removeSavedPlace - ERREUR: Index invalide');
    throw new Error('Lieu non trouvé');
  }
  
  const removed = this.savedPlaces.splice(index, 1);
  console.log('📄 [User.js] removeSavedPlace - Lieu supprimé:', removed[0]?.name);
  return this.save();
};

/**
 * Met à jour la localisation actuelle
 * @param {Array} coordinates - [longitude, latitude]
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.updateLocation = function(coordinates) {
  console.log('📄 [User.js] updateLocation appelé:', coordinates);
  
  this.currentLocation = {
    type: 'Point',
    coordinates: coordinates
  };
  this.lastLocationUpdate = new Date();
  
  return this.save();
};

/**
 * Ajoute un badge
 * @param {string} name - Nom du badge
 * @param {string} icon - Icône du badge
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.addBadge = function(name, icon) {
  console.log('📄 [User.js] addBadge appelé:', name);
  
  // Vérifier si le badge existe déjà
  const exists = this.badges.some(badge => badge.name === name);
  if (exists) {
    console.log('📄 [User.js] addBadge - Badge déjà possédé');
    return Promise.resolve(this);
  }
  
  this.badges.push({ name, icon, earnedAt: new Date() });
  console.log('📄 [User.js] addBadge - Badge ajouté, total:', this.badges.length);
  return this.save();
};

/**
 * Ajoute des fonds au portefeuille
 * @param {number} amount - Montant à ajouter
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.addWalletFunds = function(amount) {
  console.log('📄 [User.js] addWalletFunds appelé:', amount, 'MAD');
  
  const oldBalance = this.wallet.balance;
  this.wallet.balance += amount;
  
  console.log('📄 [User.js] addWalletFunds - Solde:', oldBalance, '->', this.wallet.balance);
  return this.save();
};

/**
 * Retire des fonds du portefeuille
 * @param {number} amount - Montant à retirer
 * @returns {Promise} - Promise de sauvegarde
 */
userSchema.methods.deductWalletFunds = function(amount) {
  console.log('📄 [User.js] deductWalletFunds appelé:', amount, 'MAD');
  
  if (this.wallet.balance < amount) {
    console.log('📄 [User.js] deductWalletFunds - ERREUR: Solde insuffisant');
    throw new Error('Solde insuffisant');
  }
  
  const oldBalance = this.wallet.balance;
  this.wallet.balance -= amount;
  
  console.log('📄 [User.js] deductWalletFunds - Solde:', oldBalance, '->', this.wallet.balance);
  return this.save();
};

console.log('📄 [User.js] Methods configurées');

// ============================================================================
// STATICS (Méthodes de classe)
// ============================================================================

/**
 * Trouve un utilisateur par email ou téléphone
 * @param {string} emailOrPhone - Email ou numéro de téléphone
 * @returns {Promise<User|null>} - L'utilisateur trouvé ou null
 */
userSchema.statics.findByCredentials = async function(emailOrPhone) {
  console.log('📄 [User.js] Static findByCredentials appelé:', emailOrPhone);
  
  const user = await this.findOne({
    $or: [
      { email: emailOrPhone.toLowerCase() },
      { phone: emailOrPhone }
    ]
  }).select('+password');
  
  console.log('📄 [User.js] findByCredentials - Trouvé:', user ? 'OUI' : 'NON');
  return user;
};

/**
 * Vérifie si un code de parrainage est valide
 * @param {string} code - Le code de parrainage
 * @returns {Promise<Object>} - { valid: boolean, userId?: ObjectId }
 */
userSchema.statics.validateReferralCode = async function(code) {
  console.log('📄 [User.js] Static validateReferralCode appelé:', code);
  
  const user = await this.findOne({ referralCode: code });
  
  if (user) {
    console.log('📄 [User.js] validateReferralCode - Code valide, user:', user.email);
    return { valid: true, userId: user._id };
  }
  
  console.log('📄 [User.js] validateReferralCode - Code invalide');
  return { valid: false };
};

/**
 * Trouve les utilisateurs à proximité
 * @param {Array} coordinates - [longitude, latitude]
 * @param {number} maxDistance - Distance max en mètres
 * @returns {Promise<Array>} - Liste des utilisateurs proches
 */
userSchema.statics.findNearby = async function(coordinates, maxDistance = 5000) {
  console.log('📄 [User.js] Static findNearby appelé:', coordinates, 'max:', maxDistance, 'm');
  
  const users = await this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    isBanned: false
  }).select('firstName lastName avatar currentLocation');
  
  console.log('📄 [User.js] findNearby - Trouvés:', users.length);
  return users;
};

/**
 * Incrémente le compteur de parrainage
 * @param {ObjectId} userId - ID de l'utilisateur parrain
 * @returns {Promise<User>} - L'utilisateur mis à jour
 */
userSchema.statics.incrementReferralCount = async function(userId) {
  console.log('📄 [User.js] Static incrementReferralCount appelé:', userId);
  
  const user = await this.findByIdAndUpdate(
    userId,
    { 
      $inc: { 
        referralCount: 1,
        points: 100 // Bonus de parrainage
      }
    },
    { new: true }
  );
  
  console.log('📄 [User.js] incrementReferralCount - Nouveau total:', user?.referralCount);
  return user;
};

console.log('📄 [User.js] Statics configurées');

// ============================================================================
// TRANSFORM OUTPUT
// ============================================================================

/**
 * Transforme la sortie JSON pour retirer les champs sensibles
 */
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    // Renommer _id en id
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    
    // Supprimer les champs sensibles
    delete ret.password;
    delete ret.faceDescriptor;
    delete ret.faceImages;
    
    return ret;
  }
});

console.log('📄 [User.js] Transform configuré');

// ============================================================================
// EXPORT
// ============================================================================

const User = mongoose.model('User', userSchema);

console.log('📄 [User.js] Modèle User créé et exporté');

module.exports = User;