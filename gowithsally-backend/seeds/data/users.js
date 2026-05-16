/**
 * ============================================================================
 * GO WITH SALLY - USERS SEED DATA
 * ============================================================================
 * @version 2.2.0
 * Données de test pour les utilisatrices
 * FIX: Added dateOfBirth to predefinedUsers
 * FIX: referredBy always null (was generating string instead of ObjectId)
 * ============================================================================
 */

const { Types } = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================================================
// HELPERS
// ============================================================================

const generateObjectId = () => new Types.ObjectId();
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Hash un mot de passe
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Hash synchrone pour les seeds
 */
const hashPasswordSync = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

// ============================================================================
// DONNÉES MAROCAINES
// ============================================================================

/**
 * Prénoms féminins marocains
 */
const femaleFirstNames = [
  'Fatima', 'Amina', 'Khadija', 'Aicha', 'Meryem', 'Sara', 'Nadia', 'Leila',
  'Houda', 'Zineb', 'Salma', 'Hajar', 'Imane', 'Najat', 'Souad', 'Latifa',
  'Samira', 'Rachida', 'Hanane', 'Naima', 'Karima', 'Jamila', 'Malika', 'Asma',
  'Dounia', 'Siham', 'Wafaa', 'Loubna', 'Ghita', 'Rim', 'Yousra', 'Ikram',
  'Mariam', 'Nisrine', 'Sanae', 'Boutaina', 'Lamiae', 'Asmae', 'Bouchra', 'Nawal',
  'Soukaina', 'Rajae', 'Hind', 'Kawtar', 'Chaimae', 'Safae', 'Ilham', 'Fatiha',
  'Hafsa', 'Oumaima', 'Maha', 'Jihane', 'Lamiaa', 'Rania', 'Lina', 'Aya'
];

/**
 * Noms de famille marocains
 */
const lastNames = [
  'Benali', 'El Amrani', 'Tazi', 'Bennani', 'Alaoui', 'El Idrissi', 'Berrada',
  'Chaoui', 'Fassi', 'Kettani', 'Lahlou', 'Marrakchi', 'Sefrioui', 'Zniber',
  'Benjelloun', 'El Ouazzani', 'Tahiri', 'Bouazza', 'Chraibi', 'Daoudi',
  'El Haddad', 'Filali', 'Guessous', 'Hajji', 'Jaidi', 'Kadiri', 'Lamrani',
  'Mansouri', 'Naciri', 'Ouazzani', 'Rahmouni', 'Skalli', 'Touhami', 'Zerhouni',
  'Bouabid', 'El Khalfi', 'Hassani', 'Belkadi', 'Amrani', 'Chakir', 'Fathi',
  'Ghazi', 'Hilali', 'Izem', 'Jelloul', 'Kabbaj', 'Lazrak', 'Mernissi'
];

/**
 * Villes marocaines avec coordonnées
 */
const cities = [
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, active: true, tier: 'primary' },
  { name: 'Rabat', lat: 34.0209, lng: -6.8416, active: true, tier: 'primary' },
  { name: 'Marrakech', lat: 31.6295, lng: -7.9811, active: true, tier: 'primary' },
  { name: 'Tanger', lat: 35.7595, lng: -5.8340, active: true, tier: 'secondary' },
  { name: 'Fès', lat: 34.0181, lng: -5.0078, active: true, tier: 'secondary' },
  { name: 'Agadir', lat: 30.4278, lng: -9.5981, active: false, tier: 'secondary' },
  { name: 'Meknès', lat: 33.8935, lng: -5.5473, active: false, tier: 'secondary' },
  { name: 'Oujda', lat: 34.6867, lng: -1.9114, active: false, tier: 'tertiary' },
  { name: 'Kénitra', lat: 34.2610, lng: -6.5802, active: false, tier: 'tertiary' },
  { name: 'Tétouan', lat: 35.5889, lng: -5.3626, active: false, tier: 'tertiary' },
  { name: 'Mohammedia', lat: 33.6833, lng: -7.3833, active: true, tier: 'secondary' },
  { name: 'El Jadida', lat: 33.2316, lng: -8.5007, active: false, tier: 'tertiary' },
  { name: 'Salé', lat: 34.0531, lng: -6.7985, active: true, tier: 'secondary' },
  { name: 'Beni Mellal', lat: 32.3373, lng: -6.3498, active: false, tier: 'tertiary' },
  { name: 'Nador', lat: 35.1681, lng: -2.9287, active: false, tier: 'tertiary' }
];

