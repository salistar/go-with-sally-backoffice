/**
 * ============================================================================
 * GO WITH SALLY - ADMIN SEED DATA
 * ============================================================================
 * @version 2.0.0
 * Données de test pour la partie administration
 * ============================================================================
 */

const { Types } = require('mongoose');

// ============================================================================
// HELPERS
// ============================================================================

const generateObjectId = () => new Types.ObjectId();
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Génère un timestamp relatif en français
 */
const getRelativeTime = (date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  return `Il y a ${Math.floor(days / 30)} mois`;
};

/**
 * Génère une date passée
 */
const generatePastDate = (minMinutes = 5, maxMinutes = 10080) => {
  const minutes = randomInt(minMinutes, maxMinutes);
  return new Date(Date.now() - minutes * 60 * 1000);
};

// ============================================================================
// NOMS MAROCAINS
// ============================================================================

const femaleFirstNames = [
  'Fatima', 'Amina', 'Khadija', 'Sara', 'Yasmine', 'Houda', 'Leila', 'Nadia',
  'Salma', 'Zineb', 'Imane', 'Sanae', 'Hanane', 'Meryem', 'Ghita', 'Nisrine',
  'Loubna', 'Asmae', 'Nawal', 'Hajar', 'Rim', 'Soukaina', 'Ikram', 'Rajae'
];

const lastNames = [
  'Benali', 'El Amrani', 'Tazi', 'Bennani', 'Alaoui', 'Cherkaoui', 'Mansouri',
  'Filali', 'Ouazzani', 'Rahmouni', 'Berrada', 'Kettani', 'Lahlou', 'Marrakchi',
  'Sefrioui', 'Fassi', 'Idrissi', 'Benjelloun', 'Chraibi', 'Daoudi'
];

const generateName = () => ({
  firstName: randomItem(femaleFirstNames),
  lastName: randomItem(lastNames)
});

// ============================================================================
// TYPES D'ACTIVITÉS ADMIN
// ============================================================================

const activityTypes = {
  VERIFICATION: { key: 'verification', label: 'Vérification', icon: '📋', color: '#3498db' },
  RIDE: { key: 'ride', label: 'Course', icon: '🚗', color: '#2ecc71' },
  USER: { key: 'user', label: 'Utilisatrice', icon: '👤', color: '#9b59b6' },
  DRIVER: { key: 'driver', label: 'Conductrice', icon: '🚘', color: '#e67e22' },
  PAYMENT: { key: 'payment', label: 'Paiement', icon: '💰', color: '#f1c40f' },
  SYSTEM: { key: 'system', label: 'Système', icon: '⚙️', color: '#95a5a6' },
  REPORT: { key: 'report', label: 'Signalement', icon: '⚠️', color: '#e74c3c' },
  SUPPORT: { key: 'support', label: 'Support', icon: '🎧', color: '#1abc9c' },
  SECURITY: { key: 'security', label: 'Sécurité', icon: '🔒', color: '#c0392b' },
  PROMO: { key: 'promo', label: 'Promotion', icon: '🎁', color: '#8e44ad' }
};

const activityPriorities = {
  LOW: { key: 'low', label: 'Basse', color: '#95a5a6', weight: 10 },
  NORMAL: { key: 'normal', label: 'Normale', color: '#3498db', weight: 60 },
  HIGH: { key: 'high', label: 'Haute', color: '#e67e22', weight: 25 },
  CRITICAL: { key: 'critical', label: 'Critique', color: '#e74c3c', weight: 5 }
};

// ============================================================================
// ACTIONS PAR TYPE
// ============================================================================

