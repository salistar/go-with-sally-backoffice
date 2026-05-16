/**
 * ============================================================================
 * GO WITH SALLY - RIDE ROUTES
 * ============================================================================
 * Routes pour les courses
 * Gère les demandes, le suivi, les annulations et les évaluations
 * 
 * Base URL: /api/rides
 * ============================================================================
 */

console.log('📄 [routes/ride.js] Fichier chargé');

const express = require('express');
const router = express.Router();

console.log('📄 [routes/ride.js] Express Router initialisé');

// ============================================================================
// IMPORTS
// ============================================================================

const {
  verifyToken,
  verifyDriver,
  verifyDriverOnline,
  requirePhoneVerification,
  requireFullVerification,
  createRateLimiter
} = require('../middleware/auth');
const rideController = require('../controllers/rideController');
const nearestDriverController = require('../controllers/nearestDriverController');
const { Ride, Driver } = require('../models');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

console.log('📄 [routes/ride.js] Contrôleurs et middleware importés');

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Rate limiter pour les demandes de course
 * 10 demandes par 5 minutes
 */
const rideRequestLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 300000,
  message: 'Trop de demandes de course. Veuillez patienter.'
});

/**
 * Rate limiter pour le SOS
 * 5 déclenchements par heure
 */
const sosRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 3600000,
  message: 'Trop de déclenchements SOS.'
});

console.log('📄 [routes/ride.js] Rate limiters configurés');

// ============================================================================
// ROUTES UTILISATRICE - Demande et gestion de courses
// ============================================================================

/**
 * @route   POST /api/rides/request
 * @desc    Demander une nouvelle course
 * @access  Private (Token + Phone vérifié)
 * @body    {
 *            pickup: { address: string, coordinates: [lng, lat], notes?: string },
 *            dropoff: { address: string, coordinates: [lng, lat], notes?: string },
 *            stops?: Array,
 *            options?: { rideType, paymentMethod, scheduledTime, passengers, etc. }
 *          }
 * @returns { success, data: { ride, qrCodes, nearbyDriversCount } }
 */
router.post('/request',
  verifyToken,
  requirePhoneVerification,
  rideRequestLimiter,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /request - User:', req.user?.email);
    next();
  },
  rideController.requestRide
);

/**
 * @route   GET /api/rides/active
 * @desc    Obtenir la course active de l'utilisatrice
 * @access  Private (Token)
 * @returns { success, data: { ride } }
 */
router.get('/active',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /active - User:', req.user?.email);
    next();
  },
  rideController.getActiveRide
);

/**
 * @route   GET /api/rides/history
 * @desc    Historique des courses de l'utilisatrice
 * @access  Private (Token)
 * @query   { page?: number, limit?: number, status?: string }
 * @returns { success, data: { rides, pagination } }
 */
router.get('/history',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /history - User:', req.user?.email);
    next();
  },
  rideController.getUserHistory
);

/**
 * @route   GET /api/rides/estimate
 * @desc    Estimer le tarif d'une course sans la créer
 * @access  Private (Token)
 * @query   { pickupLng, pickupLat, dropoffLng, dropoffLat, rideType? }
 * @returns { success, data: { estimate } }
 */