/**
 * Relations pour contacts d'urgence
 */
const relationships = [
  { key: 'mother', label: 'Mère', labelAr: 'الأم' },
  { key: 'father', label: 'Père', labelAr: 'الأب' },
  { key: 'sister', label: 'Sœur', labelAr: 'الأخت' },
  { key: 'brother', label: 'Frère', labelAr: 'الأخ' },
  { key: 'friend', label: 'Amie', labelAr: 'صديقة' },
  { key: 'husband', label: 'Mari', labelAr: 'الزوج' },
  { key: 'daughter', label: 'Fille', labelAr: 'البنت' },
  { key: 'son', label: 'Fils', labelAr: 'الابن' },
  { key: 'cousin', label: 'Cousine', labelAr: 'ابنة العم' },
  { key: 'aunt', label: 'Tante', labelAr: 'العمة' },
  { key: 'colleague', label: 'Collègue', labelAr: 'زميلة' },
  { key: 'other', label: 'Autre', labelAr: 'آخر' }
];

// ============================================================================
// RÔLES ET STATUTS
// ============================================================================

const userRoles = {
  USER: { key: 'user', label: 'Passagère', permissions: ['book_ride', 'rate', 'chat'] },
  DRIVER: { key: 'driver', label: 'Conductrice', permissions: ['accept_ride', 'rate', 'chat', 'earnings'] },
  ADMIN: { key: 'admin', label: 'Administratrice', permissions: ['*'] },
  SUPPORT: { key: 'support', label: 'Support', permissions: ['view_users', 'view_rides', 'manage_tickets'] },
  MODERATOR: { key: 'moderator', label: 'Modératrice', permissions: ['moderate_content', 'view_reports'] }
};

const userStatuses = {
  ACTIVE: { key: 'active', label: 'Active', canUseApp: true },
  PENDING: { key: 'pending', label: 'En attente', canUseApp: false },
  SUSPENDED: { key: 'suspended', label: 'Suspendue', canUseApp: false },
  BANNED: { key: 'banned', label: 'Bannie', canUseApp: false },
  DELETED: { key: 'deleted', label: 'Supprimée', canUseApp: false }
};

const accountStatuses = {
  UNVERIFIED: { key: 'unverified', label: 'Non vérifié', level: 0 },
  PHONE_VERIFIED: { key: 'phone_verified', label: 'Téléphone vérifié', level: 1 },
  EMAIL_VERIFIED: { key: 'email_verified', label: 'Email vérifié', level: 2 },
  IDENTITY_VERIFIED: { key: 'identity_verified', label: 'Identité vérifiée', level: 3 },
  FULLY_VERIFIED: { key: 'fully_verified', label: 'Entièrement vérifiée', level: 4 }
};

// ============================================================================
// NIVEAUX ET BADGES
// ============================================================================

const userLevels = [
  { level: 1, name: 'Nouvelle', minRides: 0, minPoints: 0, icon: '🌱', color: '#95a5a6' },
  { level: 2, name: 'Découvreuse', minRides: 5, minPoints: 50, icon: '🌿', color: '#3498db' },
  { level: 3, name: 'Habituée', minRides: 15, minPoints: 150, icon: '🌳', color: '#2ecc71' },
  { level: 4, name: 'Fidèle', minRides: 30, minPoints: 300, icon: '⭐', color: '#f1c40f' },
  { level: 5, name: 'Sally Bronze', minRides: 50, minPoints: 500, icon: '🥉', color: '#cd7f32' },
  { level: 6, name: 'Sally Argent', minRides: 80, minPoints: 800, icon: '🥈', color: '#c0c0c0' },
  { level: 7, name: 'Sally Or', minRides: 120, minPoints: 1200, icon: '🥇', color: '#ffd700' },
  { level: 8, name: 'Sally Platine', minRides: 200, minPoints: 2000, icon: '💎', color: '#e5e4e2' },
  { level: 9, name: 'Sally Élite', minRides: 350, minPoints: 3500, icon: '👑', color: '#9b59b6' },
  { level: 10, name: 'Sally Ambassadrice', minRides: 500, minPoints: 5000, icon: '🌟', color: '#e74c3c' }
];