const activityActions = {
  verification: [
    { action: 'document_submitted', label: 'Document soumis', template: '{name} a soumis {document}' },
    { action: 'document_approved', label: 'Document approuvé', template: '{name} - {document} approuvé' },
    { action: 'document_rejected', label: 'Document rejeté', template: '{name} - {document} rejeté ({reason})' },
    { action: 'driver_approved', label: 'Conductrice approuvée', template: '{name} a été approuvée' },
    { action: 'driver_rejected', label: 'Conductrice rejetée', template: '{name} a été rejetée' },
    { action: 'face_verified', label: 'Visage vérifié', template: '{name} - Vérification faciale réussie' },
    { action: 'face_failed', label: 'Échec vérification', template: '{name} - Échec vérification faciale' },
    { action: 'resubmission_requested', label: 'Resoumission demandée', template: '{name} - Nouvelle soumission demandée' }
  ],
  ride: [
    { action: 'ride_completed', label: 'Course terminée', template: 'Course #{rideCode} terminée - {amount} DH' },
    { action: 'ride_cancelled', label: 'Course annulée', template: 'Course #{rideCode} annulée par {cancelledBy}' },
    { action: 'sos_triggered', label: 'SOS déclenché', template: '🚨 Alerte SOS sur course #{rideCode}' },
    { action: 'sos_resolved', label: 'SOS résolu', template: 'SOS sur course #{rideCode} résolu' },
    { action: 'dispute_opened', label: 'Litige ouvert', template: 'Contestation sur course #{rideCode}' },
    { action: 'dispute_resolved', label: 'Litige résolu', template: 'Litige #{rideCode} résolu' },
    { action: 'rating_flagged', label: 'Évaluation signalée', template: 'Évaluation suspecte sur #{rideCode}' }
  ],
  user: [
    { action: 'user_registered', label: 'Inscription', template: '{name} s\'est inscrite' },
    { action: 'user_verified', label: 'Compte vérifié', template: '{name} - Compte vérifié' },
    { action: 'user_blocked', label: 'Compte bloqué', template: '{name} a été bloquée ({reason})' },
    { action: 'user_unblocked', label: 'Compte débloqué', template: '{name} a été débloquée' },
    { action: 'user_deleted', label: 'Compte supprimé', template: '{name} - Compte supprimé' },
    { action: 'phone_verified', label: 'Téléphone vérifié', template: '{name} a vérifié son téléphone' },
    { action: 'email_verified', label: 'Email vérifié', template: '{name} a vérifié son email' },
    { action: 'profile_updated', label: 'Profil mis à jour', template: '{name} a mis à jour son profil' }
  ],
  driver: [
    { action: 'driver_registered', label: 'Nouvelle inscription', template: '{name} s\'est inscrite comme conductrice' },
    { action: 'driver_approved', label: 'Conductrice approuvée', template: '{name} a été approuvée' },
    { action: 'driver_suspended', label: 'Conductrice suspendue', template: '{name} suspendue ({reason})' },
    { action: 'driver_reactivated', label: 'Conductrice réactivée', template: '{name} a été réactivée' },
    { action: 'driver_online', label: 'Passage en ligne', template: '{name} est passée en ligne' },
    { action: 'driver_offline', label: 'Passage hors ligne', template: '{name} est passée hors ligne' },
    { action: 'document_expiring', label: 'Document expire bientôt', template: '{name} - {document} expire dans {days} jours' },
    { action: 'document_expired', label: 'Document expiré', template: '{name} - {document} expiré' },
    { action: 'badge_earned', label: 'Badge obtenu', template: '{name} a obtenu le badge {badge}' }
  ],
  payment: [
    { action: 'payment_received', label: 'Paiement reçu', template: 'Paiement de {amount} DH reçu - #{rideCode}' },
    { action: 'payment_failed', label: 'Paiement échoué', template: 'Échec paiement {amount} DH - #{rideCode}' },
    { action: 'withdrawal_requested', label: 'Retrait demandé', template: '{name} a demandé un retrait de {amount} DH' },
    { action: 'withdrawal_completed', label: 'Retrait effectué', template: 'Retrait de {amount} DH effectué pour {name}' },
    { action: 'withdrawal_failed', label: 'Retrait échoué', template: 'Échec retrait {amount} DH pour {name}' },
    { action: 'refund_processed', label: 'Remboursement', template: 'Remboursement de {amount} DH - #{rideCode}' },
    { action: 'wallet_recharged', label: 'Recharge portefeuille', template: '{name} a rechargé {amount} DH' },
    { action: 'commission_collected', label: 'Commission collectée', template: 'Commission {amount} DH - #{rideCode}' }
  ],
  system: [
    { action: 'settings_updated', label: 'Paramètres mis à jour', template: 'Paramètres {category} mis à jour par {admin}' },
    { action: 'backup_completed', label: 'Sauvegarde effectuée', template: 'Sauvegarde automatique effectuée' },
    { action: 'maintenance_scheduled', label: 'Maintenance planifiée', template: 'Maintenance planifiée pour {date}' },
    { action: 'maintenance_started', label: 'Maintenance démarrée', template: 'Maintenance en cours' },
    { action: 'maintenance_completed', label: 'Maintenance terminée', template: 'Maintenance terminée' },
    { action: 'surge_activated', label: 'Surge activé', template: 'Tarification dynamique activée x{multiplier}' },
    { action: 'surge_deactivated', label: 'Surge désactivé', template: 'Tarification dynamique désactivée' },
    { action: 'alert_triggered', label: 'Alerte système', template: 'Alerte: {message}' }
  ],
  report: [
    { action: 'report_created', label: 'Signalement créé', template: 'Nouveau signalement #{reportId} - {category}' },
    { action: 'report_assigned', label: 'Signalement assigné', template: 'Signalement #{reportId} assigné à {agent}' },
    { action: 'report_resolved', label: 'Signalement résolu', template: 'Signalement #{reportId} résolu' },
    { action: 'report_escalated', label: 'Signalement escaladé', template: 'Signalement #{reportId} escaladé' },
    { action: 'report_closed', label: 'Signalement fermé', template: 'Signalement #{reportId} fermé' }
  ],
  support: [
    { action: 'ticket_created', label: 'Ticket créé', template: 'Nouveau ticket #{ticketId} - {subject}' },
    { action: 'ticket_assigned', label: 'Ticket assigné', template: 'Ticket #{ticketId} assigné à {agent}' },
    { action: 'ticket_replied', label: 'Réponse ticket', template: 'Réponse sur ticket #{ticketId}' },
    { action: 'ticket_resolved', label: 'Ticket résolu', template: 'Ticket #{ticketId} résolu' },
    { action: 'ticket_escalated', label: 'Ticket escaladé', template: 'Ticket #{ticketId} escaladé' },
    { action: 'ticket_reopened', label: 'Ticket rouvert', template: 'Ticket #{ticketId} rouvert' }
  ],
  security: [
    { action: 'suspicious_login', label: 'Connexion suspecte', template: 'Connexion suspecte détectée pour {name}' },
    { action: 'account_locked', label: 'Compte verrouillé', template: '{name} - Compte verrouillé (tentatives multiples)' },
    { action: 'password_reset', label: 'Réinitialisation MDP', template: '{name} a réinitialisé son mot de passe' },
    { action: 'fraud_detected', label: 'Fraude détectée', template: 'Fraude potentielle détectée - {details}' },
    { action: 'ip_blocked', label: 'IP bloquée', template: 'IP {ip} bloquée' }
  ],
  promo: [
    { action: 'promo_created', label: 'Promo créée', template: 'Code promo {code} créé - {discount}%' },
    { action: 'promo_activated', label: 'Promo activée', template: 'Code promo {code} activé' },
    { action: 'promo_deactivated', label: 'Promo désactivée', template: 'Code promo {code} désactivé' },
    { action: 'promo_expired', label: 'Promo expirée', template: 'Code promo {code} expiré' },
    { action: 'promo_used', label: 'Promo utilisée', template: 'Code {code} utilisé par {name}' }
  ]
};

