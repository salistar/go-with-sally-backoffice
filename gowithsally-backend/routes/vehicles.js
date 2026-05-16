/**
 * ============================================================================
 * GO WITH SALLY - VEHICLE MANAGEMENT ROUTES
 * ============================================================================
 * Routes pour la gestion des véhicules
 *
 * @module routes/vehicles
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

/**
 * POST /api/vehicles
 * Ajouter un véhicule
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const Driver = require('../models/Driver');
    const { make, model, year, licensePlate, serviceType } = req.body;

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    if (!make || !model || !year || !licensePlate || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis'
      });
    }

    const vehicle = new Vehicle({
      driverId: driver._id,
      make,
      model,
      year,
      licensePlate: licensePlate.toUpperCase(),
      serviceType,
      ...req.body
    });

    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Véhicule ajouté',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/vehicles
 * Obtenir tous ses véhicules
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.json({
        success: true,
        data: []
      });
    }

    const vehicles = await Vehicle.find({
      driverId: driver._id
    });

    res.json({
      success: true,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/vehicles/:id
 * Obtenir un véhicule
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/vehicles/:id
 * Modifier un véhicule
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    Object.assign(vehicle, req.body);
    await vehicle.save();

    res.json({
      success: true,
      message: 'Véhicule mis à jour',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/vehicles/:id
 * Supprimer un véhicule
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    await Vehicle.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Véhicule supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/vehicles/:id/inspection
 * Enregistrer une inspection
 */
router.post('/:id/inspection', authenticate, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const { type, status, notes } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé'
      });
    }

    vehicle.inspections.push({
      date: new Date(),
      type,
      status,
      notes,
      inspector: req.user._id
    });

    await vehicle.save();

    res.json({
      success: true,
      message: 'Inspection enregistrée',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