const userBadges = [
  { key: 'first_ride', name: 'Première course', description: 'A effectué sa première course', icon: '🚗' },
  { key: 'early_adopter', name: 'Pionnière', description: 'Parmi les premières utilisatrices', icon: '🌟' },
  { key: 'loyal_10', name: 'Fidèle 10', description: '10 courses complétées', icon: '🔟' },
  { key: 'loyal_50', name: 'Fidèle 50', description: '50 courses complétées', icon: '5️⃣0️⃣' },
  { key: 'loyal_100', name: 'Centurion', description: '100 courses complétées', icon: '💯' },
  { key: 'perfect_rating', name: 'Parfaite', description: 'Note parfaite de 5 étoiles', icon: '⭐' },
  { key: 'referrer_5', name: 'Ambassadrice', description: '5 filleules inscrites', icon: '🤝' },
  { key: 'referrer_20', name: 'Super Ambassadrice', description: '20 filleules inscrites', icon: '👑' },
  { key: 'night_owl', name: 'Noctambule', description: '10 courses après 22h', icon: '🦉' },
  { key: 'early_bird', name: 'Lève-tôt', description: '10 courses avant 7h', icon: '🐦' },
  { key: 'eco_rider', name: 'Éco-friendly', description: '20 courses Sally Eco', icon: '🌱' },
  { key: 'premium_rider', name: 'Premium', description: '10 courses Sally Premium', icon: '💎' },
  { key: 'safety_first', name: 'Sécurité d\'abord', description: 'Contacts d\'urgence configurés', icon: '🛡️' },
  { key: 'social_butterfly', name: 'Sociale', description: 'Connectée aux réseaux sociaux', icon: '🦋' },
  { key: 'feedback_queen', name: 'Reine du feedback', description: '20 évaluations laissées', icon: '📝' }
];

// ============================================================================
// TAGS D'ÉVALUATION PASSAGÈRE
// ============================================================================

const passengerTags = [
  { key: 'polite', label: 'Polie', icon: '🙏', category: 'behavior' },
  { key: 'respectful', label: 'Respectueuse', icon: '👍', category: 'behavior' },
  { key: 'friendly', label: 'Sympathique', icon: '😊', category: 'behavior' },
  { key: 'punctual', label: 'Ponctuelle', icon: '⏰', category: 'service' },
  { key: 'on_time', label: 'À l\'heure', icon: '⏱️', category: 'service' },
  { key: 'easy_pickup', label: 'Pickup facile', icon: '📍', category: 'service' },
  { key: 'good_directions', label: 'Bonnes indications', icon: '🗺️', category: 'service' },
  { key: 'clean', label: 'Propre', icon: '✨', category: 'general' },
  { key: 'pleasant', label: 'Agréable', icon: '🌸', category: 'general' },
  { key: 'good_tipper', label: 'Bon pourboire', icon: '💰', category: 'payment' },
  { key: 'quick_payment', label: 'Paiement rapide', icon: '💳', category: 'payment' }
];

// ============================================================================
// TYPES DE LIEUX SAUVEGARDÉS
// ============================================================================