// ============================================================================
// STATUTS VÉRIFICATION
// ============================================================================

const verificationStatuses = {
  PENDING: { key: 'pending', label: 'En attente', color: '#f39c12', icon: '⏳' },
  PENDING_DOCUMENTS: { key: 'pending_documents', label: 'Documents manquants', color: '#e67e22', icon: '📄' },
  PENDING_FACE: { key: 'pending_face_verification', label: 'Vérification faciale', color: '#9b59b6', icon: '👤' },
  IN_REVIEW: { key: 'in_review', label: 'En cours de vérification', color: '#3498db', icon: '🔍' },
  APPROVED: { key: 'approved', label: 'Approuvée', color: '#27ae60', icon: '✅' },
  REJECTED: { key: 'rejected', label: 'Rejetée', color: '#e74c3c', icon: '❌' },
  DOCUMENTS_REJECTED: { key: 'documents_rejected', label: 'Documents rejetés', color: '#c0392b', icon: '📛' }
};

const documentTypes = {
  NATIONAL_ID: { key: 'nationalId', label: 'Carte d\'identité', required: true },
  DRIVING_LICENSE: { key: 'drivingLicense', label: 'Permis de conduire', required: true },
  CRIMINAL_RECORD: { key: 'criminalRecord', label: 'Casier judiciaire', required: true },
  VEHICLE_REGISTRATION: { key: 'vehicleRegistration', label: 'Carte grise', required: true },
  INSURANCE: { key: 'insurance', label: 'Assurance', required: true },
  TECHNICAL_INSPECTION: { key: 'technicalInspection', label: 'Visite technique', required: true },
  PROFILE_PHOTO: { key: 'profilePhoto', label: 'Photo de profil', required: true },
  SELFIE_VERIFICATION: { key: 'selfieVerification', label: 'Selfie vérification', required: true }
};

