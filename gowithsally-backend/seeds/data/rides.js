/**
 * ============================================================================
 * GO WITH SALLY - RIDES SEED DATA
 * ============================================================================
 * Données de test pour les courses
 * 
 * Contient:
 * - Lieux populaires à Casablanca
 * - Générateur de courses aléatoires
 * - Calcul de distance et tarification
 * - Statuts et raisons d'annulation
 * 
 * @module seeds/data/rides
 * @version 1.0.0
 * ============================================================================
 */

console.log('📄 [seeds/data/rides.js] Fichier chargé');

const { v4: uuidv4 } = require('uuid');

console.log('📄 [seeds/data/rides.js] uuid importé');

// ============================================================================
// LIEUX POPULAIRES À CASABLANCA
// ============================================================================

/**
 * Lieux populaires à Casablanca avec coordonnées GPS
 * @constant {Object[]}
 */
const locations = [
  // Centres commerciaux
  { address: 'Morocco Mall, Ain Diab', city: 'Casablanca', type: 'mall', coordinates: [-7.6633, 33.5917] },
  { address: 'Anfa Place, Anfa', city: 'Casablanca', type: 'mall', coordinates: [-7.6567, 33.5850] },
  { address: 'Marina Shopping, Marina', city: 'Casablanca', type: 'mall', coordinates: [-7.6117, 33.6033] },
  { address: 'Tachfine Center, Maarif', city: 'Casablanca', type: 'mall', coordinates: [-7.6200, 33.5750] },
  
  // Business
  { address: 'Twin Center, Maarif', city: 'Casablanca', type: 'business', coordinates: [-7.6189, 33.5883] },
  { address: 'Casablanca Finance City', city: 'Casablanca', type: 'business', coordinates: [-7.6350, 33.5650] },
  { address: 'Technopark, Sidi Maarouf', city: 'Casablanca', type: 'business', coordinates: [-7.6233, 33.5117] },
  { address: 'Casa Nearshore', city: 'Casablanca', type: 'business', coordinates: [-7.6567, 33.5300] },
  
  // Transport
  { address: 'Gare Casa Voyageurs', city: 'Casablanca', type: 'transport', coordinates: [-7.5833, 33.5900] },
  { address: 'Gare Casa Port', city: 'Casablanca', type: 'transport', coordinates: [-7.6117, 33.6000] },
  { address: 'Aéroport Mohammed V', city: 'Casablanca', type: 'transport', coordinates: [-7.5817, 33.3675] },
  { address: 'Gare Routière Ouled Ziane', city: 'Casablanca', type: 'transport', coordinates: [-7.5950, 33.5650] },
  
  // Santé
  { address: 'CHU Ibn Rochd', city: 'Casablanca', type: 'health', coordinates: [-7.6139, 33.5756] },
  { address: 'Clinique Badr', city: 'Casablanca', type: 'health', coordinates: [-7.6250, 33.5800] },
  { address: 'Hôpital Cheikh Khalifa', city: 'Casablanca', type: 'health', coordinates: [-7.6400, 33.5550] },
  
  // Éducation
  { address: 'Faculté de Médecine', city: 'Casablanca', type: 'education', coordinates: [-7.6156, 33.5711] },
  { address: 'ENCG Casablanca', city: 'Casablanca', type: 'education', coordinates: [-7.6300, 33.5600] },
  { address: 'ISCAE Casablanca', city: 'Casablanca', type: 'education', coordinates: [-7.6450, 33.5450] },
  { address: 'Université Hassan II', city: 'Casablanca', type: 'education', coordinates: [-7.6350, 33.5700] },
  
  // Tourisme
  { address: 'Mosquée Hassan II', city: 'Casablanca', type: 'tourism', coordinates: [-7.6325, 33.6086] },
  { address: 'Ancienne Médina', city: 'Casablanca', type: 'tourism', coordinates: [-7.6050, 33.6000] },
  { address: 'Corniche Ain Diab', city: 'Casablanca', type: 'tourism', coordinates: [-7.6700, 33.5950] },
  
  // Quartiers résidentiels
  { address: 'Quartier Maarif', city: 'Casablanca', type: 'residential', coordinates: [-7.6198, 33.5731] },
  { address: 'Quartier Racine', city: 'Casablanca', type: 'residential', coordinates: [-7.6300, 33.5767] },
  { address: 'Quartier Bourgogne', city: 'Casablanca', type: 'residential', coordinates: [-7.6100, 33.5800] },
  { address: 'Quartier Gauthier', city: 'Casablanca', type: 'residential', coordinates: [-7.6156, 33.5883] },
  { address: 'Quartier 2 Mars', city: 'Casablanca', type: 'residential', coordinates: [-7.6050, 33.5650] },
  { address: 'Derb Sultan', city: 'Casablanca', type: 'residential', coordinates: [-7.5967, 33.5783] },
  { address: 'Ain Sebaa', city: 'Casablanca', type: 'residential', coordinates: [-7.5433, 33.6067] },
  { address: 'Sidi Maarouf', city: 'Casablanca', type: 'residential', coordinates: [-7.6567, 33.5350] },
  { address: 'Hay Hassani', city: 'Casablanca', type: 'residential', coordinates: [-7.5833, 33.5567] },
  { address: 'Bouskoura', city: 'Casablanca', type: 'residential', coordinates: [-7.6483, 33.4483] },
  { address: 'Val Fleuri', city: 'Casablanca', type: 'residential', coordinates: [-7.6050, 33.5650] },
  { address: 'Californie', city: 'Casablanca', type: 'residential', coordinates: [-7.6350, 33.5500] },
  { address: 'Oasis', city: 'Casablanca', type: 'residential', coordinates: [-7.6400, 33.5700] }
];