const placeTypes = {
  HOME: { key: 'home', label: 'Maison', icon: '🏠', color: '#4CAF50' },
  WORK: { key: 'work', label: 'Travail', icon: '💼', color: '#2196F3' },
  SCHOOL: { key: 'school', label: 'École/Université', icon: '🎓', color: '#9C27B0' },
  GYM: { key: 'gym', label: 'Salle de sport', icon: '💪', color: '#FF5722' },
  DOCTOR: { key: 'doctor', label: 'Médecin', icon: '🏥', color: '#F44336' },
  FAMILY: { key: 'family', label: 'Famille', icon: '👨‍👩‍👧', color: '#E91E63' },
  FRIEND: { key: 'friend', label: 'Amie', icon: '👯', color: '#00BCD4' },
  SHOPPING: { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#FF9800' },
  OTHER: { key: 'other', label: 'Autre', icon: '📍', color: '#607D8B' }
};

// ============================================================================
// MÉTHODES DE PAIEMENT
// ============================================================================

const paymentMethods = {
  CASH: { key: 'cash', label: 'Espèces', icon: '💵', active: true },
  CARD: { key: 'card', label: 'Carte bancaire', icon: '💳', active: true },
  WALLET: { key: 'wallet', label: 'Portefeuille Sally', icon: '👛', active: true },
  APPLE_PAY: { key: 'apple_pay', label: 'Apple Pay', icon: '🍎', active: true },
  GOOGLE_PAY: { key: 'google_pay', label: 'Google Pay', icon: '🤖', active: true }
};

// ============================================================================
// PRÉFÉRENCES PAR DÉFAUT
// ============================================================================

const defaultPreferences = {
  notifications: {
    push: true,
    email: true,
    sms: false,
    promotions: true,
    rideUpdates: true,
    paymentUpdates: true,
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00'
  },
  ride: {
    defaultPaymentMethod: 'cash',
    defaultServiceType: 'sally_standard',
    shareRideStatus: true,
    autoTip: false,
    defaultTipPercentage: 0,
    preferQuietRide: false,
    preferFemaleDriverOnly: true
  },
  privacy: {
    showProfilePhoto: true,
    showRating: true,
    allowLocationSharing: true,
    shareRideWithContacts: false
  },
  accessibility: {
    largeText: false,
    highContrast: false,
    voiceOver: false
  }
};

// ============================================================================
// GÉNÉRATEURS
// ============================================================================

/**
 * Génère un numéro de téléphone marocain
 */
const generatePhone = () => {
  const prefixes = ['61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'];
  const prefix = randomItem(prefixes);
  const number = randomInt(1000000, 9999999);
  return `+212${prefix}${number}`;
};

/**
 * Génère un code de parrainage
 */
const generateReferralCode = (firstName = '') => {
  const prefix = firstName ? firstName.toUpperCase().substring(0, 3) : 'SAL';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[randomInt(0, chars.length - 1)];
  }
  return `${prefix}${suffix}`;
};

/**
 * Génère une date de naissance (18-55 ans)
 */
const generateBirthDate = (minAge = 18, maxAge = 55) => {
  const age = randomInt(minAge, maxAge);
  const year = new Date().getFullYear() - age;
  const month = randomInt(0, 11);
  const day = randomInt(1, 28);
  return new Date(year, month, day);
};

/**
 * Génère une date passée
 */
