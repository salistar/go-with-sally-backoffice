/**
 * ============================================================================
 * GO WITH SALLY - FAVORITES ROUTES
 * ============================================================================
 * Routes pour les lieux favoris
 *
 * @module routes/favorites
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
 * POST /api/favorites
 * Créer un lieu favori
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const Favorite = require('../models/Favorite');
    const { label, customLabel, address, coordinates, notes } = req.body;

    const favorite = new Favorite({
      userId: req.user._id,
      label: label || 'custom',
      customLabel,
      address,
      coordinates,
      notes
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      message: 'Lieu favori créé',
      data: favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/favorites
 * Obtenir tous ses lieux favoris
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const Favorite = require('../models/Favorite');
    const favorites = await Favorite.find({
      userId: req.user._id
    });

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/favorites/:id
 * Obtenir un lieu favori
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const Favorite = require('../models/Favorite');
    const favorite = await Favorite.findById(req.params.id);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Lieu non trouvé'
      });
    }

    if (favorite.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    res.json({
      success: true,
      data: favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/favorites/:id
 * Modifier un lieu favori
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const Favorite = require('../models/Favorite');
    const favorite = await Favorite.findById(req.params.id);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Lieu non trouvé'
      });
    }

    if (favorite.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    Object.assign(favorite, req.body);
    await favorite.save();

    res.json({
      success: true,
      message: 'Lieu mis à jour',
      data: favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/favorites/:id
 * Supprimer un lieu favori
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Favorite = require('../models/Favorite');
    const favorite = await Favorite.findById(req.params.id);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Lieu non trouvé'
      });
    }

    if (favorite.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await Favorite.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Lieu supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