// ============================================================================
// TYPES DE SIGNALEMENTS
// ============================================================================

const reportTypes = {
  RIDE_ISSUE: { key: 'ride_issue', label: 'Problème de course', icon: '🚗' },
  PAYMENT_ISSUE: { key: 'payment_issue', label: 'Problème de paiement', icon: '💰' },
  SAFETY_CONCERN: { key: 'safety_concern', label: 'Problème de sécurité', icon: '🛡️' },
  BEHAVIOR: { key: 'behavior', label: 'Comportement', icon: '⚠️' },
  APP_BUG: { key: 'app_bug', label: 'Bug application', icon: '🐛' },
  DRIVER_COMPLAINT: { key: 'driver_complaint', label: 'Plainte conductrice', icon: '🚘' },
  USER_COMPLAINT: { key: 'user_complaint', label: 'Plainte passagère', icon: '👤' },
  FRAUD: { key: 'fraud', label: 'Fraude', icon: '🚨' },
  OTHER: { key: 'other', label: 'Autre', icon: '❓' }
};

const reportStatuses = {
  OPEN: { key: 'open', label: 'Ouvert', color: '#e74c3c' },
  IN_PROGRESS: { key: 'in_progress', label: 'En cours', color: '#f39c12' },
  WAITING_USER: { key: 'waiting_user', label: 'En attente réponse', color: '#9b59b6' },
  RESOLVED: { key: 'resolved', label: 'Résolu', color: '#27ae60' },
  CLOSED: { key: 'closed', label: 'Fermé', color: '#95a5a6' },
  ESCALATED: { key: 'escalated', label: 'Escaladé', color: '#c0392b' }
};

const reportCategories = [
  'comportement', 'facturation', 'sécurité', 'technique', 'retard',
  'véhicule', 'trajet', 'annulation', 'communication', 'autre'
];

// ============================================================================
// PARAMÈTRES SYSTÈME
// ============================================================================