const generatePastDate = (minDays = 1, maxDays = 365) => {
  const days = randomInt(minDays, maxDays);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

/**
 * Détermine le niveau selon les courses et points
 */
const getUserLevel = (completedRides, points) => {
  for (let i = userLevels.length - 1; i >= 0; i--) {
    if (completedRides >= userLevels[i].minRides && points >= userLevels[i].minPoints) {
      return userLevels[i];
    }
  }
  return userLevels[0];
};

/**
 * Génère les badges d'une utilisatrice
 * NOTE: Retourne un tableau vide car le schema attend des objets embedded
 */
const generateUserBadges = (completedRides, referrals = 0, avgRating = 0) => {
  return [];
};

// ============================================================================
// UTILISATRICES PRÉDÉFINIES
// ============================================================================

const predefinedUsers = [
  // Passagère test principale
  {
    firstName: 'Fatima',
    lastName: 'Benali',
    email: 'fatima@test.com',
    phone: '+212612345678',
    password: 'password123',
    dateOfBirth: new Date('1995-03-15'),
    role: 'user',
    isTestAccount: true
  },
  // Passagère test secondaire
  {
    firstName: 'Sara',
    lastName: 'Bennani',
    email: 'sara@test.com',
    phone: '+212645678901',
    password: 'password123',
    dateOfBirth: new Date('1998-07-22'),
    role: 'user',
    isTestAccount: true
  },
  // Conductrice test 1
  {
    firstName: 'Amina',
    lastName: 'El Amrani',
    email: 'amina.driver@test.com',
    phone: '+212623456789',
    password: 'password123',
    dateOfBirth: new Date('1990-11-08'),
    role: 'driver',
    isTestAccount: true
  },
  // Conductrice test 2
  {
    firstName: 'Khadija',
    lastName: 'Tazi',
    email: 'khadija.driver@test.com',
    phone: '+212634567890',
    password: 'password123',
    dateOfBirth: new Date('1988-05-30'),
    role: 'driver',
    isTestAccount: true
  },
  // Conductrice test 3
  {
    firstName: 'Nadia',
    lastName: 'Berrada',
    email: 'nadia.driver@test.com',
    phone: '+212656789012',
    password: 'password123',
    dateOfBirth: new Date('1992-09-12'),
    role: 'driver',
    isTestAccount: true
  },
  // Admin
  {
    firstName: 'Admin',
    lastName: 'Sally',
    email: 'admin@gowithsally.ma',
    phone: '+212600000000',
    password: 'Admin@2024',
    dateOfBirth: new Date('1985-01-01'),
    role: 'admin',
    isTestAccount: true
  },
  // Support
  {
    firstName: 'Support',
    lastName: 'Sally',
    email: 'support@gowithsally.ma',
    phone: '+212600000001',
    password: 'Support@2024',
    dateOfBirth: new Date('1990-06-15'),
    role: 'admin',
    isTestAccount: true
  },
  // Modératrice
  {
    firstName: 'Modératrice',
    lastName: 'Sally',
    email: 'moderator@gowithsally.ma',
    phone: '+212600000002',
    password: 'Moderator@2024',
    dateOfBirth: new Date('1993-12-20'),
    role: 'admin',
    isTestAccount: true
  }
];

// ============================================================================
// GÉNÉRATEUR PRINCIPAL
// ============================================================================

/**
 * Génère des utilisatrices aléatoires
 */
const generateUsers = (count = 20, options = {}) => {
  const {
    driverRatio = 0.25,
    hashPasswords = false,
    city = null
  } = options;
  
  const generatedUsers = [];
  const usedEmails = new Set();
  const usedPhones = new Set();
  
  for (let i = 0; i < count; i++) {
    const firstName = randomItem(femaleFirstNames);
    const lastName = randomItem(lastNames);
    const userCity = city || randomItem(cities.filter(c => c.active));
    const isDriver = Math.random() < driverRatio;
    
    // Email unique
    let email;
    let attempts = 0;
    do {
      const suffix = attempts > 0 ? `${i}${attempts}` : (i > 0 ? i : '');
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}${suffix}@test.com`;
      attempts++;
    } while (usedEmails.has(email) && attempts < 10);
    usedEmails.add(email);
    
    // Téléphone unique
    let phone;
    do {
      phone = generatePhone();
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    
    // Stats
    const monthsActive = randomInt(1, 24);
    const ridesPerMonth = isDriver ? 0 : randomInt(2, 8);
    const totalRides = ridesPerMonth * monthsActive;
    const completedRides = Math.floor(totalRides * (0.85 + Math.random() * 0.15));
    const cancelledRides = totalRides - completedRides;
    const avgRating = completedRides > 0 ? 4 + Math.random() * 0.95 : 1;
    const points = completedRides * 10 + randomInt(0, 100);
    const level = getUserLevel(completedRides, points);
    const referrals = randomInt(0, 10);
    const badges = generateUserBadges(completedRides, referrals, avgRating);
    
    // Vérifications
    const phoneVerified = Math.random() > 0.1;
    const emailVerified = Math.random() > 0.2;
    const faceVerified = phoneVerified && emailVerified && Math.random() > 0.3;
    
    // Password
    const plainPassword = 'password123';
    const password = hashPasswords ? hashPasswordSync(plainPassword) : plainPassword;
    
    // Contacts d'urgence
    const emergencyContacts = [];
    const contactCount = randomInt(0, 3);
    for (let j = 0; j < contactCount; j++) {
      emergencyContacts.push({
        _id: generateObjectId(),
        name: randomItem(femaleFirstNames),
        phone: generatePhone(),
        relationship: randomItem(relationships).key,
        isPrimary: j === 0
      });
    }
    
    // Lieux sauvegardés
    const savedPlaces = [];
    if (Math.random() > 0.3) {
      savedPlaces.push({
        _id: generateObjectId(),
        name: 'Maison',
        type: 'home',
        address: `${randomInt(1, 200)} Rue ${randomItem(['Mohammed V', 'Hassan II', 'Allal Ben Abdellah', 'Ibn Batouta'])}, ${userCity.name}`,
        location: {
          type: 'Point',
          coordinates: [userCity.lng + (Math.random() - 0.5) * 0.05, userCity.lat + (Math.random() - 0.5) * 0.05]
        },
        icon: placeTypes.HOME.icon,
        color: placeTypes.HOME.color
      });
    }
    if (Math.random() > 0.5) {
      savedPlaces.push({
        _id: generateObjectId(),
        name: 'Travail',
        type: 'work',
        address: `${randomItem(['Twin Center', 'Casa Finance City', 'Technopark', 'Marina Shopping'])}, ${userCity.name}`,
        location: {
          type: 'Point',
          coordinates: [userCity.lng + (Math.random() - 0.5) * 0.05, userCity.lat + (Math.random() - 0.5) * 0.05]
        },
        icon: placeTypes.WORK.icon,
        color: placeTypes.WORK.color
      });
    }
    
    // Cartes de paiement
    const paymentCards = [];
    if (Math.random() > 0.6) {
      paymentCards.push({
        _id: generateObjectId(),
        last4: randomInt(1000, 9999).toString(),
        brand: randomItem(['visa', 'mastercard']),
        expiryMonth: randomInt(1, 12),
        expiryYear: new Date().getFullYear() + randomInt(1, 5),
        isDefault: true,
        nickname: 'Ma carte'
      });
    }
    
    const user = {
      _id: generateObjectId(),
      
      // Identité
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth: generateBirthDate(),
      gender: 'female',
      
      // Rôle et statut
      role: isDriver ? 'driver' : 'user',
      status: 'active',
      isActive: Math.random() > 0.05,
      
      // Vérifications
      phoneVerified,
      phoneVerifiedAt: phoneVerified ? generatePastDate(30, 365) : null,
      emailVerified,
      emailVerifiedAt: emailVerified ? generatePastDate(30, 365) : null,
      faceVerified,
      faceVerifiedAt: faceVerified ? generatePastDate(30, 180) : null,
      identityVerified: faceVerified && Math.random() > 0.3,
      
      // Profil
      preferredLanguage: randomItem(['fr', 'fr', 'fr', 'ar', 'en']),
      avatar: `https://randomuser.me/api/portraits/women/${10 + i}.jpg`,
      bio: null,
      
      // Localisation
      city: userCity.name,
      currentLocation: {
        type: 'Point',
        coordinates: [
          userCity.lng + (Math.random() - 0.5) * 0.1,
          userCity.lat + (Math.random() - 0.5) * 0.1
        ],
        updatedAt: new Date()
      },
      
      // Contacts et lieux
      emergencyContacts,
      savedPlaces,
      
      // Stats
      stats: {
        totalRides,
        completedRides,
        cancelledRides,
        averageRating: completedRides > 0 ? Math.round(avgRating * 100) / 100 : 1,
        totalRatings: Math.floor(completedRides * 0.7),
        totalSpent: completedRides * randomInt(30, 60),
        totalDistance: completedRides * randomInt(5, 15),
        referralsCount: referrals,
        referralsEarnings: referrals * 50
      },
      
      // Rating tags reçus
      ratingTags: passengerTags.reduce((acc, tag) => {
        acc[tag.key] = randomInt(0, Math.floor(completedRides * 0.5));
        return acc;
      }, {}),
      
      // Portefeuille
      wallet: {
        balance: randomInt(0, 500),
        currency: 'MAD',
        lastTopUp: Math.random() > 0.5 ? generatePastDate(1, 30) : null
      },
      
      // Paiement
      defaultPaymentMethod: randomItem(['cash', 'cash', 'card', 'wallet']),
      paymentCards,
      
      // Fidélité
      points,
      level: level.level,
      levelName: level.name,
      badges,
      
      // Parrainage
      referralCode: generateReferralCode(firstName),
      referredBy: null,  // ✅ FIX: Toujours null (schema attend ObjectId, pas string)
      
      // Préférences
      preferences: {
        ...defaultPreferences,
        notifications: {
          ...defaultPreferences.notifications,
          push: Math.random() > 0.1,
          email: Math.random() > 0.3,
          sms: Math.random() > 0.6,
          promotions: Math.random() > 0.4
        }
      },
      
      // Device info
      devices: [{
        _id: generateObjectId(),
        deviceId: `device_${Math.random().toString(36).substring(7)}`,
        platform: randomItem(['ios', 'android']),
        pushToken: Math.random() > 0.2 ? `token_${Math.random().toString(36).substring(7)}` : null,
        appVersion: `2.${randomInt(0, 5)}.${randomInt(0, 10)}`,
        lastActiveAt: generatePastDate(0, 7)
      }],
      
      // Social
      socialConnections: {
        google: Math.random() > 0.7,
        facebook: Math.random() > 0.8,
        apple: Math.random() > 0.9
      },
      
      // Dates
      lastLoginAt: generatePastDate(0, 14),
      lastActiveAt: generatePastDate(0, 7),
      createdAt: generatePastDate(monthsActive * 30, monthsActive * 30 + 30),
      updatedAt: new Date()
    };
    
    generatedUsers.push(user);
  }
  
  return generatedUsers;
};