console.log('📄 [seeds/data/rides.js] Lieux chargés:', locations.length);

// ============================================================================
// STATUTS ET POIDS DE DISTRIBUTION
// ============================================================================

/**
 * Distribution des statuts de course pour une répartition réaliste
 * @constant {Object[]}
 */
const statusWeights = [
  { status: 'completed', weight: 60 },
  { status: 'cancelled', weight: 15 },
  { status: 'in_progress', weight: 5 },
  { status: 'driver_arriving', weight: 5 },
  { status: 'driver_arrived', weight: 3 },
  { status: 'searching', weight: 7 },
  { status: 'driver_assigned', weight: 3 },
  { status: 'no_driver', weight: 2 }
];

console.log('📄 [seeds/data/rides.js] Statuts chargés:', statusWeights.length);

/**
 * Raisons d'annulation possibles
 * @constant {Object[]}
 */
const cancellationReasons = [
  { reason: 'Changement de plans', reasonCode: 'user_change_plans', cancelledBy: 'user' },
  { reason: 'Temps d\'attente trop long', reasonCode: 'wait_too_long', cancelledBy: 'user' },
  { reason: 'Erreur de destination', reasonCode: 'wrong_destination', cancelledBy: 'user' },
  { reason: 'Conductrice indisponible', reasonCode: 'driver_unavailable', cancelledBy: 'driver' },
  { reason: 'Urgence personnelle', reasonCode: 'personal_emergency', cancelledBy: 'user' },
  { reason: 'Problème de véhicule', reasonCode: 'vehicle_issue', cancelledBy: 'driver' },
  { reason: 'Passagère introuvable', reasonCode: 'user_not_found', cancelledBy: 'driver' },
  { reason: 'Tarif trop élevé', reasonCode: 'price_too_high', cancelledBy: 'user' }
];

console.log('📄 [seeds/data/rides.js] Raisons d\'annulation chargées:', cancellationReasons.length);

// ============================================================================
// TAGS D'ÉVALUATION
// ============================================================================

/**
 * Tags positifs pour évaluer une conductrice
 * @constant {string[]}
 */
const userRatingTags = [
  'safe', 'clean', 'friendly', 'professional', 'punctual', 
  'good_driver', 'comfortable', 'helpful', 'good_music', 'nice_car'
];

/**
 * Tags positifs pour évaluer une passagère
 * @constant {string[]}
 */
const driverRatingTags = [
  'polite', 'respectful', 'clean', 'punctual', 'good_tipper', 
  'pleasant', 'friendly', 'on_time'
];

/**
 * Commentaires prédéfinis pour les évaluations
 * @constant {string[]}
 */
const reviewComments = [
  'Très bien!',
  'Conductrice très sympa',
  'Trajet agréable',
  'Parfait!',
  'Je recommande',
  'Voiture propre et confortable',
  'Conductrice professionnelle',
  'Excellent service',
  'Merci pour le trajet',
  'À refaire!',
  'Super expérience',
  'Ponctuelle et aimable',
  ''
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Obtient un statut aléatoire basé sur les poids de distribution
 * @returns {string} - Statut de course
 */
const getRandomStatus = () => {
  const totalWeight = statusWeights.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const s of statusWeights) {
    random -= s.weight;
    if (random <= 0) return s.status;
  }
  return 'completed';
};

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @param {number[]} coord1 - [longitude, latitude] point 1
 * @param {number[]} coord2 - [longitude, latitude] point 2
 * @returns {number} - Distance en mètres
 */