const systemSettings = {
  // Tarification
  pricing: {
    baseFare: 8,
    pricePerKm: 5,
    pricePerMinute: 0.5,
    minimumFare: 15,
    bookingFee: 3,
    cancellationFee: 10,
    noShowFee: 15,
    commission: 0.15,
    currency: 'MAD',
    surgeMultiplier: {
      low: { threshold: 0.5, multiplier: 1.0 },
      medium: { threshold: 0.7, multiplier: 1.25 },
      high: { threshold: 0.85, multiplier: 1.5 },
      veryHigh: { threshold: 0.95, multiplier: 2.0 }
    },
    peakHours: {
      morning: { start: '07:00', end: '09:30', multiplier: 1.2 },
      evening: { start: '17:00', end: '20:00', multiplier: 1.25 },
      night: { start: '22:00', end: '06:00', multiplier: 1.15 }
    }
  },
  
  // Types de courses
  rideTypes: {
    sally_eco: { 
      name: 'Sally Eco', 
      multiplier: 0.85, 
      icon: '🌱', 
      description: 'Économique et écologique',
      minVehicleYear: 2015,
      active: true
    },
    sally_standard: { 
      name: 'Sally Standard', 
      multiplier: 1.0, 
      icon: '🚗', 
      description: 'Confort quotidien',
      minVehicleYear: 2018,
      active: true
    },
    sally_confort: { 
      name: 'Sally Confort', 
      multiplier: 1.3, 
      icon: '✨', 
      description: 'Véhicules premium',
      minVehicleYear: 2020,
      active: true
    },
    sally_premium: { 
      name: 'Sally Premium', 
      multiplier: 1.8, 
      icon: '💎', 
      description: 'Luxe et élégance',
      minVehicleYear: 2021,
      active: true
    },
    sally_xl: { 
      name: 'Sally XL', 
      multiplier: 1.5, 
      icon: '🚐', 
      description: '6-7 places',
      minVehicleYear: 2018,
      active: true
    },
    sally_pool: { 
      name: 'Sally Pool', 
      multiplier: 0.6, 
      icon: '👥', 
      description: 'Covoiturage',
      minVehicleYear: 2018,
      active: false
    }
  },
  
  // Vérification
  verification: {
    autoApprove: false,
    requireFaceVerification: true,
    faceVerificationThreshold: 0.85,
    requirePhoneVerification: true,
    requireEmailVerification: true,
    documentExpiryWarningDays: 30,
    documentExpiryBlockDays: 0,
    maxRejections: 3,
    cooldownAfterRejection: 7, // jours
    requiredDocuments: Object.keys(documentTypes)
  },
  
  // Sécurité
  safety: {
    sosEnabled: true,
    sosAutoCall: true,
    sosEmergencyNumber: '19',
    locationSharingEnabled: true,
    locationSharingInterval: 30, // secondes
    emergencyContactsRequired: false,
    maxEmergencyContacts: 5,
    rideRecordingEnabled: false,
    backgroundCheckRequired: true,
    safetyCheckInterval: 30, // minutes pendant la course
    autoSafetyCheckEnabled: true
  },
  
  // Notifications
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: true,
    marketingEnabled: true,
    rideUpdatesEnabled: true,
    paymentUpdatesEnabled: true,
    promoNotificationsEnabled: true,
    quietHours: {
      enabled: true,
      start: '23:00',
      end: '07:00'
    }
  },
  
  // Application
  app: {
    maintenanceMode: false,
    maintenanceMessage: null,
    version: '2.0.0',
    minAppVersion: '1.5.0',
    forceUpdate: false,
    environment: 'production',
    supportEmail: 'support@gowithsally.ma',
    supportPhone: '+212 5 22 00 00 00',
    supportWhatsapp: '+212 6 00 00 00 00',
    socialMedia: {
      facebook: 'https://facebook.com/gowithsally',
      instagram: 'https://instagram.com/gowithsally',
      twitter: 'https://twitter.com/gowithsally'
    }
  },
  
  // Limites
  limits: {
    maxActiveRidesPerUser: 1,
    maxActiveRidesPerDriver: 1,
    maxScheduledRidesPerUser: 3,
    maxSearchRadius: 15000, // mètres
    minSearchRadius: 1000,
    maxWaitTime: 600, // secondes
    rideTimeoutSeconds: 30,
    maxStopsPerRide: 3,
    maxCancellationsPerDay: 5,
    suspensionAfterCancellations: 10,
    maxLoginAttempts: 5,
    lockoutDuration: 30 // minutes
  },
  
  // Fidélité
  loyalty: {
    enabled: true,
    pointsPerRide: 10,
    pointsPerDH: 1,
    pointsPerReferral: 100,
    referralBonus: 50, // DH
    referredBonus: 25, // DH
    pointsExpiryMonths: 12,
    levels: [
      { name: 'Bronze', minPoints: 0, discount: 0, icon: '🥉' },
      { name: 'Argent', minPoints: 500, discount: 0.02, icon: '🥈' },
      { name: 'Or', minPoints: 1500, discount: 0.05, icon: '🥇' },
      { name: 'Platine', minPoints: 5000, discount: 0.08, icon: '💎' },
      { name: 'Élite', minPoints: 15000, discount: 0.12, icon: '👑' }
    ]
  },
  
  // Zones géographiques
  zones: {
    casablanca: {
      name: 'Casablanca',
      active: true,
      center: { lat: 33.5731, lng: -7.5898 },
      radius: 30000, // mètres
      surgeEnabled: true
    },
    rabat: {
      name: 'Rabat',
      active: false,
      center: { lat: 34.0209, lng: -6.8416 },
      radius: 20000,
      surgeEnabled: true
    },
    marrakech: {
      name: 'Marrakech',
      active: false,
      center: { lat: 31.6295, lng: -7.9811 },
      radius: 25000,
      surgeEnabled: true
    }
  }
};

// ============================================================================
// VÉRIFICATIONS EN ATTENTE PRÉDÉFINIES
// ============================================================================

