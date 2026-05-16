/**
 * ============================================================================
 * GO WITH SALLY - RIDE INSURANCE ROUTES
 * ============================================================================
 * Routes pour l'assurance trajets
 *
 * @module routes/insurance
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
 * GET /api/insurance/plans
 * Obtenir les plans d'assurance
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        type: 'basic',
        name: 'Assurance Basique',
        price: 50,
        coverage: {
          accidentalDamage: 5000,
          personalBelongings: 2000,
          medicalEmergency: 10000
        }
      },
      {
        type: 'standard',
        name: 'Assurance Standard',
        price: 100,
        coverage: {
          accidentalDamage: 10000,
          personalBelongings: 5000,
          medicalEmergency: 25000
        }
      },
      {
        type: 'premium',
        name: 'Assurance Premium',
        price: 150,
        coverage: {
          accidentalDamage: 20000,
          personalBelongings: 10000,
          medicalEmergency: 50000,
          cancellation: 2000
        }
      }
    ];

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/insurance/activate
 * Activer l'assurance pour un trajet
 */
router.post('/activate', authenticate, async (req, res) => {
  try {
    const RideInsurance = require('../models/RideInsurance');
    const { rideId, insuranceType = 'basic' } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'ID du trajet requis'
      });
    }

    const pricing = {
      'basic': 50,
      'standard': 100,
      'premium': 150
    };

    const insurance = new RideInsurance({
      rideId,
      userId: req.user._id,
      insuranceType,
      premium: pricing[insuranceType] || 50,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await insurance.save();

    res.status(201).json({
      success: true,
      message: 'Assurance activée',
      data: insurance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/insurance/:rideId
 * Obtenir l'assurance d'un trajet
 */
router.get('/:rideId', authenticate, async (req, res) => {
  try {
    const RideInsurance = require('../models/RideInsurance');
    const insurance = await RideInsurance.findOne({
      rideId: req.params.rideId
    });

    res.json({
      success: true,
      data: insurance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/insurance/:id/claim
 * Déposer une réclamation
 */
router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const RideInsurance = require('../models/RideInsurance');
    const { claimType, description, amount } = req.body;

    const insurance = await RideInsurance.findById(req.params.id);

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Assurance non trouvée'
      });
    }

    insurance.claims.push({
      claimType,
      description,
      amount,
      status: 'pending',
      submittedAt: new Date()
    });

    insurance.status = 'claimed';
    await insurance.save();

    res.json({
      success: true,
      message: 'Réclamation soumise',
      data: insurance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
