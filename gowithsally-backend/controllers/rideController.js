/**
 * ============================================================================
 * GO WITH SALLY - RIDE CONTROLLER
 * ============================================================================
 * Contrôleur des courses
 * Gère les demandes de courses, le suivi, les annulations et les évaluations
 * ============================================================================
 */

console.log('📄 [rideController.js] Fichier chargé');

const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');

console.log('📄 [rideController.js] Dépendances importées');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  PRICING: {
    BASE_FARE: 10,
    PER_KM: 5,
    PER_MINUTE: 0.5,
    BOOKING_FEE: 5,
    MIN_FARE: 15,
    STOP_FEE: 5
  }
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude point 1
 * @param {number} lon1 - Longitude point 1
 * @param {number} lat2 - Latitude point 2
 * @param {number} lon2 - Longitude point 2
 * @returns {number} - Distance en mètres
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  console.log('📄 [rideController.js] calculateDistance appelé');
  
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  
  console.log('📄 [rideController.js] Distance calculée:', Math.round(distance), 'm');
  return distance;
};

/**
 * Estime la durée du trajet basée sur la distance
 * @param {number} distanceMeters - Distance en mètres
 * @param {string} rideType - Type de course
 * @returns {number} - Durée en secondes
 */
const estimateDuration = (distanceMeters, rideType = 'standard') => {
  console.log('📄 [rideController.js] estimateDuration appelé');
  
  const speeds = { standard: 25, comfort: 28, premium: 30, shared: 20 };
  const speedKmh = speeds[rideType] || 25;
  const speedMs = speedKmh / 3.6;
  const duration = distanceMeters / speedMs;
  
  console.log('📄 [rideController.js] Durée estimée:', Math.round(duration), 'secondes');
  return Math.round(duration);
};

/**
 * Calcule le tarif estimé
 */
const calculatePricing = (distance, duration, options = {}) => {
  console.log('📄 [rideController.js] calculatePricing appelé');
  
  const { rideType = 'standard', stops = 0, surgeMultiplier = 1 } = options;
  
  const pricing = config.PRICING;
  
  const typeMultipliers = { standard: 1, comfort: 1.3, premium: 1.8, shared: 0.7 };
  const typeMultiplier = typeMultipliers[rideType] || 1;
  
  const distanceKm = distance / 1000;
  const durationMin = duration / 60;
  
  const baseFare = pricing.BASE_FARE;
  const distanceFare = Math.round(distanceKm * pricing.PER_KM * 100) / 100;
  const timeFare = Math.round(durationMin * pricing.PER_MINUTE * 100) / 100;
  const bookingFee = pricing.BOOKING_FEE;
  const stopsFee = stops * pricing.STOP_FEE;
  
  const subtotal = (baseFare + distanceFare + timeFare + bookingFee + stopsFee) * typeMultiplier * surgeMultiplier;
  const estimatedFare = Math.max(pricing.MIN_FARE, Math.round(subtotal * 100) / 100);
  
  console.log('📄 [rideController.js] Tarif estimé:', estimatedFare, 'MAD');
  
  return { estimatedFare, baseFare, distanceFare, timeFare, bookingFee, stopsFee, surgeMultiplier, currency: 'MAD' };
};

// ============================================================================
// REQUEST RIDE - Demander une course
// ============================================================================

/**
 * Demander une nouvelle course
 * @route POST /api/rides
 */
