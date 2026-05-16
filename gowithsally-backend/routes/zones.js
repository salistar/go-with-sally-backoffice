/**
 * ============================================================================
 * GO WITH SALLY - GEOFENCING ZONES ROUTES
 * ============================================================================
 * Routes pour les zones de service
 *
 * @module routes/zones
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
 * GET /api/zones
 * Obtenir toutes les zones
 */
router.get('/', async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zones = await Zone.find({
      isActive: true,
      status: 'active'
    });

    res.json({
      success: true,
      data: zones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/zones/check
 * Vérifier si une localisation est dans une zone active
 */
router.get('/check', async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées requises'
      });
    }

    const zone = await Zone.findOne({
      area: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        }
      },
      isActive: true,
      status: 'active'
    });

    res.json({
      success: true,
      inServiceArea: !!zone,
      zone: zone || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/zones/:id
 * Obtenir une zone
 */
router.get('/:id', async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zone = await Zone.findById(req.params.id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/zones (ADMIN)
 * Créer une zone
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const { name, area, zoneType } = req.body;

    if (!name || !area || !zoneType) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis'
      });
    }

    const zone = new Zone({
      name,
      area,
      zoneType,
      isActive: true,
      status: 'active'
    });

    await zone.save();

    res.status(201).json({
      success: true,
      message: 'Zone créée',
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/zones/:id (ADMIN)
 * Modifier une zone
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    const zone = await Zone.findById(req.params.id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone non trouvée'
      });
    }

    Object.assign(zone, req.body);
    await zone.save();

    res.json({
      success: true,
      message: 'Zone mise à jour',
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/zones/:id (ADMIN)
 * Supprimer une zone
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const Zone = require('../models/Zone');
    await Zone.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Zone supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