/**
 * Crée une utilisatrice spécifique
 */
const createUser = (data = {}) => {
  const firstName = data.firstName || randomItem(femaleFirstNames);
  const lastName = data.lastName || randomItem(lastNames);
  
  return {
    _id: generateObjectId(),
    firstName,
    lastName,
    email: data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
    phone: data.phone || generatePhone(),
    password: data.password || 'password123',
    dateOfBirth: data.dateOfBirth || generateBirthDate(),
    gender: 'female',
    role: data.role || 'user',
    status: 'active',
    isActive: true,
    phoneVerified: false,
    emailVerified: false,
    faceVerified: false,
    preferredLanguage: data.preferredLanguage || 'fr',
    avatar: null,
    emergencyContacts: [],
    savedPlaces: [],
    stats: {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      averageRating: 1,
      totalRatings: 0,
      totalSpent: 0
    },
    wallet: { balance: 0, currency: 'MAD' },
    points: 0,
    level: 1,
    badges: [],
    referralCode: generateReferralCode(firstName),
    preferences: defaultPreferences,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Helpers
  generateObjectId,
  randomItem,
  randomInt,
  hashPassword,
  hashPasswordSync,
  
  // Data
  femaleFirstNames,
  lastNames,
  cities,
  relationships,
  
  // Constants
  userRoles,
  userStatuses,
  accountStatuses,
  userLevels,
  userBadges,
  passengerTags,
  placeTypes,
  paymentMethods,
  defaultPreferences,
  
  // Predefined
  predefinedUsers,
  
  // Generators
  generatePhone,
  generateReferralCode,
  generateBirthDate,
  generatePastDate,
  getUserLevel,
  generateUserBadges,
  generateUsers,
  createUser
};

console.log('📄 [seeds/data/users.js] ✅ v2.2.0 -', femaleFirstNames.length, 'prénoms,', cities.length, 'villes');