const predefinedVerifications = [
  {
    status: 'pending',
    documentsStatus: { nationalId: true, drivingLicense: true, insurance: true, vehicleRegistration: true, profilePhoto: true },
    vehicle: { brand: 'Renault', model: 'Clio', year: 2021, color: 'Gris' },
    submittedAt: generatePastDate(60, 180)
  },
  {
    status: 'pending_documents',
    documentsStatus: { nationalId: true, drivingLicense: true, insurance: true, vehicleRegistration: false, profilePhoto: true },
    vehicle: { brand: 'Dacia', model: 'Sandero', year: 2020, color: 'Blanc' },
    notes: ['Carte grise manquante'],
    submittedAt: generatePastDate(1440, 2880)
  },
  {
    status: 'pending_face_verification',
    documentsStatus: { nationalId: true, drivingLicense: true, insurance: true, vehicleRegistration: true, profilePhoto: false },
    vehicle: { brand: 'Peugeot', model: '208', year: 2022, color: 'Rouge' },
    notes: ['En attente de vérification faciale'],
    submittedAt: generatePastDate(240, 480)
  },
  {
    status: 'documents_rejected',
    documentsStatus: { nationalId: true, drivingLicense: false, insurance: true, vehicleRegistration: true, profilePhoto: true },
    rejectReason: 'Photo du permis floue',
    vehicle: { brand: 'Hyundai', model: 'i20', year: 2021, color: 'Bleu' },
    submittedAt: generatePastDate(2880, 4320)
  },
  {
    status: 'in_review',
    documentsStatus: { nationalId: true, drivingLicense: true, insurance: true, vehicleRegistration: true, profilePhoto: true },
    vehicle: { brand: 'Toyota', model: 'Yaris', year: 2023, color: 'Noir' },
    submittedAt: generatePastDate(30, 120)
  }
];

// ============================================================================
// SIGNALEMENTS PRÉDÉFINIS
// ============================================================================

const predefinedReports = [
  {
    type: 'ride_issue',
    status: 'open',
    priority: 'high',
    category: 'comportement',
    description: 'La conductrice était au téléphone pendant tout le trajet'
  },
  {
    type: 'payment_issue',
    status: 'in_progress',
    priority: 'medium',
    category: 'facturation',
    description: 'Montant facturé supérieur à l\'estimation initiale'
  },
  {
    type: 'safety_concern',
    status: 'resolved',
    priority: 'critical',
    category: 'sécurité',
    description: 'Conduite dangereuse - Excès de vitesse',
    resolution: 'Avertissement envoyé à la conductrice. Suspension temporaire de 3 jours.'
  },
  {
    type: 'app_bug',
    status: 'open',
    priority: 'low',
    category: 'technique',
    description: 'L\'application crash lors de l\'ajout d\'une carte bancaire'
  },
  {
    type: 'driver_complaint',
    status: 'in_progress',
    priority: 'medium',
    category: 'comportement',
    description: 'Passagère impolie et agressive verbalement'
  }
];

// ============================================================================
// STATISTIQUES DASHBOARD
// ============================================================================

const dashboardStats = {
  realtime: {
    activeDrivers: 45,
    availableDrivers: 32,
    activeRides: 28,
    pendingRequests: 5,
    avgWaitTime: 4.2, // minutes
    avgETA: 6.5 // minutes
  },
  today: {
    rides: 156,
    revenue: 5480,
    newUsers: 23,
    newDrivers: 3,
    avgRating: 4.7,
    cancelRate: 0.08,
    completionRate: 0.92,
    avgFare: 35.1
  },
  week: {
    rides: 1089,
    revenue: 38150,
    newUsers: 145,
    newDrivers: 18,
    avgRating: 4.72,
    cancelRate: 0.07,
    growth: 0.12
  },
  month: {
    rides: 4520,
    revenue: 158200,
    newUsers: 580,
    newDrivers: 65,
    avgRating: 4.75,
    cancelRate: 0.065,
    growth: 0.18
  }
};

/**
 * Données horaires pour graphiques
 */
const hourlyData = Array.from({ length: 24 }, (_, hour) => {
  // Simulation réaliste du trafic
  let baseRides = 5;
  if (hour >= 7 && hour <= 9) baseRides = 40; // Rush matin
  else if (hour >= 12 && hour <= 14) baseRides = 30; // Midi
  else if (hour >= 17 && hour <= 20) baseRides = 50; // Rush soir
  else if (hour >= 21 && hour <= 23) baseRides = 25; // Soirée
  else if (hour >= 0 && hour <= 5) baseRides = 3; // Nuit
  else baseRides = 20;
  
  const rides = baseRides + randomInt(-5, 10);
  const avgFare = 35 + randomInt(-5, 10);
  
  return {
    hour: `${hour.toString().padStart(2, '0')}h`,
    rides: Math.max(0, rides),
    revenue: Math.max(0, rides * avgFare),
    avgWaitTime: 3 + Math.random() * 5,
    activeDrivers: Math.floor(rides * 1.5) + randomInt(10, 30)
  };
});