exports.requestRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ requestRide() appelé');
  
  try {
    const userId = req.user._id;
    const { pickup, dropoff, stops = [], options = {} } = req.body;
    
    console.log('📄 [rideController.js] Demande de course par user:', userId);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!pickup?.address || !pickup?.coordinates) {
      return res.status(400).json({ 
        success: false, 
        message: 'Point de départ requis (address et coordinates)' 
      });
    }
    
    if (!dropoff?.address || !dropoff?.coordinates) {
      return res.status(400).json({ 
        success: false, 
        message: 'Point d\'arrivée requis (address et coordinates)' 
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérifier course active existante
    // ─────────────────────────────────────────────────────────────────────────
    
    const activeRide = await Ride.getActiveRide(userId);
    
    if (activeRide) {
      console.log('📄 [rideController.js] ❌ Course active existante:', activeRide.rideNumber);
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà une course en cours',
        data: { activeRideId: activeRide._id }
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Calculs distance, durée et tarif
    // ─────────────────────────────────────────────────────────────────────────
    
    const [pickupLng, pickupLat] = pickup.coordinates;
    const [dropoffLng, dropoffLat] = dropoff.coordinates;
    
    const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const duration = estimateDuration(distance, options.rideType);
    const pricing = calculatePricing(distance, duration, { 
      rideType: options.rideType, 
      stops: stops.length 
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Créer la course
    // ─────────────────────────────────────────────────────────────────────────
    
    const ride = await Ride.create({
      user: userId,
      status: 'searching',
      pickup: {
        address: pickup.address,
        city: pickup.city,
        coordinates: { type: 'Point', coordinates: pickup.coordinates },
        notes: pickup.notes,
        landmark: pickup.landmark
      },
      dropoff: {
        address: dropoff.address,
        city: dropoff.city,
        coordinates: { type: 'Point', coordinates: dropoff.coordinates },
        notes: dropoff.notes,
        landmark: dropoff.landmark
      },
      stops: stops.map(s => ({
        address: s.address,
        coordinates: { type: 'Point', coordinates: s.coordinates },
        notes: s.notes
      })),
      route: { distance, duration },
      pricing,
      payment: { 
        method: options.paymentMethod || 'cash', 
        status: 'pending' 
      },
      options: {
        rideType: options.rideType || 'standard',
        isScheduled: !!options.scheduledTime,
        scheduledTime: options.scheduledTime,
        passengers: options.passengers || 1,
        childSeat: options.childSeat || false,
        quietRide: options.quietRide || false,
        luggageSize: options.luggageSize || 'none'
      },
      metadata: {
        platform: req.headers['x-platform'] || 'app',
        appVersion: req.headers['x-app-version']
      }
    });
    
    console.log('📄 [rideController.js] ✓ Course créée:', ride.rideNumber);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Chercher des conductrices disponibles
    // ─────────────────────────────────────────────────────────────────────────
    
    let nearbyDrivers = [];
    try {
      nearbyDrivers = await Driver.findNearbyAvailable(pickup.coordinates, 10000);
      console.log('📄 [rideController.js] Conductrices disponibles:', nearbyDrivers.length);
    } catch (err) {
      console.log('📄 [rideController.js] ⚠ Erreur recherche conductrices:', err.message);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Réponse
    // ─────────────────────────────────────────────────────────────────────────
    
    res.status(201).json({
      success: true,
      message: 'Course créée, recherche de conductrice en cours...',
      data: {
        ride: {
          id: ride._id,
          rideNumber: ride.rideNumber,
          status: ride.status,
          pickup: ride.pickup,
          dropoff: ride.dropoff,
          route: {
            distance: ride.route.distance,
            duration: ride.route.duration,
            distanceKm: Math.round(distance / 1000 * 10) / 10,
            durationMin: Math.round(duration / 60)
          },
          pricing: ride.pricing,
          qrCode: ride.qrCode
        },
        nearbyDriversCount: nearbyDrivers.length
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur requestRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la course' 
    });
  }
};

// ============================================================================
// GET RIDE - Obtenir les détails d'une course
// ============================================================================

/**
 * Obtenir les détails d'une course
 * @route GET /api/rides/:rideId
 */
exports.getRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ getRide() appelé');
  
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId)
      .populate('user', 'firstName lastName avatar phone')
      .populate({ 
        path: 'driver', 
        populate: { path: 'user', select: 'firstName lastName avatar phone' } 
      });
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    console.log('📄 [rideController.js] ✓ Course récupérée:', ride.rideNumber);
    
    res.json({ 
      success: true, 
      data: { ride } 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur getRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération' 
    });
  }
};

// ============================================================================
// GET ACTIVE RIDE - Obtenir la course active
// ============================================================================

/**
 * Obtenir la course active de l'utilisatrice
 * @route GET /api/rides/active
 */
exports.getActiveRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ getActiveRide() appelé');
  
  try {
    const ride = await Ride.getActiveRide(req.user._id);
    
    console.log('📄 [rideController.js] Course active:', ride?.rideNumber || 'aucune');
    
    res.json({ 
      success: true, 
      data: { ride } 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur getActiveRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur' 
    });
  }
};

// ============================================================================
// CANCEL RIDE - Annuler une course
// ============================================================================

/**
 * Annuler une course (côté utilisatrice)
 * @route POST /api/rides/:rideId/cancel
 */
exports.cancelRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ cancelRide() appelé');
  
  try {
    const { rideId } = req.params;
    const { reason, reasonCode } = req.body;
    
    const ride = await Ride.findById(rideId).populate('driver');
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    // Vérifier que c'est bien la course de l'utilisatrice
    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé' 
      });
    }
    
    // Vérifier que la course peut être annulée
    if (!ride.canBeCancelled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette course ne peut plus être annulée' 
      });
    }
    
    // Frais d'annulation si conductrice déjà assignée
    const fee = ride.driver ? 10 : 0;
    
    // Annuler la course
    await ride.cancelRide('user', reason || 'Annulée par l\'utilisatrice', reasonCode || 'changed_mind', fee);
    
    // Libérer la conductrice si assignée
    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver._id, { 
        isAvailable: true, 
        currentRide: null 
      });
    }
    
    console.log('📄 [rideController.js] ✓ Course annulée:', ride.rideNumber);
    
    res.json({ 
      success: true, 
      message: 'Course annulée', 
      data: { 
        cancellationFee: fee,
        refundAmount: ride.cancellation?.refundAmount || 0
      } 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur cancelRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'annulation' 
    });
  }
};

