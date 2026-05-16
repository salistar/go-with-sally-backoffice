/**
 * ============================================================================
 * GO WITH SALLY - CHAT SEED DATA
 * ============================================================================
 * @version 2.0.0
 * Données de test pour le système de messagerie
 * ============================================================================
 */

const { Types } = require('mongoose');

// ============================================================================
// TYPES DE CONVERSATIONS
// ============================================================================

const conversationTypes = {
  RIDE: 'ride',
  DIRECT: 'direct',
  SUPPORT: 'support',
  GROUP: 'group'
};

// ============================================================================
// TYPES DE MESSAGES
// ============================================================================

const messageTypes = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  LOCATION: 'location',
  FILE: 'file',
  SYSTEM: 'system'
};

// ============================================================================
// STATUS DE MESSAGES
// ============================================================================

const messageStatuses = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// ============================================================================
// TEMPLATES DE MESSAGES
// ============================================================================

const messageTemplates = {
  // Messages conductrice au départ
  rideStart: [
    'Bonjour! Je suis en route 🚗',
    'J\'arrive dans quelques minutes',
    'Je suis la conductrice, je serai là bientôt',
    'Bonjour, je suis votre conductrice Sally!',
    'En route vers vous! 😊',
    'Je pars maintenant, j\'arrive dans 5 minutes',
    'Salam! Je suis en chemin 🚗'
  ],
  
  // Messages conductrice à l'arrivée
  rideArrival: [
    'Je suis devant l\'entrée principale',
    'Je suis garée près de l\'entrée',
    'Vous me voyez? Je suis dans la voiture blanche',
    'Je suis arrivée, je vous attends',
    'Je suis là! Dacia Logan blanche',
    'Arrivée! Je suis devant le café',
    'Je vous attends, prenez votre temps 😊'
  ],
  
  // Messages conductrice pendant la course
  rideDuring: [
    'On prend quelle route?',
    'Il y a un peu de trafic, on devrait arriver dans 10 minutes',
    'Vous voulez de la musique?',
    'La clim vous convient?',
    'On arrive bientôt!',
    'Plus que 5 minutes'
  ],
  
  // Messages conductrice fin de course
  rideEnd: [
    'Merci pour le trajet! Bonne journée 😊',
    'Merci! À bientôt',
    'Bonne continuation!',
    'Merci, c\'était un plaisir!',
    'Bonne journée! N\'hésitez pas à laisser un avis 💖',
    'Merci pour votre confiance! À bientôt sur Sally',
    'Shukran! Bonne journée 😊'
  ],
  
  // Messages passagère
  passenger: [
    'D\'accord, je descends',
    'Je vous vois! J\'arrive',
    'Je suis devant l\'entrée principale',
    'Parfait, merci!',
    'Je sors dans 2 minutes',
    'Je suis en blanc, vous me verrez facilement',
    'J\'arrive! Désolée pour l\'attente',
    'Ok je descends! 👍'
  ],
  
  // Messages passagère pendant course
  passengerDuring: [
    'C\'est parfait, merci',
    'Vous pouvez me déposer juste après le feu',
    'On peut s\'arrêter 2 minutes? J\'ai un truc à récupérer',
    'C\'est ici, merci!',
    'Un peu plus loin svp'
  ],
  
  // Messages support
  support: [
    'Bonjour, comment puis-je vous aider?',
    'Merci de nous avoir contacté. Votre demande a été enregistrée.',
    'Un membre de notre équipe va vous répondre sous peu.',
    'Avez-vous d\'autres questions?',
    'Votre problème a été résolu. N\'hésitez pas à nous recontacter.',
    'Nous avons bien reçu votre réclamation.',
    'Votre remboursement a été effectué.'
  ],
  
  // Messages sociaux
  social: [
    'Salut! Comment vas-tu?',
    'Tu fais quoi ce weekend?',
    'Super idée! Je suis partante',
    'D\'accord, à tout à l\'heure!',
    'Merci pour l\'info 👍',
    'On se retrouve où?',
    'Je t\'envoie ma position'
  ],
  
  // Messages système
  system: [
    'La course a commencé',
    'La conductrice est arrivée',
    'La course est terminée',
    'Paiement effectué',
    'Nouvelle conductrice assignée',
    'Course annulée',
    'Partage de position activé'
  ]
};

// ============================================================================
// CONVERSATIONS PRÉDÉFINIES
// ============================================================================

const predefinedConversations = [
  {
    type: 'ride',
    metadata: {
      rideId: null, // À remplir avec un vrai ID
      status: 'completed'
    }
  },
  {
    type: 'direct',
    metadata: {}
  },
  {
    type: 'support',
    metadata: {
      ticketId: null,
      priority: 'normal',
      status: 'resolved'
    }
  }
];