/**
 * Données par zone
 */
const zoneStats = [
  { zone: 'Maarif', rides: 245, revenue: 8575, avgRating: 4.8, activeDrivers: 12 },
  { zone: 'Anfa', rides: 198, revenue: 8910, avgRating: 4.75, activeDrivers: 8 },
  { zone: 'Gauthier', rides: 176, revenue: 6160, avgRating: 4.7, activeDrivers: 10 },
  { zone: 'Ain Diab', rides: 134, revenue: 6030, avgRating: 4.85, activeDrivers: 6 },
  { zone: 'Sidi Maarouf', rides: 156, revenue: 5460, avgRating: 4.65, activeDrivers: 8 },
  { zone: 'Bourgogne', rides: 112, revenue: 3920, avgRating: 4.6, activeDrivers: 5 },
  { zone: 'Hay Hassani', rides: 89, revenue: 3115, avgRating: 4.55, activeDrivers: 4 },
  { zone: 'Autres', rides: 178, revenue: 6230, avgRating: 4.5, activeDrivers: 7 }
];

/**
 * Top conductrices
 */
const topDriversData = [
  { name: 'Amina El Amrani', rides: 542, earnings: 45600, rating: 4.92, badge: 'elite' },
  { name: 'Khadija Tazi', rides: 428, earnings: 36200, rating: 4.88, badge: 'platinum' },
  { name: 'Salma Bennani', rides: 385, earnings: 32500, rating: 4.85, badge: 'gold' },
  { name: 'Houda Chaoui', rides: 356, earnings: 30100, rating: 4.82, badge: 'gold' },
  { name: 'Zineb Alaoui', rides: 312, earnings: 26400, rating: 4.80, badge: 'gold' },
  { name: 'Fatima Zahra Berrada', rides: 298, earnings: 25200, rating: 4.78, badge: 'silver' },
  { name: 'Nisrine Kettani', rides: 276, earnings: 23400, rating: 4.75, badge: 'silver' },
  { name: 'Sanae Lahlou', rides: 254, earnings: 21500, rating: 4.73, badge: 'silver' },
  { name: 'Imane Marrakchi', rides: 232, earnings: 19600, rating: 4.71, badge: 'silver' },
  { name: 'Ghita Sefrioui', rides: 218, earnings: 18400, rating: 4.70, badge: 'bronze' }
];

// ============================================================================
// GÉNÉRATEURS
// ============================================================================

/**
 * Génère des activités admin aléatoires
 */
const generateActivities = (count = 50) => {
  const activities = [];
  const typeKeys = Object.keys(activityActions);
  
  for (let i = 0; i < count; i++) {
    const typeKey = randomItem(typeKeys);
    const typeActions = activityActions[typeKey];
    const actionData = randomItem(typeActions);
    const { firstName, lastName } = generateName();
    const date = generatePastDate(5, 10080);
    
    // Générer la description
    let description = actionData.template
      .replace('{name}', `${firstName} ${lastName}`)
      .replace('{document}', randomItem(['CIN', 'Permis', 'Assurance', 'Carte grise']))
      .replace('{reason}', randomItem(['Photo floue', 'Document expiré', 'Fraude suspectée', 'Plaintes multiples']))
      .replace('{rideCode}', `R${randomInt(1000, 9999)}`)
      .replace('{amount}', randomInt(20, 200))
      .replace('{cancelledBy}', randomItem(['la passagère', 'la conductrice']))
      .replace('{reportId}', `S${randomInt(100, 999)}`)
      .replace('{ticketId}', `T${randomInt(100, 999)}`)
      .replace('{agent}', randomItem(['support@gowithsally.ma', 'admin@gowithsally.ma']))
      .replace('{subject}', randomItem(['Problème paiement', 'Réclamation', 'Question']))
      .replace('{category}', randomItem(['tarification', 'sécurité', 'général']))
      .replace('{admin}', 'Admin')
      .replace('{date}', 'demain 03:00-05:00')
      .replace('{multiplier}', randomItem(['1.25', '1.5', '2.0']))
      .replace('{message}', 'Charge serveur élevée')
      .replace('{badge}', randomItem(['Bronze', 'Argent', 'Or']))
      .replace('{days}', randomInt(3, 30))
      .replace('{code}', `SALLY${randomInt(10, 30)}`)
      .replace('{discount}', randomInt(10, 30))
      .replace('{details}', 'Paiements suspects')
      .replace('{ip}', `196.200.${randomInt(1, 255)}.${randomInt(1, 255)}`);
    
    // Priorité
    const priorities = Object.values(activityPriorities);
    const totalWeight = priorities.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let priority = 'normal';
    for (const p of priorities) {
      random -= p.weight;
      if (random <= 0) {
        priority = p.key;
        break;
      }
    }
    
    activities.push({
      _id: generateObjectId(),
      type: typeKey,
      action: actionData.action,
      label: actionData.label,
      description,
      priority,
      icon: activityTypes[typeKey.toUpperCase()]?.icon || '📌',
      timestamp: getRelativeTime(date),
      createdAt: date,
      metadata: {}
    });
  }
  
  // Trier par date
  activities.sort((a, b) => b.createdAt - a.createdAt);
  
  return activities;
};

