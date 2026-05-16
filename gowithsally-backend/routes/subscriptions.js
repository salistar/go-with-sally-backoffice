/**
 * ============================================================================
 * GO WITH SALLY - SUBSCRIPTIONS ROUTES
 * ============================================================================
 * Routes pour les plans d'abonnement
 *
 * @module routes/subscriptions
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
 * GET /api/subscriptions/plans
 * Obtenir tous les plans disponibles
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        type: 'free',
        name: 'Plan Gratuit',
        price: 0,
        monthlyRides: 0,
        monthlyDiscount: 0,
        benefits: ['Accès basique', 'Support par email']
      },
      {
        type: 'basic',
        name: 'Plan Basique',
        price: 99,
        monthlyRides: 10,
        monthlyDiscount: 5,
        benefits: ['10 trajets/mois', '5% de réduction', 'Support prioritaire']
      },
      {
        type: 'standard',
        name: 'Plan Standard',
        price: 199,
        monthlyRides: 30,
        monthlyDiscount: 10,
        benefits: ['30 trajets/mois', '10% de réduction', 'Support 24/7']
      },
      {
        type: 'premium',
        name: 'Plan Premium',
        price: 399,
        monthlyRides: 0,
        monthlyDiscount: 15,
        benefits: ['Trajets illimités', '15% de réduction', 'Conductrice prioritaire', 'Assurance incluse']
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
 * GET /api/subscriptions/current
 * Obtenir l'abonnement actuel
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    let subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      subscription = {
        planType: 'free',
        status: 'active',
        ridesUsedThisMonth: 0
      };
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Mettre à niveau l'abonnement
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const { planType, billingCycle = 'monthly' } = req.body;

    if (!planType) {
      return res.status(400).json({
        success: false,
        message: 'Type de plan requis'
      });
    }

    // Désactiver l'ancien abonnement
    await Subscription.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'cancelled' }
    );

    const plans = {
      'basic': { price: 99, monthlyRides: 10, monthlyDiscount: 5 },
      'standard': { price: 199, monthlyRides: 30, monthlyDiscount: 10 },
      'premium': { price: 399, monthlyRides: 0, monthlyDiscount: 15 }
    };

    const planInfo = plans[planType] || {};

    const subscription = new Subscription({
      userId: req.user._id,
      planType,
      billingCycle,
      price: planInfo.price,
      monthlyRides: planInfo.monthlyRides,
      monthlyDiscount: planInfo.monthlyDiscount,
      status: 'active',
      startDate: new Date(),
      autoRenew: true
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Abonnement mis à jour',
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Annuler l'abonnement
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Aucun abonnement actif'
      });
    }

    subscription.status = 'cancelled';
    await subscription.save();

    res.json({
      success: true,
      message: 'Abonnement annulé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