const calculateDistance = (coord1, coord2) => {
  const R = 6371000; // Rayon de la Terre en mètres
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
};

/**
 * Calcule le tarif d'une course
 * @param {number} distance - Distance en mètres
 * @param {number} duration - Durée en secondes
 * @param {string} rideType - Type de course (standard, comfort, premium, shared)
 * @param {number} surgeMultiplier - Multiplicateur surge
 * @returns {Object} - Détails de tarification
 */
const calculatePricing = (distance, duration, rideType = 'standard', surgeMultiplier = 1) => {
  // Tarifs de base (en MAD)
  const baseFare = 10;
  const perKm = 5;
  const perMinute = 0.5;
  const bookingFee = 5;
  const minFare = 15;
  
  // Multiplicateurs par type
  const typeMultipliers = {
    standard: 1.0,
    comfort: 1.3,
    premium: 1.8,
    shared: 0.6
  };
  
  const typeMultiplier = typeMultipliers[rideType] || 1.0;
  
  // Calcul
  const distanceFare = Math.round((distance / 1000) * perKm);
  const timeFare = Math.round((duration / 60) * perMinute);
  
  let subtotal = baseFare + distanceFare + timeFare + bookingFee;
  subtotal = Math.round(subtotal * typeMultiplier * surgeMultiplier);
  
  // Appliquer le minimum
  const estimatedFare = Math.max(subtotal, minFare);
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    bookingFee,
    surgeMultiplier,
    typeMultiplier,
    estimatedFare
  };
};

console.log('📄 [seeds/data/rides.js] Fonctions utilitaires définies');

// ============================================================================
// GÉNÉRATEUR DE COURSES
// ============================================================================

/**
 * Génère des courses aléatoires
 * @param {number} count - Nombre de courses à générer
 * @param {Object[]} users - Liste des utilisatrices
 * @param {Object[]} drivers - Liste des conductrices
 * @returns {Object[]} - Tableau de courses
 */