// ============================================================================
// MESSAGES PRÉDÉFINIS (scénario type course)
// ============================================================================

const predefinedRideMessages = [
  { content: 'Bonjour! Je suis en route vers vous 🚗', type: 'text', senderRole: 'driver', delay: 0 },
  { content: 'D\'accord, merci! Je vous attends devant l\'entrée', type: 'text', senderRole: 'passenger', delay: 60000 },
  { content: 'Je suis arrivée, je suis dans une Dacia Logan blanche', type: 'text', senderRole: 'driver', delay: 300000 },
  { content: 'Je vous vois! J\'arrive', type: 'text', senderRole: 'passenger', delay: 60000 },
  { type: 'system', content: 'La course a commencé', senderRole: 'system', delay: 120000 },
  { content: 'On prend le boulevard ou la route côtière?', type: 'text', senderRole: 'driver', delay: 180000 },
  { content: 'Le boulevard svp, c\'est plus rapide', type: 'text', senderRole: 'passenger', delay: 60000 },
  { type: 'system', content: 'La course est terminée', senderRole: 'system', delay: 900000 },
  { content: 'Merci pour le trajet 😊', type: 'text', senderRole: 'passenger', delay: 60000 },
  { content: 'Merci à vous! Bonne journée 💖', type: 'text', senderRole: 'driver', delay: 30000 }
];

// ============================================================================
// GÉNÉRATEURS
// ============================================================================

/**
 * Génère un ID MongoDB valide
 * @returns {ObjectId}
 */
const generateObjectId = () => new Types.ObjectId();

/**
 * Sélectionne un élément aléatoire d'un tableau
 * @param {Array} arr - Tableau source
 * @returns {*} Élément aléatoire
 */
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Génère des messages pour une conversation
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {Array} participants - IDs des participants [{id, role}]
 * @param {number} count - Nombre de messages
 * @param {ObjectId} rideId - ID de la course (optionnel)
 * @returns {Array} Messages générés
 */
const generateMessages = (conversationId, participants, count = 10, rideId = null) => {
  const generatedMessages = [];
  const baseTime = Date.now() - 86400000; // Il y a 24h
  
  for (let i = 0; i < count; i++) {
    const participantIndex = i % participants.length;
    const participant = participants[participantIndex];
    const isDriver = participant.role === 'driver';
    
    // Sélectionner le template approprié selon la phase de la conversation
    let templates;
    if (i < count * 0.2) {
      templates = isDriver ? messageTemplates.rideStart : messageTemplates.passenger;
    } else if (i < count * 0.4) {
      templates = isDriver ? messageTemplates.rideArrival : messageTemplates.passenger;
    } else if (i < count * 0.7) {
      templates = isDriver ? messageTemplates.rideDuring : messageTemplates.passengerDuring;
    } else {
      templates = isDriver ? messageTemplates.rideEnd : messageTemplates.passenger;
    }
    
    const content = randomItem(templates);
    const timestamp = new Date(baseTime + i * 300000); // 5 min entre chaque message
    const isRead = Math.random() > 0.3;
    
    generatedMessages.push({
      conversationId,
      rideId,
      sender: participant.id,
      recipient: participants[(participantIndex + 1) % participants.length].id,
      type: 'text',
      content,
      status: isRead ? 'read' : 'delivered',
      createdAt: timestamp,
      deliveredAt: new Date(timestamp.getTime() + 5000),
      readAt: isRead ? new Date(timestamp.getTime() + 60000) : null,
      isDeleted: false
    });
  }
  
  return generatedMessages;
};

/**
 * Génère des messages pour un scénario de course complet
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {ObjectId} driverId - ID de la conductrice
 * @param {ObjectId} passengerId - ID de la passagère
 * @param {ObjectId} rideId - ID de la course
 * @returns {Array} Messages du scénario
 */
const generateRideScenario = (conversationId, driverId, passengerId, rideId = null) => {
  const messages = [];
  const baseTime = Date.now() - 3600000; // Il y a 1h
  
  predefinedRideMessages.forEach((msg, index) => {
    const sender = msg.senderRole === 'driver' ? driverId : 
                   msg.senderRole === 'passenger' ? passengerId : null;
    const recipient = msg.senderRole === 'driver' ? passengerId : 
                      msg.senderRole === 'passenger' ? driverId : null;
    
    const timestamp = new Date(baseTime + msg.delay);
    
    messages.push({
      conversationId,
      rideId,
      sender,
      recipient,
      type: msg.type,
      content: msg.content,
      status: 'read',
      createdAt: timestamp,
      deliveredAt: new Date(timestamp.getTime() + 2000),
      readAt: new Date(timestamp.getTime() + 30000),
      isDeleted: false,
      metadata: msg.type === 'system' ? { systemEvent: true } : {}
    });
  });
  
  return messages;
};