// ============================================================================
// RATE RIDE - Évaluer une course
// ============================================================================

/**
 * Évaluer une course terminée
 * @route POST /api/rides/:rideId/rate
 */
exports.rateRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ rateRide() appelé');
  
  try {
    const { rideId } = req.params;
    const { rating, review, tags = [], tip = 0 } = req.body;
    
    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Note entre 1 et 5 requise' 
      });
    }
    
    const ride = await Ride.findById(rideId).populate('driver');
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    // Vérifications
    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé' 
      });
    }
    
    if (ride.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'La course doit être terminée pour être notée' 
      });
    }
    
    if (ride.userRating?.rating) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette course a déjà été notée' 
      });
    }
    
    // Enregistrer l'évaluation
    await ride.rateDriver(rating, review, tags);
    
    // Mettre à jour la note de la conductrice
    if (ride.driver) {
      await ride.driver.addRating(ride._id, req.user._id, rating, review, tags);
    }
    
    // Ajouter le pourboire si présent
    if (tip > 0) {
      await ride.addTip(tip);
    }
    
    // Bonus de points pour l'évaluation
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { points: 5 } 
    });
    
    console.log('📄 [rideController.js] ✓ Évaluation enregistrée:', rating, '/5');
    
    res.json({ 
      success: true, 
      message: 'Merci pour votre évaluation!', 
      data: { 
        rating, 
        tip, 
        pointsEarned: 5 
      } 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur rateRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'évaluation' 
    });
  }
};

// ============================================================================
// GET USER HISTORY - Historique des courses
// ============================================================================

/**
 * Obtenir l'historique des courses de l'utilisatrice
 * @route GET /api/rides/history
 */
exports.getUserHistory = async (req, res) => {
  console.log('📄 [rideController.js] ▶ getUserHistory() appelé');
  
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [rides, total] = await Promise.all([
      Ride.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({ 
          path: 'driver', 
          populate: { path: 'user', select: 'firstName lastName avatar' } 
        }),
      Ride.countDocuments({ user: req.user._id })
    ]);
    
    console.log('📄 [rideController.js] ✓ Historique:', rides.length, 'courses');
    
    res.json({
      success: true,
      data: {
        rides: rides.map(r => ({
          id: r._id,
          rideNumber: r.rideNumber,
          status: r.status,
          pickup: r.pickup.address,
          dropoff: r.dropoff.address,
          fare: r.pricing.finalFare || r.pricing.estimatedFare,
          rating: r.userRating?.rating,
          driver: r.driver ? {
            name: `${r.driver.user?.firstName} ${r.driver.user?.lastName?.charAt(0)}.`,
            avatar: r.driver.user?.avatar,
            vehicle: r.driver.vehicle
          } : null,
          createdAt: r.createdAt
        })),
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total, 
          pages: Math.ceil(total / parseInt(limit)) 
        }
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur getUserHistory:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération' 
    });
  }
};

