/**
 * ============================================================================
 * GO WITH SALLY - SURGE PRICING ROUTES
 * ============================================================================
 * Routes pour la tarification dynamique
 *
 * @module routes/surgePricing
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

let authenticate, isAdmin;
try {
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
  isAdmin = mainAuth.verifyAdmin || mainAuth.admin;
} catch (e) {
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
  isAdmin = altAuth.isAdmin;
}

/**
 * GET /api/surge/current
 * Obtenir le multiplicateur de tarification actuel
 */
router.get('/current', async (req, res) => {
  try {
    const SurgePricing = require('../models/SurgePricing');
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées requises'
      });
    }

    const surge = await SurgePricing.findOne({
      area: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 5000 // 5km
        }
      },
      isActive: true
    });

    res.json({
      success: true,
      data: {
        multiplier: surge?.multiplier || 1.0,
        reason: surge?.reason,
        zone: surge?.zone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/surge (ADMIN)
 * Créer une zone de tarification dynamique
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const SurgePricing = require('../models/SurgePricing');
    const { zone, multiplier, reason, activeUntil } = req.body;

    if (!zone || !multiplier) {
      return res.status(400).json({
        success: false,
        message: 'Zone et multiplicateur requis'
      });
    }

    const surge = new SurgePricing({
      zone,
      multiplier,
      reason,
      activeUntil,
      isActive: true
    });

    await surge.save();

    res.status(201).json({
      success: true,
      message: 'Zone de tarification créée',
      data: surge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/surge (ADMIN)
 * Obtenir toutes les zones
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const SurgePricing = require('../models/SurgePricing');
    const surges = await SurgePricing.find({});

    res.json({
      success: true,
      data: surges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/surge/:id (ADMIN)
 * Modifier une zone
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const SurgePricing = require('../models/SurgePricing');
    const surge = await SurgePricing.findById(req.params.id);

    if (!surge) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    Object.assign(surge, req.body);
    await surge.save();

    res.json({
      success: true,
      message: 'Zone mise à jour',
      data: surge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/surge/:id (ADMIN)
 * Désactiver une zone
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const SurgePricing = require('../models/SurgePricing');
    const surge = await SurgePricing.findById(req.params.id);

    if (!surge) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    surge.isActive = false;
    await surge.save();

    res.json({
      success: true,
      message: 'Zone désactivée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