/**
 * Génère des vérifications en attente
 */
const generateVerifications = (count = 10) => {
  const verifications = [];
  
  for (let i = 0; i < count; i++) {
    const { firstName, lastName } = generateName();
    const template = randomItem(predefinedVerifications);
    const date = generatePastDate(30, 4320);
    
    verifications.push({
      _id: generateObjectId(),
      driver: {
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}@test.com`,
        phone: `+2126${randomInt(10000000, 99999999)}`,
        avatar: `https://randomuser.me/api/portraits/women/${25 + i}.jpg`
      },
      status: template.status,
      documents: template.documentsStatus,
      vehicle: template.vehicle,
      notes: template.notes || [],
      rejectReason: template.rejectReason || null,
      submittedAt: date,
      updatedAt: new Date()
    });
  }
  
  // Trier par date
  verifications.sort((a, b) => b.submittedAt - a.submittedAt);
  
  return verifications;
};

/**
 * Génère des signalements
 */
const generateReports = (count = 20) => {
  const reports = [];
  
  for (let i = 0; i < count; i++) {
    const reporter = generateName();
    const reported = generateName();
    const template = randomItem(predefinedReports);
    const date = generatePastDate(60, 10080);
    
    reports.push({
      _id: generateObjectId(),
      type: template.type,
      status: template.status,
      priority: template.priority,
      category: template.category,
      description: template.description,
      reportedBy: {
        type: Math.random() > 0.3 ? 'user' : 'driver',
        name: `${reporter.firstName} ${reporter.lastName}`,
        email: `${reporter.firstName.toLowerCase()}@test.com`
      },
      reportedAgainst: template.type !== 'app_bug' ? {
        type: Math.random() > 0.5 ? 'driver' : 'user',
        name: `${reported.firstName} ${reported.lastName}`,
        email: `${reported.firstName.toLowerCase()}@test.com`
      } : null,
      rideId: template.type !== 'app_bug' ? `ride_${randomInt(1000, 9999)}` : null,
      assignedTo: template.status !== 'open' ? 'support@gowithsally.ma' : null,
      resolution: template.resolution || null,
      createdAt: date,
      updatedAt: new Date(date.getTime() + randomInt(0, 48) * 60 * 60 * 1000)
    });
  }
  
  // Trier par date
  reports.sort((a, b) => b.createdAt - a.createdAt);
  
  return reports;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Helpers
  generateObjectId,
  randomItem,
  randomInt,
  getRelativeTime,
  generatePastDate,
  generateName,
  
  // Constants
  activityTypes,
  activityPriorities,
  activityActions,
  verificationStatuses,
  documentTypes,
  reportTypes,
  reportStatuses,
  reportCategories,
  
  // System settings
  systemSettings,
  
  // Predefined data
  predefinedVerifications,
  predefinedReports,
  
  // Dashboard stats
  dashboardStats,
  hourlyData,
  zoneStats,
  topDriversData,
  
  // Generators
  generateActivities,
  generateVerifications,
  generateReports
};

console.log('📄 [seeds/data/admin.js] ✅ Module chargé');