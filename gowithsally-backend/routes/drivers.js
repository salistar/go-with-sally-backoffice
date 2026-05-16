/**
 * ============================================================================
 * GO WITH SALLY - DRIVER ROUTES
 * ============================================================================
 * Routes pour les conductrices
 * Gère le profil, le statut en ligne, la localisation, les gains et les stats
 * 
 * Base URL: /api/driver
 * ============================================================================
 */

console.log('📄 [routes/driver.js] Fichier chargé');

const express = require('express');
const router = express.Router();

console.log('📄 [routes/driver.js] Express Router initialisé');

// ============================================================================
// IMPORTS
// ============================================================================

const { 
  verifyToken, 
  verifyDriver,
  verifyDriverOnline,
  createRateLimiter
} = require('../middleware/auth');
const { Driver, Ride } = require('../models');
const logger = require('../utils/logger');

console.log('📄 [routes/driver.js] Middleware et modèles importés');

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Rate limiter pour les mises à jour de position
 * 60 requêtes par minute (1 par seconde max)
 */
const locationRateLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60000,
  message: 'Trop de mises à jour de position.'
});

/**
 * Rate limiter pour les retraits
 * 3 requêtes par heure
 */
const withdrawalRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 3600000,
  message: 'Trop de demandes de retrait. Veuillez patienter.'
});

console.log('📄 [routes/driver.js] Rate limiters configurés');

// ============================================================================
// ROUTES PROFIL
// ============================================================================

/**
 * @route   GET /api/driver/me
 * @desc    Obtenir le profil complet de la conductrice
 * @access  Private (Token + Driver approuvé)
 * @returns { success, data: { driver, user } }
 */
router.get('/me',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /me - Driver:', req.driver?._id);
    
    res.json({
      success: true,
      data: {
        driver: {
          id: req.driver._id,
          status: req.driver.status,
          isOnline: req.driver.isOnline,
          isAvailable: req.driver.isAvailable,
          currentRide: req.driver.currentRide,
          vehicle: req.driver.vehicle,
          documents: {
            nationalId: { verified: req.driver.documents.nationalId.verified },
            drivingLicense: { verified: req.driver.documents.drivingLicense.verified },
            anthropometricRecord: { verified: req.driver.documents.anthropometricRecord.verified },
            profilePhoto: { verified: req.driver.documents.profilePhoto.verified }
          },
          documentsComplete: req.driver.documentsComplete,
          stats: req.driver.stats,
          earnings: req.driver.earnings,
          commissionRate: req.driver.commissionRate,
          currentLocation: req.driver.currentLocation
        },
        user: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          phone: req.user.phone,
          avatar: req.user.avatar
        }
      }
    });
  }
);

/**
 * @route   GET /api/driver/status
 * @desc    Obtenir le statut rapide de la conductrice
 * @access  Private (Token + Driver)
 * @returns { success, data: { isOnline, isAvailable, status, currentRide } }
 */
router.get('/status',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /status - Driver:', req.driver?._id);
    
    res.json({
      success: true,
      data: {
        isOnline: req.driver.isOnline,
        isAvailable: req.driver.isAvailable,
        status: req.driver.status,
        currentRide: req.driver.currentRide,
        canAcceptRides: req.driver.canAcceptRides
      }
    });
  }
);

console.log('📄 [routes/driver.js] Routes profil configurées');

// ============================================================================
// ROUTES STATUT EN LIGNE
// ============================================================================

/**
 * @route   POST /api/driver/online
 * @desc    Passer en ligne (disponible pour les courses)
 * @access  Private (Token + Driver approuvé)
 * @returns { success, message, data: { isOnline, isAvailable } }
 */
