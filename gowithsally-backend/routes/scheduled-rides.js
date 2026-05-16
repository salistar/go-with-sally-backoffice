/**
 * ============================================================================
 * GO WITH SALLY - SCHEDULED RIDES ROUTES
 * ============================================================================
 * Routes pour les trajets planifiés
 *
 * @module routes/scheduledRides
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

let authenticate;
try {
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
} catch (e) {
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
}

// ============================================================================
// ROUTES AUTHENTIFIÉES
// ============================================================================

/**
 * POST /api/scheduled-rides
 * Créer un trajet planifié
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const { pickupLocation, dropoffLocation, scheduledDateTime, preferences } = req.body;

    if (!pickupLocation || !dropoffLocation || !scheduledDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Localisation de départ, d\'arrivée et heure requises'
      });
    }

    const scheduledRide = new ScheduledRide({
      userId: req.user._id,
      pickupLocation,
      dropoffLocation,
      scheduledDateTime,
      preferences: preferences || { serviceType: 'standard' }
    });

    await scheduledRide.save();

    res.status(201).json({
      success: true,
      message: 'Trajet planifié créé',
      data: scheduledRide
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/scheduled-rides
 * Obtenir ses trajets planifiés
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const rides = await ScheduledRide.find({
      userId: req.user._id
    }).sort({ scheduledDateTime: 1 });

    res.json({
      success: true,
      data: rides
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/scheduled-rides/:id
 * Obtenir un trajet planifié
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const ride = await ScheduledRide.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Trajet non trouvé'
      });
    }

    if (ride.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/scheduled-rides/:id
 * Modifier un trajet planifié
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const ride = await ScheduledRide.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Trajet non trouvé'
      });
    }

    if (ride.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    Object.assign(ride, req.body);
    await ride.save();

    res.json({
      success: true,
      message: 'Trajet mis à jour',
      data: ride
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/scheduled-rides/:id
 * Annuler un trajet planifié
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const ride = await ScheduledRide.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Trajet non trouvé'
      });
    }

    if (ride.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await ScheduledRide.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Trajet supprimé'
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/scheduled-rides/:id/book
 * Réserver un trajet planifié (créer une instance)
 */
router.post('/:id/book', authenticate, async (req, res) => {
  try {
    const ScheduledRide = require('../models/ScheduledRide');
    const Ride = require('../models/Ride');

    const scheduled = await ScheduledRide.findById(req.params.id);

    if (!scheduled) {
      return res.status(404).json({
        success: false,
        message: 'Trajet planifié non trouvé'
      });
    }

    if (scheduled.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    const newRide = new Ride({
      userId: req.user._id,
      pickupLocation: scheduled.pickupLocation,
      dropoffLocation: scheduled.dropoffLocation,
      serviceType: scheduled.preferences.serviceType,
      scheduledRideId: scheduled._id
    });

    await newRide.save();

    scheduled.status = 'assigned';
    await scheduled.save();

    res.status(201).json({
      success: true,
      message: 'Trajet réservé',
      data: newRide
    });
  } catch (error) {
    console.error('[ScheduledRides] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
