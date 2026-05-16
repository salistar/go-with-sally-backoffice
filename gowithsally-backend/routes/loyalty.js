/**
 * ============================================================================
 * GO WITH SALLY - LOYALTY/REWARDS ROUTES
 * ============================================================================
 * Routes pour le système de loyauté
 *
 * @module routes/loyalty
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
 * GET /api/loyalty/profile
 * Obtenir son profil de loyauté
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const Loyalty = require('../models/Loyalty');
    let loyalty = await Loyalty.findOne({ userId: req.user._id });

    if (!loyalty) {
      loyalty = new Loyalty({ userId: req.user._id });
      await loyalty.save();
    }

    res.json({
      success: true,
      data: {
        points: loyalty.points,
        tier: loyalty.tier,
        pointsEarned: loyalty.pointsEarned,
        pointsRedeemed: loyalty.pointsRedeemed,
        nextTierPoints: loyalty.tier === 'platinum' ? 'Max' : '10000'
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
 * GET /api/loyalty/history
 * Obtenir l'historique des points
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const Loyalty = require('../models/Loyalty');
    const loyalty = await Loyalty.findOne({ userId: req.user._id });

    if (!loyalty) {
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: loyalty.pointsHistory.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/loyalty/rewards
 * Obtenir les récompenses disponibles
 */
router.get('/rewards', async (req, res) => {
  try {
    const rewards = [
      {
        id: '1',
        name: '500 MAD Discount',
        pointsCost: 1000,
        description: 'Get 500 MAD discount on next ride',
        category: 'discount'
      },
      {
        id: '2',
        name: '5 Free Rides',
        pointsCost: 2000,
        description: 'Get 5 free rides',
        category: 'rides'
      },
      {
        id: '3',
        name: 'Priority Support',
        pointsCost: 500,
        description: '30 days of priority support',
        category: 'service'
      },
      {
        id: '4',
        name: 'Travel Insurance',
        pointsCost: 1500,
        description: 'Free ride insurance for 10 rides',
        category: 'insurance'
      }
    ];

    res.json({
      success: true,
      data: rewards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/loyalty/redeem
 * Utiliser des points pour une récompense
 */
router.post('/redeem', authenticate, async (req, res) => {
  try {
    const Loyalty = require('../models/Loyalty');
    const { rewardId, pointsToUse } = req.body;

    if (!rewardId || !pointsToUse || pointsToUse <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Récompense et points requis'
      });
    }

    let loyalty = await Loyalty.findOne({ userId: req.user._id });

    if (!loyalty) {
      loyalty = new Loyalty({ userId: req.user._id });
    }

    if (loyalty.points < pointsToUse) {
      return res.status(400).json({
        success: false,
        message: 'Points insuffisants'
      });
    }

    loyalty.points -= pointsToUse;
    loyalty.pointsRedeemed += pointsToUse;
    loyalty.rewardsRedeemed.push({
      rewardId,
      pointsUsed: pointsToUse,
      redeemedAt: new Date()
    });

    await loyalty.save();

    res.json({
      success: true,
      message: 'Récompense réclamée',
      data: {
        remainingPoints: loyalty.points
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
 * POST /api/loyalty/add-points (ADMIN)
 * Ajouter des points manuellement
 */
router.post('/add-points', authenticate, async (req, res) => {
  try {
    const Loyalty = require('../models/Loyalty');
    const { userId, amount, reason } = req.body;

    let loyalty = await Loyalty.findOne({ userId });

    if (!loyalty) {
      loyalty = new Loyalty({ userId });
    }

    loyalty.points += amount;
    loyalty.pointsEarned += amount;
    loyalty.pointsHistory.push({
      type: 'bonus',
      amount,
      description: reason || 'Manual bonus',
      timestamp: new Date()
    });

    await loyalty.save();

    res.json({
      success: true,
      message: 'Points ajoutés',
      data: loyalty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