router.post('/online',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/driver.js] POST /online - Driver:', req.driver?._id);
    
    try {
      // Vérifier si déjà en ligne
      if (req.driver.isOnline) {
        console.log('📄 [routes/driver.js] ⚠ Déjà en ligne');
        return res.json({
          success: true,
          message: 'Vous êtes déjà en ligne',
          data: {
            isOnline: true,
            isAvailable: req.driver.isAvailable
          }
        });
      }
      
      // Passer en ligne
      await req.driver.goOnline();
      
      console.log('📄 [routes/driver.js] ✓ Conductrice en ligne');
      logger.info(`[DRIVER] ${req.user.email} est passée en ligne`);
      
      res.json({
        success: true,
        message: 'Vous êtes maintenant en ligne et disponible pour les courses',
        data: {
          isOnline: true,
          isAvailable: true
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur online:', error.message);
      logger.error(`[DRIVER] Online error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du passage en ligne'
      });
    }
  }
);

/**
 * @route   POST /api/driver/offline
 * @desc    Passer hors ligne (plus disponible)
 * @access  Private (Token + Driver approuvé)
 * @returns { success, message, data: { isOnline, isAvailable } }
 */
router.post('/offline',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/driver.js] POST /offline - Driver:', req.driver?._id);
    
    try {
      // Vérifier si déjà hors ligne
      if (!req.driver.isOnline) {
        console.log('📄 [routes/driver.js] ⚠ Déjà hors ligne');
        return res.json({
          success: true,
          message: 'Vous êtes déjà hors ligne',
          data: {
            isOnline: false,
            isAvailable: false
          }
        });
      }
      
      // Vérifier s'il y a une course en cours
      if (req.driver.currentRide) {
        console.log('📄 [routes/driver.js] ❌ Course en cours');
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas passer hors ligne pendant une course',
          data: { currentRide: req.driver.currentRide }
        });
      }
      
      // Passer hors ligne
      await req.driver.goOffline();
      
      console.log('📄 [routes/driver.js] ✓ Conductrice hors ligne');
      logger.info(`[DRIVER] ${req.user.email} est passée hors ligne`);
      
      res.json({
        success: true,
        message: 'Vous êtes maintenant hors ligne',
        data: {
          isOnline: false,
          isAvailable: false
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur offline:', error.message);
      logger.error(`[DRIVER] Offline error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: 'Erreur lors du passage hors ligne'
      });
    }
  }
);

/**
 * @route   POST /api/driver/toggle-availability
 * @desc    Basculer la disponibilité (en ligne mais pas disponible)
 * @access  Private (Token + Driver approuvé + En ligne)
 * @returns { success, data: { isAvailable } }
 */
