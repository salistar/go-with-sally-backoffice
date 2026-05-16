/**
 * ============================================================================
 * GO WITH SALLY - REFERRAL PROGRAM ROUTES
 * ============================================================================
 * Routes pour le programme de parrainage
 *
 * @module routes/referrals
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
 * GET /api/referrals/code
 * Obtenir son code de parrainage
 */
router.get('/code', authenticate, async (req, res) => {
  try {
    const Referral = require('../models/Referral');
    let referral = await Referral.findOne({ referrerId: req.user._id });

    if (!referral) {
      const code = `SALLY${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      referral = new Referral({
        referrerId: req.user._id,
        referralCode: code,
        rewardType: 'discount',
        rewardValue: 500
      });
      await referral.save();
    }

    res.json({
      success: true,
      data: {
        code: referral.referralCode,
        reward: referral.rewardValue,
        rewardType: referral.rewardType,
        successCount: referral.successCount,
        totalRewardEarned: referral.totalRewardEarned
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
 * POST /api/referrals/use
 * Utiliser un code de parrainage
 */
router.post('/use', authenticate, async (req, res) => {
  try {
    const Referral = require('../models/Referral');
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const referral = await Referral.findOne({
      referralCode: code.toUpperCase(),
      isActive: true
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide'
      });
    }

    referral.referredUsers.push({
      userId: req.user._id,
      joinedAt: new Date()
    });

    referral.successCount += 1;

    await referral.save();

    res.json({
      success: true,
      message: 'Code appliqué avec succès',
      data: {
        reward: referral.rewardValue,
        rewardType: referral.rewardType
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
 * GET /api/referrals/stats
 * Obtenir les stats de parrainage
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const Referral = require('../models/Referral');
    const referral = await Referral.findOne({ referrerId: req.user._id });

    if (!referral) {
      return res.json({
        success: true,
        data: {
          code: null,
          successCount: 0,
          totalRewardEarned: 0,
          referredUsers: []
        }
      });
    }

    res.json({
      success: true,
      data: {
        code: referral.referralCode,
        successCount: referral.successCount,
        totalRewardEarned: referral.totalRewardEarned,
        referredUsers: referral.referredUsers
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
 * POST /api/referrals/claim
 * Réclamer la récompense de parrainage
 */
router.post('/claim', authenticate, async (req, res) => {
  try {
    const Referral = require('../models/Referral');
    const referral = await Referral.findOne({ referrerId: req.user._id });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Code de parrainage non trouvé'
      });
    }

    const unclaimedRewards = referral.referredUsers.filter(r => !r.rewardClaimed);

    if (unclaimedRewards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune récompense à réclamer'
      });
    }

    const totalReward = unclaimedRewards.reduce((sum) => sum + referral.rewardValue, 0);

    unclaimedRewards.forEach(r => {
      r.rewardClaimed = true;
      r.claimedAt = new Date();
      r.rewardAmount = referral.rewardValue;
    });

    referral.totalRewardEarned += totalReward;
    await referral.save();

    res.json({
      success: true,
      message: 'Récompenses réclamées',
      data: {
        claimedAmount: totalReward,
        claimedCount: unclaimedRewards.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