router.get('/estimate',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/ride.js] GET /estimate - User:', req.user?.email);
    
    try {
      const { pickupLng, pickupLat, dropoffLng, dropoffLat, rideType = 'standard' } = req.query;
      
      // Validation
      if (!pickupLng || !pickupLat || !dropoffLng || !dropoffLat) {
        return res.status(400).json({
          success: false,
          message: 'Coordonnées de départ et d\'arrivée requises'
        });
      }
      
      // Calcul de distance (Haversine)
      const R = 6371e3;
      const φ1 = parseFloat(pickupLat) * Math.PI / 180;
      const φ2 = parseFloat(dropoffLat) * Math.PI / 180;
      const Δφ = (parseFloat(dropoffLat) - parseFloat(pickupLat)) * Math.PI / 180;
      const Δλ = (parseFloat(dropoffLng) - parseFloat(pickupLng)) * Math.PI / 180;
      
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Durée estimée
      const speeds = { standard: 25, comfort: 28, premium: 30, shared: 20 };
      const speedKmh = speeds[rideType] || 25;
      const duration = distance / (speedKmh / 3.6);
      
      // Tarif
      const distanceKm = distance / 1000;
      const durationMin = duration / 60;
      const typeMultipliers = { standard: 1, comfort: 1.3, premium: 1.8, shared: 0.7 };
      const multiplier = typeMultipliers[rideType] || 1;
      
      const baseFare = 10;
      const distanceFare = Math.round(distanceKm * 5 * 100) / 100;
      const timeFare = Math.round(durationMin * 0.5 * 100) / 100;
      const bookingFee = 5;
      
      const estimatedFare = Math.max(15, Math.round((baseFare + distanceFare + timeFare + bookingFee) * multiplier * 100) / 100);
      
      console.log('📄 [routes/ride.js] ✓ Estimation:', estimatedFare, 'MAD');
      
      res.json({
        success: true,
        data: {
          estimate: {
            distance: Math.round(distance),
            distanceKm: Math.round(distanceKm * 10) / 10,
            duration: Math.round(duration),
            durationMin: Math.round(durationMin),
            pricing: {
              baseFare,
              distanceFare,
              timeFare,
              bookingFee,
              estimatedFare,
              currency: 'MAD'
            },
            rideType
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur estimate:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes utilisatrice (demande) configurées');

// ============================================================================
// ROUTES UTILISATRICE - Actions sur une course
// ============================================================================

/**
 * @route   GET /api/rides/:rideId
 * @desc    Obtenir les détails d'une course
 * @access  Private (Token)
 * @returns { success, data: { ride } }
 */
router.get('/:rideId',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /:rideId -', req.params.rideId);
    next();
  },
  rideController.getRide
);

/**
 * @route   POST /api/rides/:rideId/cancel
 * @desc    Annuler une course
 * @access  Private (Token)
 * @body    { reason?: string, reasonCode?: string }
 * @returns { success, data: { cancellationFee } }
 */
router.post('/:rideId/cancel',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/cancel -', req.params.rideId);
    next();
  },
  rideController.cancelRide
);

/**
 * @route   POST /api/rides/:rideId/rate
 * @desc    Évaluer une course terminée
 * @access  Private (Token)
 * @body    { rating: number (1-5), review?: string, tags?: string[], tip?: number }
 * @returns { success, data: { rating, pointsEarned } }
 */
router.post('/:rideId/rate',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/rate -', req.params.rideId);
    next();
  },
  rideController.rateRide
);

/**
 * @route   POST /api/rides/:rideId/tip
 * @desc    Ajouter un pourboire après la course
 * @access  Private (Token)
 * @body    { amount: number }
 * @returns { success }
 */
router.post('/:rideId/tip',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/ride.js] POST /:rideId/tip -', req.params.rideId);
    
    try {
      const { amount } = req.body;
      
      if (!amount || amount < 5) {
        return res.status(400).json({
          success: false,
          message: 'Le pourboire minimum est de 5 MAD'
        });
      }
      
      const ride = await Ride.findById(req.params.rideId);
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      if (ride.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      if (ride.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Course non terminée' });
      }
      
      await ride.addTip(amount);
      
      // Mettre à jour les gains de la conductrice
      if (ride.driver) {
        await Driver.findByIdAndUpdate(ride.driver, {
          $inc: { 
            'earnings.today': amount,
            'earnings.week': amount,
            'earnings.month': amount,
            'earnings.total': amount,
            'earnings.available': amount
          }
        });
      }
      
      console.log('📄 [routes/ride.js] ✓ Pourboire ajouté:', amount, 'MAD');
      
      res.json({
        success: true,
        message: `Pourboire de ${amount} MAD ajouté`,
        data: { tip: amount }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur tip:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes utilisatrice (actions) configurées');

// ============================================================================
// ROUTES SÉCURITÉ
// ============================================================================

/**
 * @route   POST /api/rides/:rideId/sos
 * @desc    Déclencher le SOS (urgence)
 * @access  Private (Token)
 * @returns { success, data: { emergencyNumbers } }
 */
router.post('/:rideId/sos',
  verifyToken,
  sosRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] 🆘 POST /:rideId/sos -', req.params.rideId);
    next();
  },
  rideController.triggerSOS
);

/**
 * @route   POST /api/rides/:rideId/share
 * @desc    Partager la course avec des contacts
 * @access  Private (Token)
 * @body    { contactIds: ObjectId[] }
 * @returns { success, data: { shareLink } }
 */
router.post('/:rideId/share',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/share -', req.params.rideId);
    next();
  },
  rideController.shareRide
);

/**
 * @route   GET /api/rides/:rideId/track
 * @desc    Obtenir le lien de suivi public (pour les contacts)
 * @access  Public (avec token de partage)
 * @returns { success, data: { ride (limité) } }
 */
router.get('/:rideId/track',
  async (req, res) => {
    console.log('📄 [routes/ride.js] GET /:rideId/track -', req.params.rideId);
    
    try {
      const { token } = req.query;
      
      const ride = await Ride.findById(req.params.rideId)
        .select('rideNumber status pickup dropoff driver timestamps eta')
        .populate({
          path: 'driver',
          select: 'vehicle currentLocation',
          populate: { path: 'user', select: 'firstName' }
        });
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      // Vérifier si le partage est activé
      if (!ride.safety?.locationShared) {
        return res.status(403).json({ success: false, message: 'Partage non activé' });
      }
      
      res.json({
        success: true,
        data: {
          ride: {
            rideNumber: ride.rideNumber,
            status: ride.status,
            pickup: { address: ride.pickup.address, city: ride.pickup.city },
            dropoff: { address: ride.dropoff.address, city: ride.dropoff.city },
            driver: ride.driver ? {
              firstName: ride.driver.user?.firstName,
              vehicle: `${ride.driver.vehicle.brand} ${ride.driver.vehicle.model} - ${ride.driver.vehicle.color}`,
              plateNumber: ride.driver.vehicle.plateNumber,
              currentLocation: ride.driver.currentLocation
            } : null,
            eta: ride.eta,
            timestamps: ride.timestamps
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur track:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes sécurité configurées');

// ============================================================================
// ROUTES QR CODE
// ============================================================================

/**
 * @route   GET /api/rides/:rideId/qr-codes
 * @desc    Obtenir les QR codes de la course
 * @access  Private (Token)
 * @returns { success, data: { qrCodes: { pickup, dropoff } } }
 */
router.get('/:rideId/qr-codes',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/ride.js] GET /:rideId/qr-codes -', req.params.rideId);
    
    try {
      const ride = await Ride.findById(req.params.rideId);
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      // Vérifier les permissions
      const isUser = ride.user.toString() === req.user._id.toString();
      const isDriver = req.driver && ride.driver?.toString() === req.driver._id.toString();
      
      if (!isUser && !isDriver) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      // Générer les QR codes en base64
      const pickupQR = await QRCode.toDataURL(ride.qrCode.pickup.code);
      const dropoffQR = await QRCode.toDataURL(ride.qrCode.dropoff.code);
      
      console.log('📄 [routes/ride.js] ✓ QR codes générés');
      
      res.json({
        success: true,
        data: {
          qrCodes: {
            pickup: {
              code: ride.qrCode.pickup.code,
              image: pickupQR,
              scanned: ride.qrCode.pickup.scanned,
              scannedAt: ride.qrCode.pickup.scannedAt
            },
            dropoff: {
              code: ride.qrCode.dropoff.code,
              image: dropoffQR,
              scanned: ride.qrCode.dropoff.scanned,
              scannedAt: ride.qrCode.dropoff.scannedAt
            }
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur qr-codes:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   POST /api/rides/:rideId/verify-qr
 * @desc    Vérifier un QR code (pickup ou dropoff)
 * @access  Private (Token + Driver)
 * @body    { code: string, type: 'pickup' | 'dropoff' }
 * @returns { success }
 */
router.post('/:rideId/verify-qr',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/ride.js] POST /:rideId/verify-qr -', req.params.rideId);
    
    try {
      const { code, type } = req.body;
      
      if (!code || !['pickup', 'dropoff'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Code et type (pickup/dropoff) requis'
        });
      }
      
      const ride = await Ride.findById(req.params.rideId);
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      // Vérifier que c'est la conductrice assignée
      if (ride.driver.toString() !== req.driver._id.toString()) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      // Vérifier le code
      if (ride.qrCode[type].code !== code) {
        console.log('📄 [routes/ride.js] ❌ Code QR invalide');
        return res.status(400).json({
          success: false,
          message: 'Code QR invalide'
        });
      }
      
      // Marquer comme scanné
      ride.qrCode[type].scanned = true;
      ride.qrCode[type].scannedAt = new Date();
      ride.qrCode[type].scannedBy = 'driver';
      
      // Mettre à jour le statut si nécessaire
      if (type === 'pickup' && ride.status === 'driver_arrived') {
        ride.status = 'pickup_verified';
        ride.timestamps.pickupVerified = new Date();
      }
      
      await ride.save();
      
      console.log('📄 [routes/ride.js] ✓ QR', type, 'vérifié');
      
      res.json({
        success: true,
        message: `QR code ${type} vérifié`,
        data: {
          verified: true,
          newStatus: ride.status
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur verify-qr:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes QR code configurées');

// ============================================================================
// ROUTES CHAT
// ============================================================================

/**
 * @route   GET /api/rides/:rideId/messages
 * @desc    Obtenir les messages de la course
 * @access  Private (Token)
 * @returns { success, data: { messages } }
 */
router.get('/:rideId/messages',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/ride.js] GET /:rideId/messages -', req.params.rideId);
    
    try {
      const ride = await Ride.findById(req.params.rideId)
        .select('messages user driver');
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      // Vérifier les permissions
      const isUser = ride.user.toString() === req.user._id.toString();
      const isDriver = req.driver && ride.driver?.toString() === req.driver._id.toString();
      
      if (!isUser && !isDriver) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      res.json({
        success: true,
        data: {
          messages: ride.messages
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur messages:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   POST /api/rides/:rideId/messages
 * @desc    Envoyer un message
 * @access  Private (Token)
 * @body    { message: string, type?: 'text' | 'image' | 'location' }
 * @returns { success, data: { message } }
 */
router.post('/:rideId/messages',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/ride.js] POST /:rideId/messages -', req.params.rideId);
    
    try {
      const { message, type = 'text' } = req.body;
      
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message requis' });
      }
      
      const ride = await Ride.findById(req.params.rideId);
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      // Déterminer le sender
      const isUser = ride.user.toString() === req.user._id.toString();
      const isDriver = req.driver && ride.driver?.toString() === req.driver._id.toString();
      
      if (!isUser && !isDriver) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      const sender = isDriver ? 'driver' : 'user';
      
      // Ajouter le message
      await ride.addMessage(sender, req.user._id, message, type);
      
      console.log('📄 [routes/ride.js] ✓ Message envoyé par', sender);
      
      res.json({
        success: true,
        data: {
          message: {
            sender,
            message,
            type,
            timestamp: new Date()
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur send message:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes chat configurées');

// ============================================================================
// ROUTES CONDUCTRICE
// ============================================================================

/**
 * @route   GET /api/rides/driver/nearby
 * @desc    Obtenir les courses en attente à proximité
 * @access  Private (Token + Driver approuvé + En ligne)
 * @returns { success, data: { rides } }
 */
router.get('/driver/nearby',
  verifyToken,
  verifyDriver,
  verifyDriverOnline,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /driver/nearby - Driver:', req.driver?._id);
    next();
  },
  rideController.getNearbyRides
);

/**
 * @route   GET /api/rides/driver/history
 * @desc    Historique des courses de la conductrice
 * @access  Private (Token + Driver)
 * @returns { success, data: { rides, pagination } }
 */
router.get('/driver/history',
  verifyToken,
  verifyDriver,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /driver/history - Driver:', req.driver?._id);
    next();
  },
  rideController.getDriverHistory
);

/**
 * @route   POST /api/rides/:rideId/accept
 * @desc    Accepter une course
 * @access  Private (Token + Driver approuvé + En ligne)
 * @returns { success, data: { ride } }
 */
router.post('/:rideId/accept',
  verifyToken,
  verifyDriver,
  verifyDriverOnline,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/accept -', req.params.rideId);
    next();
  },
  rideController.acceptRide
);

/**
 * @route   POST /api/rides/:rideId/status
 * @desc    Mettre à jour le statut de la course
 * @access  Private (Token + Driver)
 * @body    { status: string }
 * @returns { success, data: { status } }
 */
router.post('/:rideId/status',
  verifyToken,
  verifyDriver,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/status -', req.params.rideId, 'to:', req.body.status);
    next();
  },
  rideController.updateRideStatus
);

/**
 * @route   POST /api/rides/:rideId/driver-cancel
 * @desc    Annuler une course (conductrice)
 * @access  Private (Token + Driver)
 * @body    { reason: string }
 * @returns { success }
 */
router.post('/:rideId/driver-cancel',
  verifyToken,
  verifyDriver,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/driver-cancel -', req.params.rideId);
    next();
  },
  rideController.driverCancelRide
);

/**
 * @route   POST /api/rides/:rideId/rate-user
 * @desc    Évaluer l'utilisatrice (par la conductrice)
 * @access  Private (Token + Driver)
 * @body    { rating: number (1-5), review?: string, tags?: string[] }
 * @returns { success }
 */
router.post('/:rideId/rate-user',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/ride.js] POST /:rideId/rate-user -', req.params.rideId);
    
    try {
      const { rating, review, tags = [] } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Note entre 1 et 5 requise' });
      }
      
      const ride = await Ride.findById(req.params.rideId);
      
      if (!ride) {
        return res.status(404).json({ success: false, message: 'Course non trouvée' });
      }
      
      if (ride.driver.toString() !== req.driver._id.toString()) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      if (ride.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Course non terminée' });
      }
      
      await ride.rateUser(rating, review, tags);
      
      console.log('📄 [routes/ride.js] ✓ Utilisatrice notée:', rating);
      
      res.json({
        success: true,
        message: 'Évaluation enregistrée',
        data: { rating, review, tags }
      });
      
    } catch (error) {
      console.log('📄 [routes/ride.js] ❌ Erreur rate-user:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/ride.js] Routes conductrice configurées');

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * @route   GET /api/rides
 * @desc    Documentation des routes courses
 * @access  Public
 */
router.get('/',
  (req, res) => {
    console.log('📄 [routes/ride.js] GET / - Documentation');
    
    res.json({
      success: true,
      message: 'Go With Sally - API Courses',
      version: '1.0.0',
      endpoints: {
        user: [
          { method: 'POST', path: '/request', description: 'Demander une course' },
          { method: 'GET', path: '/active', description: 'Course active' },
          { method: 'GET', path: '/history', description: 'Historique' },
          { method: 'GET', path: '/estimate', description: 'Estimer tarif' },
          { method: 'GET', path: '/:rideId', description: 'Détails course' },
          { method: 'POST', path: '/:rideId/cancel', description: 'Annuler' },
          { method: 'POST', path: '/:rideId/rate', description: 'Évaluer' },
          { method: 'POST', path: '/:rideId/tip', description: 'Pourboire' }
        ],
        safety: [
          { method: 'POST', path: '/:rideId/sos', description: 'Déclencher SOS' },
          { method: 'POST', path: '/:rideId/share', description: 'Partager course' },
          { method: 'GET', path: '/:rideId/track', description: 'Suivi public' }
        ],
        qrCode: [
          { method: 'GET', path: '/:rideId/qr-codes', description: 'Obtenir QR codes' },
          { method: 'POST', path: '/:rideId/verify-qr', description: 'Vérifier QR' }
        ],
        chat: [
          { method: 'GET', path: '/:rideId/messages', description: 'Messages' },
          { method: 'POST', path: '/:rideId/messages', description: 'Envoyer message' }
        ],
        driver: [
          { method: 'GET', path: '/driver/nearby', description: 'Courses proches' },
          { method: 'GET', path: '/driver/history', description: 'Historique' },
          { method: 'POST', path: '/:rideId/accept', description: 'Accepter' },
          { method: 'POST', path: '/:rideId/status', description: 'MAJ statut' },
          { method: 'POST', path: '/:rideId/driver-cancel', description: 'Annuler' },
          { method: 'POST', path: '/:rideId/rate-user', description: 'Noter utilisatrice' }
        ]
      }
    });
  }
);

// ============================================================================
// NEAREST DRIVER ROUTES
// ============================================================================

/**
 * @route   POST /api/rides/find-drivers
 * @desc    Trouver les conductrices les plus proches pour une course
 * @access  Private
 */
router.post('/find-drivers',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /find-drivers');
    next();
  },
  nearestDriverController.findDriversForRide
);

/**
 * @route   POST /api/rides/:rideId/assign
 * @desc    Assigner automatiquement la meilleure conductrice
 * @access  Private
 */
router.post('/:rideId/assign',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/assign');
    next();
  },
  nearestDriverController.autoAssignDriver
);

/**
 * @route   POST /api/rides/:rideId/notify-drivers
 * @desc    Notifier les conductrices à proximité
 * @access  Private
 */
router.post('/:rideId/notify-drivers',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] POST /:rideId/notify-drivers');
    next();
  },
  nearestDriverController.notifyNearbyDrivers
);

/**
 * @route   GET /api/drivers/nearby
 * @desc    Obtenir les conductrices à proximité (pour l'admin)
 * @access  Private (Admin)
 * @query   lat, lng, radius
 */
router.get('/drivers/nearby',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/ride.js] GET /drivers/nearby');
    next();
  },
  nearestDriverController.getNearbyDrivers
);

console.log('📄 [routes/ride.js] Routes Nearest Driver configurées');

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [routes/ride.js] ✅ Router exporté');
console.log('📄 [routes/ride.js] Routes User: /request, /active, /history, /estimate, /:id, /cancel, /rate, /tip');
console.log('📄 [routes/ride.js] Routes Safety: /sos, /share, /track');
console.log('📄 [routes/ride.js] Routes QR: /qr-codes, /verify-qr');
console.log('📄 [routes/ride.js] Routes Chat: /messages');
console.log('📄 [routes/ride.js] Routes Driver: /nearby, /history, /accept, /status, /driver-cancel, /rate-user');
console.log('📄 [routes/ride.js] Routes Nearest Driver: /find-drivers, /:rideId/assign, /:rideId/notify-drivers, /drivers/nearby');

module.exports = router;