// ============================================================================
// TRIGGER SOS - Déclencher l'alerte d'urgence
// ============================================================================

/**
 * Déclencher l'alerte SOS
 * @route POST /api/rides/:rideId/sos
 */
exports.triggerSOS = async (req, res) => {
  console.log('📄 [rideController.js] ▶ 🆘 triggerSOS() appelé');
  
  try {
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé' 
      });
    }
    
    await ride.triggerSOS('user');
    
    console.log(`🆘 SOS déclenché - Course: ${ride.rideNumber}`);
    
    res.json({
      success: true,
      message: '🆘 SOS activé! Les services d\'urgence ont été alertés.',
      data: {
        sosTriggered: true,
        emergencyNumbers: { 
          police: '19', 
          gendarmerie: '177', 
          samu: '15',
          pompiers: '150'
        },
        rideNumber: ride.rideNumber
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur triggerSOS:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du déclenchement du SOS' 
    });
  }
};

// ============================================================================
// SHARE RIDE - Partager la course
// ============================================================================

/**
 * Partager la course avec des contacts
 * @route POST /api/rides/:rideId/share
 */
exports.shareRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ shareRide() appelé');
  
  try {
    const { rideId } = req.params;
    const { contactIds = [] } = req.body;
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    await ride.shareLocation(contactIds);
    
    console.log('📄 [rideController.js] ✓ Course partagée avec', contactIds.length, 'contacts');
    
    res.json({
      success: true,
      message: 'Course partagée avec vos contacts',
      data: { 
        shareLink: `https://gowithsally.ma/track/${ride.rideNumber}`,
        sharedWith: contactIds.length
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur shareRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du partage' 
    });
  }
};

// ============================================================================
// SEND MESSAGE - Envoyer un message
// ============================================================================

/**
 * Envoyer un message dans le chat de la course
 * @route POST /api/rides/:rideId/message
 */
exports.sendMessage = async (req, res) => {
  console.log('📄 [rideController.js] ▶ sendMessage() appelé');
  
  try {
    const { rideId } = req.params;
    const { message, type = 'text' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Le message est requis'
      });
    }
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Course non trouvée'
      });
    }
    
    await ride.addMessage('user', req.user._id, message, type);
    
    console.log('📄 [rideController.js] ✓ Message envoyé');
    
    res.json({
      success: true,
      message: 'Message envoyé'
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur sendMessage:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi'
    });
  }
};

// ============================================================================
// DRIVER: ACCEPT RIDE - Accepter une course
// ============================================================================

/**
 * Accepter une course (conductrice)
 * @route POST /api/rides/:rideId/accept
 */
exports.acceptRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ acceptRide() appelé');
  
  try {
    const { rideId } = req.params;
    const driverId = req.driver._id;
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    if (ride.status !== 'searching') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cette course n\'est plus disponible' 
      });
    }
    
    if (!req.driver.isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous n\'êtes pas disponible' 
      });
    }
    
    // Assigner la conductrice
    ride.driver = driverId;
    ride.status = 'driver_assigned';
    ride.timestamps.driverAssigned = new Date();
    await ride.save();
    
    // Mettre à jour le statut de la conductrice
    req.driver.isAvailable = false;
    req.driver.currentRide = ride._id;
    await req.driver.save();
    
    // Charger les infos utilisatrice
    const populated = await Ride.findById(rideId)
      .populate('user', 'firstName lastName avatar phone');
    
    console.log('📄 [rideController.js] ✓ Course acceptée:', ride.rideNumber);
    
    res.json({ 
      success: true, 
      message: 'Course acceptée!', 
      data: { ride: populated } 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur acceptRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'acceptation' 
    });
  }
};

// ============================================================================
// DRIVER: UPDATE STATUS - Mettre à jour le statut
// ============================================================================

/**
 * Mettre à jour le statut de la course (conductrice)
 * @route PUT /api/rides/:rideId/status
 */
