/**
 * ============================================================================
 * GO WITH SALLY - MODELS INDEX
 * ============================================================================
 * @version 2.0.0
 * Point d'entrée pour tous les modèles Mongoose de l'application
 * 
 * Usage:
 *   const { User, Driver, Ride } = require('./models');
 *   // ou
 *   const models = require('./models');
 *   const user = await models.User.findById(id);
 * ============================================================================
 */

console.log('📄 [models/index.js] Chargement des modèles...');

// ============================================================================
// MODÈLES PRINCIPAUX (obligatoires)
// ============================================================================

let User, Driver, Ride;

try {
  User = require('./User');
  console.log('  ✅ User');
} catch (e) {
  console.error('  ❌ User - ERREUR:', e.message);
  throw new Error('Modèle User obligatoire non trouvé');
}

try {
  Driver = require('./Driver');
  console.log('  ✅ Driver');
} catch (e) {
  console.error('  ❌ Driver - ERREUR:', e.message);
  throw new Error('Modèle Driver obligatoire non trouvé');
}

try {
  Ride = require('./Ride');
  console.log('  ✅ Ride');
} catch (e) {
  console.error('  ❌ Ride - ERREUR:', e.message);
  throw new Error('Modèle Ride obligatoire non trouvé');
}

// ============================================================================
// MODÈLES OPTIONNELS (ne bloquent pas le démarrage)
// ============================================================================

let Badge = null;
let Message = null;
let Conversation = null;
let OTP = null;
let PriceProposal = null;
let Service = null;
let Notification = null;
let Payment = null;
let Review = null;
let Promo = null;
let SupportTicket = null;
let Activity = null;

// Badge - Système de badges et récompenses
try {
  Badge = require('./Badge');
  console.log('  ✅ Badge');
} catch (e) {
  console.log('  ⚠️ Badge non disponible');
}

// Message - Messages du chat
try {
  Message = require('./Message');
  console.log('  ✅ Message');
} catch (e) {
  console.log('  ⚠️ Message non disponible');
}

// Conversation - Conversations entre utilisateurs
try {
  Conversation = require('./Conversation');
  console.log('  ✅ Conversation');
} catch (e) {
  console.log('  ⚠️ Conversation non disponible');
}

// OTP - Codes de vérification
try {
  OTP = require('./OTP');
  console.log('  ✅ OTP');
} catch (e) {
  console.log('  ⚠️ OTP non disponible');
}

// PriceProposal - Négociation de prix
try {
  PriceProposal = require('./PriceProposal');
  console.log('  ✅ PriceProposal');
} catch (e) {
  console.log('  ⚠️ PriceProposal non disponible');
}

// Service - Types de services (Sally Eco, Standard, Confort)
try {
  Service = require('./Service');
  console.log('  ✅ Service');
} catch (e) {
  console.log('  ⚠️ Service non disponible');
}

// Notification - Notifications push/in-app
try {
  Notification = require('./Notification');
  console.log('  ✅ Notification');
} catch (e) {
  console.log('  ⚠️ Notification non disponible');
}

// Payment - Paiements et transactions
try {
  Payment = require('./Payment');
  console.log('  ✅ Payment');
} catch (e) {
  console.log('  ⚠️ Payment non disponible');
}

// Review - Avis et évaluations
try {
  Review = require('./Review');
  console.log('  ✅ Review');
} catch (e) {
  console.log('  ⚠️ Review non disponible');
}

// Promo - Codes promo et réductions
try {
  Promo = require('./Promo');
  console.log('  ✅ Promo');
} catch (e) {
  console.log('  ⚠️ Promo non disponible');
}

// SupportTicket - Tickets de support
try {
  SupportTicket = require('./SupportTicket');
  console.log('  ✅ SupportTicket');
} catch (e) {
  console.log('  ⚠️ SupportTicket non disponible');
}