const generateRides = (count = 50, users = [], drivers = []) => {
  console.log('📄 [seeds/data/rides.js] ▶ generateRides() - Génération de', count, 'courses');
  
  const generatedRides = [];
  
  // Filtrer les passagères et conductrices approuvées
  const passengerUsers = users.filter(u => u.role === 'user');
  const approvedDrivers = drivers.filter(d => d.status === 'approved');
  
  if (passengerUsers.length === 0) {
    console.log('📄 [seeds/data/rides.js] ⚠ Aucune passagère disponible');
    return generatedRides;
  }
  
  if (approvedDrivers.length === 0) {
    console.log('📄 [seeds/data/rides.js] ⚠ Aucune conductrice approuvée');
    return generatedRides;
  }
  
  console.log('📄 [seeds/data/rides.js] Passagères disponibles:', passengerUsers.length);
  console.log('📄 [seeds/data/rides.js] Conductrices disponibles:', approvedDrivers.length);
  
  for (let i = 0; i < count; i++) {
    // Sélectionner passagère et conductrice aléatoires
    const user = passengerUsers[Math.floor(Math.random() * passengerUsers.length)];
    const driver = approvedDrivers[Math.floor(Math.random() * approvedDrivers.length)];
    const status = getRandomStatus();
    
    // Sélectionner pickup et dropoff différents
    const pickupLocation = locations[Math.floor(Math.random() * locations.length)];
    let dropoffLocation;
    do {
      dropoffLocation = locations[Math.floor(Math.random() * locations.length)];
    } while (dropoffLocation.address === pickupLocation.address);
    
    // Calculer la route
    const distance = calculateDistance(pickupLocation.coordinates, dropoffLocation.coordinates);
    const avgSpeedMps = 8; // ~30 km/h en ville
    const duration = Math.round(distance / avgSpeedMps);
    
    // Type de course
    const rideType = ['standard', 'standard', 'standard', 'comfort', 'premium', 'shared'][Math.floor(Math.random() * 6)];
    
    // Surge pricing (20% de chance)
    const surgeMultiplier = Math.random() > 0.8 ? (1 + Math.random() * 0.5) : 1;
    
    // Calculer les tarifs
    const pricing = calculatePricing(distance, duration, rideType, surgeMultiplier);
    
    // Variations pour le tarif final (si complétée)
    const finalFare = status === 'completed' 
      ? pricing.estimatedFare + Math.floor(Math.random() * 10) - 5 
      : null;
    
    // Pourboire (30% de chance si complétée)
    const tip = status === 'completed' && Math.random() > 0.7 
      ? Math.floor(Math.random() * 20) + 5 
      : 0;
    
    // Calcul des gains conductrice (85% du tarif + pourboire)
    const driverEarnings = finalFare 
      ? Math.round((finalFare * 0.85) + tip) 
      : null;
    
    // Générer les timestamps
    const requestedDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const timestamps = {
      requested: requestedDate
    };
    
    // Timestamps selon le statut
    if (['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress', 'completed'].includes(status)) {
      timestamps.driverAssigned = new Date(requestedDate.getTime() + Math.floor(Math.random() * 300000));
    }
    if (['driver_arriving', 'driver_arrived', 'in_progress', 'completed'].includes(status)) {
      timestamps.driverAccepted = timestamps.driverAssigned;
    }
    if (['driver_arrived', 'in_progress', 'completed'].includes(status)) {
      timestamps.driverArrived = new Date(timestamps.driverAssigned.getTime() + Math.floor(Math.random() * 600000));
    }
    if (['in_progress', 'completed'].includes(status)) {
      timestamps.started = new Date(timestamps.driverArrived.getTime() + Math.floor(Math.random() * 180000));
    }
    if (status === 'completed') {
      timestamps.completed = new Date(timestamps.started.getTime() + duration * 1000);
    }
    if (status === 'cancelled') {
      timestamps.cancelled = new Date(requestedDate.getTime() + Math.floor(Math.random() * 600000));
    }
    
    // Construire la course
    const ride = {
      user: user._id,
      driver: ['searching', 'no_driver'].includes(status) ? null : driver._id,
      status,
      
      // QR Codes
      qrCode: {
        pickup: {
          code: `PICKUP-${uuidv4().substring(0, 8).toUpperCase()}`,
          scanned: ['in_progress', 'completed'].includes(status),
          scannedAt: timestamps.started || null
        },
        dropoff: {
          code: `DROPOFF-${uuidv4().substring(0, 8).toUpperCase()}`,
          scanned: status === 'completed',
          scannedAt: timestamps.completed || null
        }
      },
      
      // Vérification faciale
      faceVerification: {
        userVerified: ['in_progress', 'completed'].includes(status),
        driverVerified: ['in_progress', 'completed'].includes(status),
        confidence: ['in_progress', 'completed'].includes(status) ? 0.7 + Math.random() * 0.25 : null
      },
      
      // Pickup
      pickup: {
        address: pickupLocation.address,
        city: pickupLocation.city,
        type: pickupLocation.type,
        coordinates: {
          type: 'Point',
          coordinates: pickupLocation.coordinates
        },
        instructions: Math.random() > 0.7 ? 'Devant l\'entrée principale' : null
      },
      
      // Dropoff
      dropoff: {
        address: dropoffLocation.address,
        city: dropoffLocation.city,
        type: dropoffLocation.type,
        coordinates: {
          type: 'Point',
          coordinates: dropoffLocation.coordinates
        },
        instructions: null
      },
      
      // Arrêts intermédiaires (10% de chance)
      stops: Math.random() > 0.9 ? [{
        address: locations[Math.floor(Math.random() * locations.length)].address,
        city: 'Casablanca',
        coordinates: {
          type: 'Point',
          coordinates: locations[Math.floor(Math.random() * locations.length)].coordinates
        },
        completed: status === 'completed'
      }] : [],
      
      // Route
      route: {
        distance,
        duration,
        actualDistance: status === 'completed' ? distance + Math.floor(Math.random() * 500) - 250 : null,
        actualDuration: status === 'completed' ? duration + Math.floor(Math.random() * 300) - 150 : null,
        polyline: null // Serait généré par Google Maps
      },
      
      // Tarification
      pricing: {
        estimatedFare: pricing.estimatedFare,
        baseFare: pricing.baseFare,
        distanceFare: pricing.distanceFare,
        timeFare: pricing.timeFare,
        bookingFee: pricing.bookingFee,
        surgeMultiplier: pricing.surgeMultiplier,
        discount: Math.random() > 0.9 ? Math.floor(Math.random() * 10) + 5 : 0,
        promoCode: Math.random() > 0.95 ? 'SALLY10' : null,
        tip,
        finalFare: finalFare || pricing.estimatedFare,
        driverEarnings,
        platformFee: finalFare ? Math.round(finalFare * 0.15) : null,
        currency: 'MAD'
      },
      
      // Paiement
      payment: {
        method: ['cash', 'cash', 'cash', 'card', 'wallet'][Math.floor(Math.random() * 5)],
        status: status === 'completed' ? 'paid' : 'pending',
        paidAt: status === 'completed' ? timestamps.completed : null,
        transactionId: status === 'completed' && Math.random() > 0.5 ? `TXN-${Date.now()}` : null
      },
      
      // Options
      options: {
        rideType,
        childSeat: Math.random() > 0.9,
        quietRide: Math.random() > 0.8,
        airConditioning: true,
        passengers: Math.floor(Math.random() * 3) + 1,
        luggage: Math.floor(Math.random() * 3)
      },
      
      // Timestamps
      timestamps,
      
      // Annulation (si applicable)
      cancellation: status === 'cancelled' ? {
        ...cancellationReasons[Math.floor(Math.random() * cancellationReasons.length)],
        fee: Math.random() > 0.5 ? 10 : 0,
        timestamp: timestamps.cancelled
      } : undefined,
      
      // Évaluation passagère -> conductrice
      userRating: status === 'completed' && Math.random() > 0.2 ? {
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 étoiles
        review: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        tags: userRatingTags.filter(() => Math.random() > 0.6).map(t => t.key),
        createdAt: new Date(timestamps.completed.getTime() + Math.floor(Math.random() * 3600000))
      } : undefined,
      
      // Évaluation conductrice -> passagère
      driverRating: status === 'completed' && Math.random() > 0.3 ? {
        rating: Math.floor(Math.random() * 2) + 4,
        tags: driverRatingTags.filter(() => Math.random() > 0.7).map(t => t.key),
        createdAt: new Date(timestamps.completed.getTime() + Math.floor(Math.random() * 3600000))
      } : undefined,
      
      // Sécurité
      safety: {
        sosTriggered: Math.random() > 0.99, // 1% de chance
        sosTimestamp: null,
        sosTriggeredBy: null,
        locationShared: Math.random() > 0.5,
        sharedWith: []
      },
      
      // Messages
      messages: status === 'completed' && Math.random() > 0.7 ? [
        { 
          sender: 'user', 
          senderId: user._id,
          message: 'Je suis devant l\'entrée principale', 
          type: 'text',
          timestamp: timestamps.driverArrived 
        },
        { 
          sender: 'driver', 
          senderId: driver._id,
          message: 'D\'accord, j\'arrive dans 2 minutes', 
          type: 'text',
          timestamp: new Date(timestamps.driverArrived.getTime() + 30000) 
        }
      ] : [],
      
      // Métadonnées
      metadata: {
        appVersion: '1.0.0',
        platform: ['ios', 'android'][Math.floor(Math.random() * 2)],
        deviceId: `device_${Math.random().toString(36).substring(7)}`,
        source: 'app'
      },
      
      createdAt: requestedDate,
      updatedAt: timestamps.completed || timestamps.cancelled || requestedDate
    };
    
    generatedRides.push(ride);
  }
  
  // Statistiques
  const stats = {
    total: generatedRides.length,
    completed: generatedRides.filter(r => r.status === 'completed').length,
    cancelled: generatedRides.filter(r => r.status === 'cancelled').length,
    inProgress: generatedRides.filter(r => r.status === 'in_progress').length
  };
  
  console.log('📄 [seeds/data/rides.js] ✓ Courses générées:', stats.total);
  console.log('📄 [seeds/data/rides.js]   - Complétées:', stats.completed);
  console.log('📄 [seeds/data/rides.js]   - Annulées:', stats.cancelled);
  console.log('📄 [seeds/data/rides.js]   - En cours:', stats.inProgress);
  
  return generatedRides;
};

// ============================================================================
// COURSES PRÉDÉFINIES (pour tests spécifiques)
// ============================================================================

/**
 * Courses prédéfinies pour tester des scénarios spécifiques
 * @constant {Object[]}
 */
const rides = [];

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [seeds/data/rides.js] ✅ Module exporté');

module.exports = {
  rides,
  generateRides,
  locations,
  statusWeights,
  cancellationReasons,
  userRatingTags,
  driverRatingTags,
  reviewComments,
  calculateDistance,
  calculatePricing,
  getRandomStatus
};