exports.updateRideStatus = async (req, res) => {
  console.log('📄 [rideController.js] ▶ updateRideStatus() appelé');
  
  try {
    const { rideId } = req.params;
    const { status } = req.body;
    
    const validStatuses = [
      'driver_arriving', 
      'driver_arrived', 
      'pickup_verified', 
      'in_progress', 
      'arriving', 
      'completed'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Statut invalide' 
      });
    }
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    if (ride.driver.toString() !== req.driver._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé' 
      });
    }
    
    const oldStatus = ride.status;
    await ride.updateStatus(status);
    
    console.log('📄 [rideController.js] ✓ Status:', oldStatus, '->', status);
    
    let responseData = { status };
    
    // Si course terminée, calculer les gains
    if (status === 'completed') {
      ride.calculateFinalFare();
      const earnings = ride.calculateDriverEarnings(req.driver.commissionRate || 0.15);
      
      const distance = (ride.route.actualDistance || ride.route.distance) / 1000;
      const duration = (ride.route.actualDuration || ride.route.duration) / 60;
      
      await req.driver.completeRide(earnings, distance, duration);
      
      // Mettre à jour les stats utilisatrice
      await User.findByIdAndUpdate(ride.user, { 
        $inc: { 
          'stats.totalRides': 1, 
          'stats.totalSpent': ride.pricing.finalFare,
          points: 10 
        } 
      });
      
      console.log('📄 [rideController.js] ✓ Gains conductrice:', earnings, 'MAD');
      
      responseData.finalFare = ride.pricing.finalFare;
      responseData.earnings = ride.pricing.driverEarnings;
    }
    
    res.json({
      success: true,
      message: `Statut mis à jour: ${status}`,
      data: responseData
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur updateRideStatus:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour' 
    });
  }
};

// ============================================================================
// DRIVER: GET HISTORY - Historique conductrice
// ============================================================================

/**
 * Obtenir l'historique des courses de la conductrice
 * @route GET /api/rides/driver/history
 */
exports.getDriverHistory = async (req, res) => {
  console.log('📄 [rideController.js] ▶ getDriverHistory() appelé');
  
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [rides, total] = await Promise.all([
      Ride.find({ driver: req.driver._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'firstName lastName avatar'),
      Ride.countDocuments({ driver: req.driver._id })
    ]);
    
    console.log('📄 [rideController.js] ✓ Historique conductrice:', rides.length);
    
    res.json({
      success: true,
      data: {
        rides: rides.map(r => ({ 
          id: r._id, 
          rideNumber: r.rideNumber, 
          status: r.status, 
          user: r.user, 
          earnings: r.pricing.driverEarnings, 
          rating: r.userRating?.rating,
          pickup: r.pickup.address,
          dropoff: r.dropoff.address,
          createdAt: r.createdAt 
        })),
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total, 
          pages: Math.ceil(total / parseInt(limit)) 
        }
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur getDriverHistory:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur' 
    });
  }
};

// ============================================================================
// DRIVER: GET NEARBY RIDES - Courses à proximité
// ============================================================================

/**
 * Obtenir les courses à proximité de la conductrice
 * @route GET /api/rides/driver/nearby
 */
exports.getNearbyRides = async (req, res) => {
  console.log('📄 [rideController.js] ▶ getNearbyRides() appelé');
  
  try {
    // Vérifier la position de la conductrice
    if (!req.driver.currentLocation?.coordinates || 
        req.driver.currentLocation.coordinates[0] === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Votre position n\'est pas disponible. Activez la géolocalisation.' 
      });
    }
    
    const rides = await Ride.findWaitingRides(
      req.driver.currentLocation.coordinates, 
      10000 // 10km
    );
    
    console.log('📄 [rideController.js] ✓ Courses proches:', rides.length);
    
    res.json({
      success: true,
      data: {
        rides: rides.map(r => ({
          id: r._id,
          rideNumber: r.rideNumber,
          user: { 
            name: `${r.user.firstName} ${r.user.lastName?.charAt(0)}.`, 
            rating: r.user.stats?.averageRating 
          },
          pickup: r.pickup,
          dropoff: r.dropoff,
          route: {
            distanceKm: Math.round(r.route.distance / 1000 * 10) / 10,
            durationMin: Math.round(r.route.duration / 60)
          },
          estimatedFare: r.pricing.estimatedFare,
          options: r.options
        }))
      }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur getNearbyRides:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur' 
    });
  }
};

