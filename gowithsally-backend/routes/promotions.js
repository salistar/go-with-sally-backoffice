/**
 * ============================================================================
 * GO WITH SALLY - PROMOTIONS ROUTES
 * ============================================================================
 * Routes pour les promotions et coupons
 *
 * @module routes/promotions
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
 * GET /api/promotions/available
 * Obtenir les promotions disponibles
 */
router.get('/available', async (req, res) => {
  try {
    const Promotion = require('../models/Promotion');
    const now = new Date();

    const promotions = await Promotion.find({
      active: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/promotions/validate
 * Valider un code promotion
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const Promotion = require('../models/Promotion');
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const promotion = await Promotion.findOne({
      code: code.toUpperCase(),
      active: true
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide'
      });
    }

    const now = new Date();
    if (promotion.validFrom > now || promotion.validUntil < now) {
      return res.status(400).json({
        success: false,
        message: 'Code expiré'
      });
    }

    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Limite d\'utilisation atteinte'
      });
    }

    res.json({
      success: true,
      message: 'Code valide',
      data: promotion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/promotions/apply
 * Appliquer un code promotion à un trajet
 */
router.post('/apply', authenticate, async (req, res) => {
  try {
    const Promotion = require('../models/Promotion');
    const { code, rideAmount } = req.body;

    if (!code || !rideAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code et montant requis'
      });
    }

    const promotion = await Promotion.findOne({
      code: code.toUpperCase(),
      active: true
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide'
      });
    }

    if (rideAmount < promotion.minRideAmount) {
      return res.status(400).json({
        success: false,
        message: `Montant minimum: ${promotion.minRideAmount}`
      });
    }

    let discount = 0;
    if (promotion.discountType === 'percentage') {
      discount = (rideAmount * promotion.discountValue) / 100;
      if (promotion.maxDiscount) {
        discount = Math.min(discount, promotion.maxDiscount);
      }
    } else {
      discount = promotion.discountValue;
    }

    promotion.usageCount += 1;
    promotion.usedBy.push({
      userId: req.user._id,
      usedAt: new Date()
    });
    await promotion.save();

    res.json({
      success: true,
      message: 'Code appliqué',
      data: {
        discount: Math.round(discount * 100) / 100,
        finalAmount: Math.round((rideAmount - discount) * 100) / 100
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
 * POST /api/promotions (ADMIN)
 * Créer une promotion
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const Promotion = require('../models/Promotion');
    const { code, discountType, discountValue, validFrom, validUntil } = req.body;

    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis'
      });
    }

    const promotion = new Promotion({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      createdBy: req.user._id,
      ...req.body
    });

    await promotion.save();

    res.status(201).json({
      success: true,
      message: 'Promotion créée',
      data: promotion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/promotions (ADMIN)
 * Obtenir toutes les promotions
 */
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const Promotion = require('../models/Promotion');
    const promotions = await Promotion.find({}).populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