// Activity - Journal d'activités
try {
  Activity = require('./Activity');
  console.log('  ✅ Activity');
} catch (e) {
  console.log('  ⚠️ Activity non disponible');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Liste de tous les modèles (chargés ou non)
 */
const ALL_MODEL_NAMES = [
  'User', 'Driver', 'Ride', 'Badge', 'Message', 'Conversation',
  'OTP', 'PriceProposal', 'Service', 'Notification', 'Payment',
  'Review', 'Promo', 'SupportTicket', 'Activity'
];

/**
 * Obtient un modèle par son nom
 * @param {string} modelName - Nom du modèle
 * @returns {Model|null} - Le modèle Mongoose ou null si non disponible
 */
const getModel = (modelName) => {
  const models = {
    User, Driver, Ride, Badge, Message, Conversation,
    OTP, PriceProposal, Service, Notification, Payment,
    Review, Promo, SupportTicket, Activity
  };
  
  return models[modelName] || null;
};

/**
 * Obtient un modèle par son nom (avec erreur si non trouvé)
 * @param {string} modelName - Nom du modèle
 * @returns {Model} - Le modèle Mongoose
 * @throws {Error} - Si le modèle n'existe pas
 */
const getModelStrict = (modelName) => {
  const model = getModel(modelName);
  if (!model) {
    throw new Error(`Modèle "${modelName}" non disponible`);
  }
  return model;
};

/**
 * Liste tous les modèles disponibles (chargés avec succès)
 * @returns {Array<string>} - Noms des modèles disponibles
 */
const listModels = () => {
  const models = {
    User, Driver, Ride, Badge, Message, Conversation,
    OTP, PriceProposal, Service, Notification, Payment,
    Review, Promo, SupportTicket, Activity
  };
  
  return Object.entries(models)
    .filter(([name, model]) => model !== null)
    .map(([name]) => name);
};

/**
 * Liste tous les noms de modèles (même non chargés)
 * @returns {Array<string>} - Tous les noms de modèles
 */
const listAllModelNames = () => ALL_MODEL_NAMES;

/**
 * Vérifie si un modèle est disponible
 * @param {string} modelName - Nom du modèle
 * @returns {boolean} - true si disponible
 */
const isModelAvailable = (modelName) => {
  return getModel(modelName) !== null;
};

/**
 * Obtient les statistiques de base de données
 * @returns {Promise<Object>} - Statistiques des collections
 */
const getDbStats = async () => {
  const stats = {
    users: 0,
    drivers: 0,
    rides: 0,
    messages: 0,
    conversations: 0,
    badges: 0,
    total: 0
  };
  
  try {
    // Modèles principaux
    stats.users = await User.countDocuments();
    stats.drivers = await Driver.countDocuments();
    stats.rides = await Ride.countDocuments();
    
    // Modèles optionnels
    if (Message) stats.messages = await Message.countDocuments();
    if (Conversation) stats.conversations = await Conversation.countDocuments();
    if (Badge) stats.badges = await Badge.countDocuments();
    
    // Total
    stats.total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    return stats;
  } catch (error) {
    console.error('❌ [models/index.js] getDbStats error:', error.message);
    return stats;
  }
};

/**
 * Obtient les statistiques détaillées
 * @returns {Promise<Object>} - Statistiques complètes
 */
const getDetailedStats = async () => {
  const stats = {
    collections: {},
    summary: {
      total: 0,
      loadedModels: listModels().length,
      totalModels: ALL_MODEL_NAMES.length
    }
  };
  
  const models = {
    User, Driver, Ride, Badge, Message, Conversation,
    OTP, PriceProposal, Service, Notification, Payment,
    Review, Promo, SupportTicket, Activity
  };
  
  for (const [name, model] of Object.entries(models)) {
    if (model) {
      try {
        const count = await model.countDocuments();
        stats.collections[name] = count;
        stats.summary.total += count;
      } catch (e) {
        stats.collections[name] = -1; // Erreur
      }
    } else {
      stats.collections[name] = null; // Non chargé
    }
  }
  
  return stats;
};

/**
 * Vérifie la connexion à la base de données via les modèles
 * @returns {Promise<boolean>} - true si connecté
 */
const checkDbConnection = async () => {
  try {
    await User.findOne().limit(1).lean();
    return true;
  } catch (error) {
    console.error('❌ [models/index.js] DB connection check failed:', error.message);
    return false;
  }
};

// ============================================================================
// LOG RÉCAPITULATIF
// ============================================================================

const loadedModels = listModels();
console.log(`📄 [models/index.js] ✅ ${loadedModels.length}/${ALL_MODEL_NAMES.length} modèles chargés`);
console.log(`📄 [models/index.js] Disponibles: ${loadedModels.join(', ')}`);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Modèles principaux (toujours disponibles)
  User,
  Driver,
  Ride,
  
  // Modèles optionnels (peuvent être null)
  Badge,
  Message,
  Conversation,
  OTP,
  PriceProposal,
  Service,
  Notification,
  Payment,
  Review,
  Promo,
  SupportTicket,
  Activity,
  
  // Helpers
  getModel,
  getModelStrict,
  listModels,
  listAllModelNames,
  isModelAvailable,
  getDbStats,
  getDetailedStats,
  checkDbConnection,
  
  // Constants
  ALL_MODEL_NAMES
};