// ============================================================================
// DRIVER: CANCEL RIDE - Annuler une course
// ============================================================================

/**
 * Annuler une course (conductrice)
 * @route POST /api/rides/:rideId/driver-cancel
 */
exports.driverCancelRide = async (req, res) => {
  console.log('📄 [rideController.js] ▶ driverCancelRide() appelé');
  
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course non trouvée' 
      });
    }
    
    if (ride.driver.toString() !== req.driver._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Non autorisé' 
      });
    }
    
    // Annuler la course
    await ride.cancelRide('driver', reason || 'Annulée par la conductrice', 'driver_requested', 0);
    
    // Mettre à jour les stats conductrice
    await req.driver.cancelRide(reason);
    
    console.log('📄 [rideController.js] ✓ Course annulée par conductrice:', ride.rideNumber);
    
    res.json({ 
      success: true, 
      message: 'Course annulée' 
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur driverCancelRide:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur' 
    });
  }
};

// ============================================================================
// DRIVER: UPDATE LOCATION - Mettre à jour la position
// ============================================================================

/**
 * Mettre à jour la position pendant une course
 * @route POST /api/rides/:rideId/location
 */
exports.updateLocation = async (req, res) => {
  console.log('📄 [rideController.js] ▶ updateLocation() appelé');
  
  try {
    const { rideId } = req.params;
    const { coordinates, speed, heading, accuracy } = req.body;
    
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées invalides'
      });
    }
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Course non trouvée'
      });
    }
    
    // Ajouter le point de tracking
    await ride.addTrackingPoint(coordinates, speed, heading, accuracy);
    
    // Mettre à jour la position de la conductrice
    if (req.driver) {
      await req.driver.updateLocation(coordinates, heading, speed, accuracy);
    }
    
    res.json({
      success: true,
      message: 'Position mise à jour'
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur updateLocation:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// VERIFY QR CODE - Vérifier le QR code
// ============================================================================

/**
 * Vérifier le QR code de la course
 * @route POST /api/rides/:rideId/verify-qr
 */
exports.verifyQRCode = async (req, res) => {
  console.log('📄 [rideController.js] ▶ verifyQRCode() appelé');
  
  try {
    const { rideId } = req.params;
    const { code, type } = req.body; // type: 'pickup' ou 'dropoff'
    
    if (!code || !type) {
      return res.status(400).json({
        success: false,
        message: 'Code et type requis'
      });
    }
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Course non trouvée'
      });
    }
    
    // Vérifier le code
    const expectedCode = type === 'pickup' 
      ? ride.qrCode.pickup.code 
      : ride.qrCode.dropoff.code;
    
    if (code !== expectedCode) {
      return res.status(400).json({
        success: false,
        message: 'Code QR invalide'
      });
    }
    
    // Marquer comme scanné
    if (type === 'pickup') {
      ride.qrCode.pickup.scanned = true;
      ride.qrCode.pickup.scannedAt = new Date();
      ride.qrCode.pickup.scannedBy = req.user ? 'user' : 'driver';
      
      if (ride.status === 'driver_arrived') {
        ride.status = 'pickup_verified';
        ride.timestamps.pickupVerified = new Date();
      }
    } else {
      ride.qrCode.dropoff.scanned = true;
      ride.qrCode.dropoff.scannedAt = new Date();
      ride.qrCode.dropoff.scannedBy = req.user ? 'user' : 'driver';
    }
    
    await ride.save();
    
    console.log('📄 [rideController.js] ✓ QR code vérifié:', type);
    
    res.json({
      success: true,
      message: `QR code ${type} vérifié`,
      data: { status: ride.status }
    });
    
  } catch (error) {
    console.log('📄 [rideController.js] ❌ Erreur verifyQRCode:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

console.log('📄 [rideController.js] ✅ Contrôleur exporté');
console.log('📄 [rideController.js] User: requestRide, getRide, getActiveRide, cancelRide, rateRide, getUserHistory, triggerSOS, shareRide, sendMessage, verifyQRCode');
console.log('📄 [rideController.js] Driver: acceptRide, updateRideStatus, getDriverHistory, getNearbyRides, driverCancelRide, updateLocation');