/**
 * Génère une conversation avec ses messages
 * @param {ObjectId} user1Id - Premier participant
 * @param {ObjectId} user2Id - Deuxième participant
 * @param {string} type - Type de conversation
 * @param {number} messageCount - Nombre de messages
 * @param {ObjectId} rideId - ID de course (optionnel)
 * @returns {Object} { conversation, messages }
 */
const generateConversation = (user1Id, user2Id, type = 'direct', messageCount = 10, rideId = null) => {
  const conversationId = generateObjectId();
  const now = new Date();
  
  const conversation = {
    _id: conversationId,
    participants: [user1Id, user2Id],
    type,
    rideId,
    lastMessage: null,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now
  };
  
  const participants = [
    { id: user1Id, role: type === 'ride' ? 'driver' : 'user' },
    { id: user2Id, role: type === 'ride' ? 'passenger' : 'user' }
  ];
  
  const messages = type === 'ride' && rideId
    ? generateRideScenario(conversationId, user1Id, user2Id, rideId)
    : generateMessages(conversationId, participants, messageCount, rideId);
  
  // Mettre à jour lastMessage
  if (messages.length > 0) {
    conversation.lastMessage = messages[messages.length - 1]._id || generateObjectId();
  }
  
  return { conversation, messages };
};

/**
 * Génère un message de support
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {ObjectId} userId - ID de l'utilisateur
 * @param {ObjectId} supportId - ID du support
 * @param {boolean} isFromSupport - Message du support ou de l'utilisateur
 * @returns {Object} Message
 */
const generateSupportMessage = (conversationId, userId, supportId, isFromSupport = false) => {
  const templates = isFromSupport ? messageTemplates.support : messageTemplates.passenger;
  const content = randomItem(templates);
  
  return {
    conversationId,
    sender: isFromSupport ? supportId : userId,
    recipient: isFromSupport ? userId : supportId,
    type: 'text',
    content,
    status: 'read',
    createdAt: new Date(),
    metadata: { isSupport: isFromSupport }
  };
};

/**
 * Génère un message de localisation
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {ObjectId} senderId - ID de l'expéditeur
 * @param {ObjectId} recipientId - ID du destinataire
 * @param {Object} location - { latitude, longitude, address }
 * @returns {Object} Message de localisation
 */
const generateLocationMessage = (conversationId, senderId, recipientId, location = null) => {
  const defaultLocation = {
    latitude: 33.5731 + (Math.random() - 0.5) * 0.1,
    longitude: -7.5898 + (Math.random() - 0.5) * 0.1,
    address: 'Casablanca, Maroc'
  };
  
  return {
    conversationId,
    sender: senderId,
    recipient: recipientId,
    type: 'location',
    content: null,
    location: location || defaultLocation,
    status: 'sent',
    createdAt: new Date()
  };
};

/**
 * Génère un message média (image/vidéo/audio)
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {ObjectId} senderId - ID de l'expéditeur
 * @param {ObjectId} recipientId - ID du destinataire
 * @param {string} mediaType - Type de média (image, video, audio)
 * @returns {Object} Message média
 */
const generateMediaMessage = (conversationId, senderId, recipientId, mediaType = 'image') => {
  const mediaUrls = {
    image: 'https://picsum.photos/400/300',
    video: 'https://sample-videos.com/video123/mp4/720/sample.mp4',
    audio: 'https://sample-sounds.com/audio/sample.mp3'
  };
  
  return {
    conversationId,
    sender: senderId,
    recipient: recipientId,
    type: mediaType,
    content: null,
    media: {
      uri: mediaUrls[mediaType] || mediaUrls.image,
      thumbnail: mediaType === 'video' ? 'https://picsum.photos/200/150' : null,
      duration: mediaType === 'video' ? 30 : mediaType === 'audio' ? 15 : null,
      fileName: `${mediaType}_${Date.now()}.${mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'mp3'}`,
      fileSize: Math.floor(Math.random() * 5000000) + 100000,
      mimeType: mediaType === 'image' ? 'image/jpeg' : mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'
    },
    status: 'sent',
    createdAt: new Date()
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  conversationTypes,
  messageTypes,
  messageStatuses,
  
  // Templates
  messageTemplates,
  
  // Predefined data
  predefinedConversations,
  predefinedRideMessages,
  
  // Generators
  generateObjectId,
  randomItem,
  generateMessages,
  generateRideScenario,
  generateConversation,
  generateSupportMessage,
  generateLocationMessage,
  generateMediaMessage
};

console.log('📄 [seeds/data/chat.js] ✅ Module chargé');