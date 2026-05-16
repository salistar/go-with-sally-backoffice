/**
 * ============================================================================
 * GO WITH SALLY - NOTIFICATIONS SEED DATA
 * ============================================================================
 * @version 2.0.0
 * Données de test pour les notifications
 * ============================================================================
 */

const { Types } = require('mongoose');

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Priorités des notifications
 */
const notificationPriorities = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Catégories de notifications
 */
const notificationCategories = {
  RIDE: 'ride',
  PROMO: 'promo',
  LOYALTY: 'loyalty',
  CHAT: 'chat',
  SOCIAL: 'social',
  DRIVER: 'driver',
  SAFETY: 'safety',
  PAYMENT: 'payment',
  SYSTEM: 'system'
};

/**
 * Icônes par défaut
 */
const defaultIcons = {
  ride: '🚗',
  promo: '🎁',
  loyalty: '⭐',
  chat: '💬',
  social: '👥',
  driver: '🚘',
  safety: '🛡️',
  payment: '💰',
  system: 'ℹ️'
};

// ============================================================================
// TYPES DE NOTIFICATIONS
// ============================================================================

const notificationTypes = {
  // ─────────────────────────────────────────────────────────────────────────
  // Notifications de course
  // ─────────────────────────────────────────────────────────────────────────
  RIDE_REQUESTED: {
    type: 'ride',
    key: 'ride_requested',
    title: 'Course demandée',
    template: 'Recherche d\'une conductrice en cours...',
    icon: '🔍',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  RIDE_DRIVER_FOUND: {
    type: 'ride',
    key: 'ride_driver_found',
    title: 'Conductrice trouvée! 🚗',
    template: '{driverName} arrive dans {eta} minutes',
    icon: '🚗',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  RIDE_DRIVER_ARRIVED: {
    type: 'ride',
    key: 'ride_driver_arrived',
    title: 'Conductrice arrivée! 📍',
    template: '{driverName} est arrivée et vous attend',
    icon: '📍',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  RIDE_STARTED: {
    type: 'ride',
    key: 'ride_started',
    title: 'Course démarrée',
    template: 'Bon voyage vers {destination}!',
    icon: '🚗',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  RIDE_COMPLETED: {
    type: 'ride',
    key: 'ride_completed',
    title: 'Course terminée ✅',
    template: 'Merci d\'avoir voyagé avec Go With Sally! Total: {amount} DH',
    icon: '✅',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  RIDE_CANCELLED: {
    type: 'ride',
    key: 'ride_cancelled',
    title: 'Course annulée',
    template: 'Votre course a été annulée. Raison: {reason}',
    icon: '❌',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  RIDE_RATING_REQUEST: {
    type: 'ride',
    key: 'ride_rating_request',
    title: 'Évaluez votre trajet ⭐',
    template: 'Comment s\'est passé votre trajet avec {driverName}?',
    icon: '⭐',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  RIDE_PRICE_UPDATED: {
    type: 'ride',
    key: 'ride_price_updated',
    title: 'Prix mis à jour',
    template: 'Le prix de votre course a été ajusté à {amount} DH',
    icon: '💵',
    priority: 'normal',
    sound: false,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications promotionnelles
  // ─────────────────────────────────────────────────────────────────────────
  PROMO_CODE: {
    type: 'promo',
    key: 'promo_code',
    title: '🎁 Code promo pour vous!',
    template: 'Utilisez le code {code} pour {discount}% de réduction',
    icon: '🎁',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  FLASH_SALE: {
    type: 'promo',
    key: 'flash_sale',
    title: '⚡ Offre flash!',
    template: 'Profitez de {discount}% de réduction pendant {duration}!',
    icon: '⚡',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  PROMO_EXPIRING: {
    type: 'promo',
    key: 'promo_expiring',
    title: '⏰ Promo bientôt expirée!',
    template: 'Votre code {code} expire dans {hours} heures',
    icon: '⏰',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  SPECIAL_OFFER: {
    type: 'promo',
    key: 'special_offer',
    title: '🌟 Offre spéciale',
    template: '{offerTitle} - Valable jusqu\'au {validUntil}',
    icon: '🌟',
    priority: 'normal',
    sound: false,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications de fidélité
  // ─────────────────────────────────────────────────────────────────────────
  POINTS_EARNED: {
    type: 'loyalty',
    key: 'points_earned',
    title: 'Points gagnés! 🌟',
    template: 'Vous avez gagné {points} points Sally',
    icon: '🌟',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  POINTS_EXPIRING: {
    type: 'loyalty',
    key: 'points_expiring',
    title: '⚠️ Points bientôt expirés',
    template: '{points} points expirent dans {days} jours',
    icon: '⚠️',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  LEVEL_UP: {
    type: 'loyalty',
    key: 'level_up',
    title: 'Niveau supérieur! 🎉',
    template: 'Félicitations! Vous êtes maintenant niveau {level}',
    icon: '🎉',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  BADGE_EARNED: {
    type: 'loyalty',
    key: 'badge_earned',
    title: 'Badge débloqué! 🏅',
    template: 'Vous avez obtenu le badge "{badgeName}"',
    icon: '🏅',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  REWARD_AVAILABLE: {
    type: 'loyalty',
    key: 'reward_available',
    title: '🎁 Récompense disponible!',
    template: 'Vous pouvez échanger vos points contre {rewardName}',
    icon: '🎁',
    priority: 'normal',
    sound: false,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications de chat
  // ─────────────────────────────────────────────────────────────────────────
  NEW_MESSAGE: {
    type: 'chat',
    key: 'new_message',
    title: 'Nouveau message',
    template: '{senderName}: {preview}',
    icon: '💬',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  MESSAGE_READ: {
    type: 'chat',
    key: 'message_read',
    title: 'Message lu',
    template: '{recipientName} a lu votre message',
    icon: '✓✓',
    priority: 'low',
    sound: false,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications sociales
  // ─────────────────────────────────────────────────────────────────────────
  FRIEND_REQUEST: {
    type: 'social',
    key: 'friend_request',
    title: 'Demande d\'amie',
    template: '{userName} souhaite vous ajouter',
    icon: '👥',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  FRIEND_ACCEPTED: {
    type: 'social',
    key: 'friend_accepted',
    title: 'Demande acceptée! 🎉',
    template: '{userName} a accepté votre demande',
    icon: '🎉',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  REFERRAL_BONUS: {
    type: 'social',
    key: 'referral_bonus',
    title: 'Bonus de parrainage! 💰',
    template: '{userName} s\'est inscrite avec votre code! +{bonus} DH',
    icon: '💰',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  REFERRAL_USED: {
    type: 'social',
    key: 'referral_used',
    title: 'Code parrainage utilisé',
    template: 'Votre filleule {userName} a effectué sa première course!',
    icon: '🎊',
    priority: 'normal',
    sound: true,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications conductrice
  // ─────────────────────────────────────────────────────────────────────────
  DRIVER_NEW_RIDE: {
    type: 'driver',
    key: 'driver_new_ride',
    title: 'Nouvelle demande de course! 🚗',
    template: 'Course vers {destination} - {price} DH',
    icon: '🚗',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  DRIVER_RIDE_CANCELLED: {
    type: 'driver',
    key: 'driver_ride_cancelled',
    title: 'Course annulée',
    template: 'La passagère a annulé la course',
    icon: '❌',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  DRIVER_EARNINGS: {
    type: 'driver',
    key: 'driver_earnings',
    title: 'Gains disponibles 💰',
    template: 'Vous avez {amount} DH disponibles au retrait',
    icon: '💰',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  DRIVER_WITHDRAWAL_COMPLETE: {
    type: 'driver',
    key: 'driver_withdrawal_complete',
    title: 'Retrait effectué ✅',
    template: '{amount} DH ont été transférés sur votre compte',
    icon: '✅',
    priority: 'high',
    sound: true,
    vibrate: false
  },
  DRIVER_DOCUMENT_EXPIRING: {
    type: 'driver',
    key: 'driver_document_expiring',
    title: '⚠️ Document bientôt expiré',
    template: 'Votre {documentType} expire dans {days} jours',
    icon: '⚠️',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  DRIVER_DOCUMENT_APPROVED: {
    type: 'driver',
    key: 'driver_document_approved',
    title: 'Document approuvé ✅',
    template: 'Votre {documentType} a été vérifié et approuvé',
    icon: '✅',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  DRIVER_DOCUMENT_REJECTED: {
    type: 'driver',
    key: 'driver_document_rejected',
    title: 'Document refusé ❌',
    template: 'Votre {documentType} a été refusé. Raison: {reason}',
    icon: '❌',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  DRIVER_RATING_RECEIVED: {
    type: 'driver',
    key: 'driver_rating_received',
    title: 'Nouvelle évaluation ⭐',
    template: 'Vous avez reçu {rating} étoiles de {passengerName}',
    icon: '⭐',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  DRIVER_TIP_RECEIVED: {
    type: 'driver',
    key: 'driver_tip_received',
    title: 'Pourboire reçu! 🎉',
    template: '{passengerName} vous a laissé {amount} DH de pourboire',
    icon: '🎉',
    priority: 'high',
    sound: true,
    vibrate: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications de paiement
  // ─────────────────────────────────────────────────────────────────────────
  PAYMENT_SUCCESS: {
    type: 'payment',
    key: 'payment_success',
    title: 'Paiement réussi ✅',
    template: '{amount} DH payés pour votre course',
    icon: '✅',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  PAYMENT_FAILED: {
    type: 'payment',
    key: 'payment_failed',
    title: 'Paiement échoué ❌',
    template: 'Le paiement de {amount} DH a échoué. Veuillez réessayer.',
    icon: '❌',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  WALLET_RECHARGED: {
    type: 'payment',
    key: 'wallet_recharged',
    title: 'Portefeuille rechargé 💳',
    template: '+{amount} DH ajoutés à votre portefeuille Sally',
    icon: '💳',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  REFUND_PROCESSED: {
    type: 'payment',
    key: 'refund_processed',
    title: 'Remboursement effectué 💰',
    template: '{amount} DH ont été remboursés',
    icon: '💰',
    priority: 'normal',
    sound: true,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications de sécurité
  // ─────────────────────────────────────────────────────────────────────────
  SAFETY_ALERT: {
    type: 'safety',
    key: 'safety_alert',
    title: '🚨 Alerte sécurité',
    template: '{userName} a déclenché une alerte SOS',
    icon: '🚨',
    priority: 'critical',
    sound: true,
    vibrate: true
  },
  SAFETY_CHECK: {
    type: 'safety',
    key: 'safety_check',
    title: 'Vérification de sécurité',
    template: 'Tout va bien? Confirmez que vous êtes en sécurité',
    icon: '🛡️',
    priority: 'high',
    sound: true,
    vibrate: true
  },
  LOCATION_SHARED: {
    type: 'safety',
    key: 'location_shared',
    title: 'Position partagée 📍',
    template: 'Votre position est partagée avec {contactName}',
    icon: '📍',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  EMERGENCY_CONTACT_ADDED: {
    type: 'safety',
    key: 'emergency_contact_added',
    title: 'Contact d\'urgence ajouté',
    template: '{contactName} a été ajouté comme contact d\'urgence',
    icon: '🛡️',
    priority: 'normal',
    sound: false,
    vibrate: false
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications système
  // ─────────────────────────────────────────────────────────────────────────
  SYSTEM_UPDATE: {
    type: 'system',
    key: 'system_update',
    title: 'Mise à jour disponible',
    template: 'Une nouvelle version de l\'app est disponible',
    icon: '🔄',
    priority: 'low',
    sound: false,
    vibrate: false
  },
  SYSTEM_MAINTENANCE: {
    type: 'system',
    key: 'system_maintenance',
    title: 'Maintenance prévue',
    template: 'L\'app sera en maintenance le {date} de {startTime} à {endTime}',
    icon: '🔧',
    priority: 'normal',
    sound: false,
    vibrate: false
  },
  WELCOME: {
    type: 'system',
    key: 'welcome',
    title: 'Bienvenue sur Go With Sally! 💖',
    template: 'Votre compte a été créé avec succès',
    icon: '👋',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  ACCOUNT_VERIFIED: {
    type: 'system',
    key: 'account_verified',
    title: 'Compte vérifié ✅',
    template: 'Votre compte a été vérifié avec succès',
    icon: '✅',
    priority: 'normal',
    sound: true,
    vibrate: false
  },
  PASSWORD_CHANGED: {
    type: 'system',
    key: 'password_changed',
    title: 'Mot de passe modifié',
    template: 'Votre mot de passe a été modifié avec succès',
    icon: '🔐',
    priority: 'high',
    sound: false,
    vibrate: false
  },
  NEW_DEVICE_LOGIN: {
    type: 'system',
    key: 'new_device_login',
    title: '🔔 Nouvelle connexion',
    template: 'Connexion détectée depuis {device} à {location}',
    icon: '🔔',
    priority: 'high',
    sound: true,
    vibrate: true
  }
};

// ============================================================================
// NOTIFICATION DE BIENVENUE
// ============================================================================

const welcomeNotification = {
  type: 'system',
  key: 'welcome',
  title: 'Bienvenue sur Go With Sally! 💖',
  message: 'Merci de rejoindre notre communauté de femmes. Profitez de -20% sur votre première course avec le code BIENVENUE20!',
  icon: '👋',
  data: {
    promoCode: 'BIENVENUE20',
    discount: 20,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  read: false,
  priority: 'high'
};

// ============================================================================
// NOTIFICATIONS PRÉDÉFINIES
// ============================================================================

const predefinedNotifications = [
  {
    type: 'system',
    key: 'welcome',
    title: 'Bienvenue sur Go With Sally! 💖',
    message: 'Votre compte a été créé avec succès',
    icon: '👋',
    read: false
  },
  {
    type: 'ride',
    key: 'ride_completed',
    title: 'Course terminée ✅',
    message: 'Merci d\'avoir voyagé avec Sally! N\'oubliez pas d\'évaluer votre conductrice.',
    icon: '✅',
    read: true
  },
  {
    type: 'promo',
    key: 'promo_code',
    title: '🎁 -25% sur votre prochaine course!',
    message: 'Utilisez le code SALLY25 avant dimanche',
    icon: '🎁',
    data: { code: 'SALLY25', discount: 25 },
    read: false
  },
  {
    type: 'loyalty',
    key: 'badge_earned',
    title: 'Badge débloqué! 🏅',
    message: 'Vous avez obtenu le badge "Voyageuse fidèle"',
    icon: '🏅',
    read: false
  },
  {
    type: 'safety',
    key: 'account_verified',
    title: 'Vérification complète 📄',
    message: 'Votre identité a été vérifiée avec succès',
    icon: '📄',
    read: true
  }
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sélectionne un élément aléatoire d'un tableau
 */
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Génère un ID MongoDB
 */
const generateObjectId = () => new Types.ObjectId();

/**
 * Remplace les variables dans un template
 */
const interpolateTemplate = (template, data) => {
  if (!template || !data) return template;
  
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  return result;
};

// ============================================================================
// GÉNÉRATEURS
// ============================================================================

/**
 * Génère des notifications aléatoires pour une utilisatrice
 * @param {ObjectId} userId - ID de l'utilisatrice
 * @param {number} count - Nombre de notifications à générer
 * @returns {Array} Notifications générées
 */
const generateNotifications = (userId, count = 20) => {
  const generatedNotifications = [];
  const types = Object.values(notificationTypes);
  const baseTime = Date.now();

  // Noms marocains pour les données dynamiques
  const femaleNames = ['Amina', 'Khadija', 'Sara', 'Fatima', 'Houda', 'Meryem', 'Zineb', 'Imane', 'Leila', 'Sanaa'];
  const destinations = ['Morocco Mall', 'Twin Center', 'Gare Casa Voyageurs', 'Aéroport Mohammed V', 'Maarif', 'Anfa', 'Ain Diab', 'Gauthier', 'Bourgogne', 'Racine'];
  const promoCodes = ['SALLY20', 'WELCOME10', 'SUMMER15', 'VIP25', 'FLASH30', 'RAMADAN20', 'EID15'];
  const badges = ['Première course', 'Fidèle Sally', 'VIP Gold', '100 courses', 'Exploratrice', 'Ambassadrice'];
  const documents = ['permis de conduire', 'carte d\'identité', 'carte grise', 'assurance véhicule'];

  for (let i = 0; i < count; i++) {
    const notifType = randomItem(types);
    const timeAgo = Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000); // 14 derniers jours
    const timestamp = new Date(baseTime - timeAgo);
    
    // Générer les données dynamiques
    const data = {};
    let message = notifType.template;

    switch (notifType.type) {
      case 'ride':
        data.driverName = randomItem(femaleNames);
        data.destination = randomItem(destinations);
        data.eta = Math.floor(Math.random() * 10) + 2;
        data.amount = Math.floor(Math.random() * 100) + 20;
        data.reason = 'Passagère non présente';
        data.rideId = generateObjectId().toString();
        break;

      case 'promo':
        data.code = randomItem(promoCodes);
        data.discount = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
        data.duration = ['2 heures', '24 heures', '48 heures'][Math.floor(Math.random() * 3)];
        data.hours = Math.floor(Math.random() * 48) + 1;
        data.offerTitle = 'Offre spéciale weekend';
        data.validUntil = 'dimanche';
        break;

      case 'loyalty':
        data.points = Math.floor(Math.random() * 100) + 10;
        data.level = Math.floor(Math.random() * 10) + 1;
        data.badgeName = randomItem(badges);
        data.days = Math.floor(Math.random() * 30) + 1;
        data.rewardName = 'Course gratuite';
        break;

      case 'chat':
        data.senderName = randomItem(femaleNames);
        data.preview = 'Bonjour! Je suis en route...';
        data.recipientName = randomItem(femaleNames);
        data.conversationId = generateObjectId().toString();
        break;

      case 'social':
        data.userName = `${randomItem(femaleNames)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`;
        data.bonus = [20, 30, 50][Math.floor(Math.random() * 3)];
        break;

      case 'driver':
        data.destination = randomItem(destinations);
        data.price = Math.floor(Math.random() * 100) + 30;
        data.amount = Math.floor(Math.random() * 5000) + 500;
        data.documentType = randomItem(documents);
        data.days = Math.floor(Math.random() * 30) + 1;
        data.reason = 'Document illisible';
        data.rating = Math.floor(Math.random() * 2) + 4;
        data.passengerName = randomItem(femaleNames);
        break;

      case 'payment':
        data.amount = Math.floor(Math.random() * 200) + 20;
        break;

      case 'safety':
        data.userName = randomItem(femaleNames);
        data.contactName = randomItem(femaleNames);
        break;

      case 'system':
        data.device = ['iPhone', 'Android', 'Web'][Math.floor(Math.random() * 3)];
        data.location = ['Casablanca', 'Rabat', 'Marrakech'][Math.floor(Math.random() * 3)];
        data.date = '15 janvier';
        data.startTime = '02:00';
        data.endTime = '04:00';
        break;
    }

    // Interpoler le message
    message = interpolateTemplate(notifType.template, data);

    const isRead = Math.random() > 0.4;

    generatedNotifications.push({
      _id: generateObjectId(),
      userId,
      type: notifType.type,
      key: notifType.key,
      title: notifType.title,
      message,
      icon: notifType.icon,
      priority: notifType.priority,
      data,
      read: isRead,
      readAt: isRead ? new Date(timestamp.getTime() + 3600000) : null,
      actionUrl: notifType.type === 'ride' && data.rideId ? `/rides/${data.rideId}` : null,
      sound: notifType.sound,
      vibrate: notifType.vibrate,
      createdAt: timestamp,
      expiresAt: new Date(timestamp.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 jours
    });
  }

  // Trier par date (plus récentes en premier)
  generatedNotifications.sort((a, b) => b.createdAt - a.createdAt);

  return generatedNotifications;
};

/**
 * Crée une notification à partir d'un type
 * @param {string} typeKey - Clé du type (ex: 'RIDE_DRIVER_FOUND')
 * @param {ObjectId} userId - ID de l'utilisatrice
 * @param {Object} data - Données pour le template
 * @returns {Object} Notification formatée
 */
const createNotification = (typeKey, userId, data = {}) => {
  const notifType = notificationTypes[typeKey];
  
  if (!notifType) {
    throw new Error(`Type de notification inconnu: ${typeKey}`);
  }

  const message = interpolateTemplate(notifType.template, data);

  return {
    _id: generateObjectId(),
    userId,
    type: notifType.type,
    key: notifType.key,
    title: notifType.title,
    message,
    icon: notifType.icon,
    priority: notifType.priority,
    data,
    read: false,
    readAt: null,
    sound: notifType.sound,
    vibrate: notifType.vibrate,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
};

/**
 * Crée la notification de bienvenue pour un nouvel utilisateur
 * @param {ObjectId} userId - ID de l'utilisatrice
 * @returns {Object} Notification de bienvenue
 */
const createWelcomeNotification = (userId) => {
  return {
    _id: generateObjectId(),
    userId,
    ...welcomeNotification,
    createdAt: new Date(),
    expiresAt: welcomeNotification.data.validUntil
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  notificationPriorities,
  notificationCategories,
  defaultIcons,
  
  // Types
  notificationTypes,
  
  // Predefined
  welcomeNotification,
  predefinedNotifications,
  
  // Generators
  generateNotifications,
  createNotification,
  createWelcomeNotification,
  
  // Helpers
  randomItem,
  generateObjectId,
  interpolateTemplate
};

console.log('📄 [seeds/data/notifications.js] ✅ Module chargé -', Object.keys(notificationTypes).length, 'types');