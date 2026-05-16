/**
 * ============================================================================
 * GO WITH SALLY - LOST & FOUND ROUTES
 * ============================================================================
 * Routes pour les objets perdus/trouvés
 *
 * @module routes/lostFound
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
 * POST /api/lost-found/report
 * Signaler un objet perdu/trouvé
 */
router.post('/report', authenticate, async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const { rideId, itemType, itemDescription, color, reporterType } = req.body;

    if (!rideId || !itemType || !itemDescription) {
      return res.status(400).json({
        success: false,
        message: 'Trajet, type et description requis'
      });
    }

    const item = new LostAndFound({
      rideId,
      reporterId: req.user._id,
      reporterType: reporterType || 'passenger',
      itemType,
      itemDescription,
      color,
      reportDate: new Date(),
      status: 'reported'
    });

    await item.save();

    res.status(201).json({
      success: true,
      message: 'Objet signalé',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/lost-found
 * Obtenir ses signalements
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const { status } = req.query;

    let query = { reporterId: req.user._id };

    if (status) {
      query.status = status;
    }

    const items = await LostAndFound.find(query).sort({ reportDate: -1 });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/lost-found/available
 * Obtenir les objets disponibles
 */
router.get('/available', async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const items = await LostAndFound.find({
      status: 'reported'
    }).populate('reporterId', 'firstName lastName avatar');

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/lost-found/:id
 * Obtenir les détails d'un objet
 */
router.get('/:id', async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const item = await LostAndFound.findById(req.params.id)
      .populate('reporterId', 'firstName lastName avatar phoneNumber');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/lost-found/:id/claim
 * Réclamer un objet trouvé
 */
router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const item = await LostAndFound.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    if (item.status !== 'reported') {
      return res.status(400).json({
        success: false,
        message: 'Cet objet n\'est plus disponible'
      });
    }

    item.claimedBy = {
      userId: req.user._id,
      claimedAt: new Date(),
      verificationCode: Math.random().toString(36).substr(2, 6).toUpperCase()
    };

    item.status = 'claimed';
    await item.save();

    res.json({
      success: true,
      message: 'Objet réclamé',
      data: {
        verificationCode: item.claimedBy.verificationCode
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
 * PUT /api/lost-found/:id/return
 * Confirmer le retour d'un objet
 */
router.put('/:id/return', authenticate, async (req, res) => {
  try {
    const LostAndFound = require('../models/LostAndFound');
    const { handoverMethod, location, scheduledDate } = req.body;

    const item = await LostAndFound.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Objet non trouvé'
      });
    }

    item.status = 'returned';
    item.handoverMethod = handoverMethod;
    item.handoverDetails = {
      location,
      scheduledDate: new Date(scheduledDate)
    };

    await item.save();

    res.json({
      success: true,
      message: 'Retour confirmé',
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