router.post('/toggle-availability',
  verifyToken,
  verifyDriver,
  verifyDriverOnline,
  async (req, res) => {
    console.log('📄 [routes/driver.js] POST /toggle-availability - Driver:', req.driver?._id);
    
    try {
      // Vérifier s'il y a une course en cours
      if (req.driver.currentRide) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de changer la disponibilité pendant une course'
        });
      }
      
      // Basculer
      req.driver.isAvailable = !req.driver.isAvailable;
      await req.driver.save();
      
      console.log('📄 [routes/driver.js] ✓ Disponibilité:', req.driver.isAvailable);
      
      res.json({
        success: true,
        message: req.driver.isAvailable ? 'Vous êtes disponible' : 'Vous êtes en pause',
        data: {
          isAvailable: req.driver.isAvailable
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur toggle:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/driver.js] Routes statut configurées');

// ============================================================================
// ROUTES LOCALISATION
// ============================================================================

/**
 * @route   POST /api/driver/location
 * @desc    Mettre à jour la position GPS
 * @access  Private (Token + Driver approuvé)
 * @body    { coordinates: [lng, lat], heading?: number, speed?: number, accuracy?: number }
 * @returns { success }
 */
router.post('/location',
  verifyToken,
  verifyDriver,
  locationRateLimiter,
  async (req, res) => {
    console.log('📄 [routes/driver.js] POST /location - Driver:', req.driver?._id);
    
    try {
      const { coordinates, heading, speed, accuracy } = req.body;
      
      // Validation
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        console.log('📄 [routes/driver.js] ❌ Coordonnées invalides');
        return res.status(400).json({
          success: false,
          message: 'Coordonnées invalides. Format attendu: [longitude, latitude]'
        });
      }
      
      const [lng, lat] = coordinates;
      
      // Vérifier les valeurs
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.log('📄 [routes/driver.js] ❌ Coordonnées hors limites');
        return res.status(400).json({
          success: false,
          message: 'Coordonnées hors limites'
        });
      }
      
      // Mettre à jour la position
      await req.driver.updateLocation(coordinates, heading, speed, accuracy);
      
      console.log('📄 [routes/driver.js] ✓ Position mise à jour:', coordinates);
      
      res.json({
        success: true,
        data: {
          coordinates,
          heading,
          speed,
          updatedAt: new Date()
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur location:', error.message);
      logger.error(`[DRIVER] Location error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la position'
      });
    }
  }
);

/**
 * @route   GET /api/driver/location
 * @desc    Obtenir la dernière position connue
 * @access  Private (Token + Driver)
 * @returns { success, data: { location } }
 */
router.get('/location',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /location - Driver:', req.driver?._id);
    
    res.json({
      success: true,
      data: {
        location: req.driver.currentLocation,
        updatedAt: req.driver.currentLocation?.updatedAt
      }
    });
  }
);

console.log('📄 [routes/driver.js] Routes localisation configurées');

// ============================================================================
// ROUTES GAINS ET STATISTIQUES
// ============================================================================

/**
 * @route   GET /api/driver/earnings
 * @desc    Obtenir les gains et statistiques
 * @access  Private (Token + Driver)
 * @returns { success, data: { earnings, stats } }
 */
router.get('/earnings',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /earnings - Driver:', req.driver?._id);
    
    res.json({
      success: true,
      data: {
        earnings: {
          today: req.driver.earnings.today,
          week: req.driver.earnings.week,
          month: req.driver.earnings.month,
          total: req.driver.earnings.total,
          available: req.driver.earnings.available,
          pending: req.driver.earnings.pending,
          withdrawn: req.driver.earnings.withdrawn,
          currency: 'MAD'
        },
        stats: {
          completedRides: req.driver.stats.completedRides,
          cancelledRides: req.driver.stats.cancelledRides,
          totalDistance: req.driver.stats.totalDistance,
          totalHours: req.driver.stats.totalHours,
          averageRating: req.driver.stats.averageRating,
          totalRatings: req.driver.stats.totalRatings,
          acceptanceRate: req.driver.stats.acceptanceRate,
          responseTime: req.driver.stats.responseTime
        },
        commissionRate: req.driver.commissionRate
      }
    });
  }
);

/**
 * @route   GET /api/driver/earnings/history
 * @desc    Historique des gains par jour/semaine/mois
 * @access  Private (Token + Driver)
 * @query   { period: 'day' | 'week' | 'month', limit?: number }
 * @returns { success, data: { history } }
 */
router.get('/earnings/history',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/driver.js] GET /earnings/history - Driver:', req.driver?._id);
    
    try {
      const { period = 'day', limit = 30 } = req.query;
      
      // Construire la requête d'agrégation
      const groupBy = {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
        month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
      };
      
      const history = await Ride.aggregate([
        {
          $match: {
            driver: req.driver._id,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: groupBy[period] || groupBy.day,
            earnings: { $sum: '$pricing.driverEarnings' },
            rides: { $sum: 1 },
            distance: { $sum: '$route.actualDistance' },
            avgRating: { $avg: '$driverRating.rating' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: parseInt(limit) }
      ]);
      
      console.log('📄 [routes/driver.js] ✓ Historique récupéré:', history.length, 'périodes');
      
      res.json({
        success: true,
        data: {
          period,
          history: history.map(h => ({
            date: h._id,
            earnings: h.earnings,
            rides: h.rides,
            distance: Math.round(h.distance / 1000 * 10) / 10, // km
            avgRating: Math.round(h.avgRating * 10) / 10
          }))
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur history:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   POST /api/driver/withdraw
 * @desc    Demander un retrait de gains
 * @access  Private (Token + Driver)
 * @body    { amount: number, method: 'bank' | 'cash' }
 * @returns { success, data: { withdrawal } }
 */
router.post('/withdraw',
  verifyToken,
  verifyDriver,
  withdrawalRateLimiter,
  async (req, res) => {
    console.log('📄 [routes/driver.js] POST /withdraw - Driver:', req.driver?._id);
    
    try {
      const { amount, method = 'bank' } = req.body;
      
      // Validation
      if (!amount || amount < 50) {
        console.log('📄 [routes/driver.js] ❌ Montant invalide:', amount);
        return res.status(400).json({
          success: false,
          message: 'Le montant minimum de retrait est de 50 MAD'
        });
      }
      
      if (amount > req.driver.earnings.available) {
        console.log('📄 [routes/driver.js] ❌ Solde insuffisant');
        return res.status(400).json({
          success: false,
          message: 'Solde insuffisant',
          data: { available: req.driver.earnings.available }
        });
      }
      
      // Vérifier les infos bancaires pour les virements
      if (method === 'bank' && !req.driver.bank?.verified) {
        console.log('📄 [routes/driver.js] ❌ Infos bancaires non vérifiées');
        return res.status(400).json({
          success: false,
          message: 'Veuillez d\'abord vérifier vos informations bancaires'
        });
      }
      
      // Créer le retrait
      const withdrawal = await req.driver.withdraw(amount, method);
      
      console.log('📄 [routes/driver.js] ✓ Retrait demandé:', amount, 'MAD');
      logger.info(`[DRIVER] Retrait demandé: ${amount} MAD par ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Demande de retrait enregistrée',
        data: {
          withdrawal,
          newAvailableBalance: req.driver.earnings.available
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur withdraw:', error.message);
      logger.error(`[DRIVER] Withdraw error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la demande de retrait'
      });
    }
  }
);

/**
 * @route   GET /api/driver/withdrawals
 * @desc    Historique des retraits
 * @access  Private (Token + Driver)
 * @returns { success, data: { withdrawals } }
 */
router.get('/withdrawals',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /withdrawals - Driver:', req.driver?._id);
    
    res.json({
      success: true,
      data: {
        withdrawals: req.driver.withdrawals || [],
        totalWithdrawn: req.driver.earnings.withdrawn
      }
    });
  }
);

console.log('📄 [routes/driver.js] Routes gains configurées');

// ============================================================================
// ROUTES ÉVALUATIONS
// ============================================================================

/**
 * @route   GET /api/driver/ratings
 * @desc    Obtenir les évaluations reçues
 * @access  Private (Token + Driver)
 * @query   { page?: number, limit?: number }
 * @returns { success, data: { ratings, stats } }
 */
router.get('/ratings',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/driver.js] GET /ratings - Driver:', req.driver?._id);
    
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Récupérer les évaluations depuis les courses
      const rides = await Ride.find({
        driver: req.driver._id,
        'userRating.rating': { $exists: true }
      })
      .select('userRating user createdAt pickup dropoff')
      .populate('user', 'firstName lastName avatar')
      .sort({ 'userRating.createdAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
      const total = await Ride.countDocuments({
        driver: req.driver._id,
        'userRating.rating': { $exists: true }
      });
      
      console.log('📄 [routes/driver.js] ✓ Évaluations récupérées:', rides.length);
      
      res.json({
        success: true,
        data: {
          ratings: rides.map(r => ({
            rating: r.userRating.rating,
            review: r.userRating.review,
            tags: r.userRating.tags,
            user: {
              firstName: r.user.firstName,
              avatar: r.user.avatar
            },
            route: `${r.pickup.city || r.pickup.address} → ${r.dropoff.city || r.dropoff.address}`,
            createdAt: r.userRating.createdAt
          })),
          stats: {
            averageRating: req.driver.stats.averageRating,
            totalRatings: req.driver.stats.totalRatings,
            distribution: req.driver.ratings?.reduce((acc, r) => {
              acc[r.rating] = (acc[r.rating] || 0) + 1;
              return acc;
            }, {}) || {}
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur ratings:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/driver.js] Routes évaluations configurées');

// ============================================================================
// ROUTES DOCUMENTS
// ============================================================================

/**
 * @route   GET /api/driver/documents
 * @desc    Obtenir le statut des documents
 * @access  Private (Token + Driver - pas besoin d'être approuvé)
 * @returns { success, data: { documents, progress } }
 */
router.get('/documents',
  verifyToken,
  (req, res, next) => {
    // Vérifier qu'il y a un profil driver même non approuvé
    if (!req.driver) {
      return res.status(403).json({
        success: false,
        message: 'Profil conductrice requis'
      });
    }
    next();
  },
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /documents - Driver:', req.driver?._id);
    
    const docs = req.driver.documents;
    
    res.json({
      success: true,
      data: {
        documents: {
          nationalId: {
            uploaded: !!docs.nationalId.front,
            verified: docs.nationalId.verified,
            expiryDate: docs.nationalId.expiryDate
          },
          drivingLicense: {
            uploaded: !!docs.drivingLicense.front,
            verified: docs.drivingLicense.verified,
            expiryDate: docs.drivingLicense.expiryDate
          },
          anthropometricRecord: {
            uploaded: !!docs.anthropometricRecord.file,
            verified: docs.anthropometricRecord.verified
          },
          profilePhoto: {
            uploaded: !!docs.profilePhoto.file,
            verified: docs.profilePhoto.verified
          }
        },
        vehicle: {
          registration: {
            uploaded: !!req.driver.vehicle.registration?.file,
            verified: req.driver.vehicle.registration?.verified
          },
          insurance: {
            uploaded: !!req.driver.vehicle.insurance?.file,
            verified: req.driver.vehicle.insurance?.verified,
            expiryDate: req.driver.vehicle.insurance?.expiryDate
          },
          technicalInspection: {
            uploaded: !!req.driver.vehicle.technicalInspection?.file,
            verified: req.driver.vehicle.technicalInspection?.verified,
            expiryDate: req.driver.vehicle.technicalInspection?.expiryDate
          }
        },
        progress: req.driver.documentsProgress,
        isComplete: req.driver.documentsComplete,
        status: req.driver.status,
        statusReason: req.driver.statusReason
      }
    });
  }
);

/**
 * @route   GET /api/driver/documents/expiring
 * @desc    Obtenir les documents expirant bientôt
 * @access  Private (Token + Driver)
 * @returns { success, data: { expiringDocuments } }
 */
router.get('/documents/expiring',
  verifyToken,
  verifyDriver,
  (req, res) => {
    console.log('📄 [routes/driver.js] GET /documents/expiring - Driver:', req.driver?._id);
    
    const expiring = req.driver.getExpiringDocuments(30);
    
    res.json({
      success: true,
      data: {
        expiringDocuments: expiring,
        count: expiring.length
      }
    });
  }
);

console.log('📄 [routes/driver.js] Routes documents configurées');

// ============================================================================
// ROUTES COURSE ACTIVE
// ============================================================================

/**
 * @route   GET /api/driver/current-ride
 * @desc    Obtenir la course en cours
 * @access  Private (Token + Driver)
 * @returns { success, data: { ride } }
 */
router.get('/current-ride',
  verifyToken,
  verifyDriver,
  async (req, res) => {
    console.log('📄 [routes/driver.js] GET /current-ride - Driver:', req.driver?._id);
    
    try {
      if (!req.driver.currentRide) {
        return res.json({
          success: true,
          data: { ride: null }
        });
      }
      
      const ride = await Ride.findById(req.driver.currentRide)
        .populate('user', 'firstName lastName avatar phone stats');
      
      console.log('📄 [routes/driver.js] ✓ Course active:', ride?.rideNumber);
      
      res.json({
        success: true,
        data: { ride }
      });
      
    } catch (error) {
      console.log('📄 [routes/driver.js] ❌ Erreur current-ride:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/driver.js] Routes course active configurées');

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * @route   GET /api/driver
 * @desc    Documentation des routes conductrice
 * @access  Public
 */
router.get('/',
  (req, res) => {
    console.log('📄 [routes/driver.js] GET / - Documentation');
    
    res.json({
      success: true,
      message: 'Go With Sally - API Conductrice',
      version: '1.0.0',
      endpoints: {
        profile: [
          { method: 'GET', path: '/me', description: 'Profil complet' },
          { method: 'GET', path: '/status', description: 'Statut rapide' }
        ],
        availability: [
          { method: 'POST', path: '/online', description: 'Passer en ligne' },
          { method: 'POST', path: '/offline', description: 'Passer hors ligne' },
          { method: 'POST', path: '/toggle-availability', description: 'Basculer disponibilité' }
        ],
        location: [
          { method: 'POST', path: '/location', description: 'Mettre à jour position' },
          { method: 'GET', path: '/location', description: 'Dernière position' }
        ],
        earnings: [
          { method: 'GET', path: '/earnings', description: 'Gains et stats' },
          { method: 'GET', path: '/earnings/history', description: 'Historique gains' },
          { method: 'POST', path: '/withdraw', description: 'Demander retrait' },
          { method: 'GET', path: '/withdrawals', description: 'Historique retraits' }
        ],
        ratings: [
          { method: 'GET', path: '/ratings', description: 'Évaluations reçues' }
        ],
        documents: [
          { method: 'GET', path: '/documents', description: 'Statut documents' },
          { method: 'GET', path: '/documents/expiring', description: 'Documents expirant' }
        ],
        ride: [
          { method: 'GET', path: '/current-ride', description: 'Course en cours' }
        ]
      }
    });
  }
);

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [routes/driver.js] ✅ Router exporté');
console.log('📄 [routes/driver.js] Routes: /me, /status, /online, /offline, /toggle-availability');
console.log('📄 [routes/driver.js] Routes: /location, /earnings, /earnings/history, /withdraw, /withdrawals');
console.log('📄 [routes/driver.js] Routes: /ratings, /documents, /documents/expiring, /current-ride');

module.exports = router;