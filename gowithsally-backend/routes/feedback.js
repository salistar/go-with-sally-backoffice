/**
 * ============================================================================
 * GO WITH SALLY - RIDE FEEDBACK ROUTES
 * ============================================================================
 * Routes pour les retours de trajet
 *
 * @module routes/feedback
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
 * POST /api/feedback
 * Soumettre un retour
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const RideFeedback = require('../models/RideFeedback');
    const { rideId, feedbackType, npsScore, comment, likeAspects, dislikeAspects } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'ID du trajet requis'
      });
    }

    const feedback = new RideFeedback({
      rideId,
      userId: req.user._id,
      feedbackType: feedbackType || 'nps',
      npsScore,
      detailedComment: comment,
      likeAspects,
      dislikeAspects,
      createdAt: new Date()
    });

    if (npsScore >= 9) {
      feedback.sentiment = 'positive';
    } else if (npsScore >= 7) {
      feedback.sentiment = 'neutral';
    } else {
      feedback.sentiment = 'negative';
      feedback.followUpNeeded = true;
    }

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Retour soumis avec succès',
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/feedback/:rideId
 * Obtenir le retour d'un trajet
 */
router.get('/:rideId', async (req, res) => {
  try {
    const RideFeedback = require('../models/RideFeedback');
    const feedback = await RideFeedback.findOne({
      rideId: req.params.rideId
    });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/feedback/user/sentiments
 * Obtenir les sentiments de tous ses retours
 */
router.get('/user/sentiments', authenticate, async (req, res) => {
  try {
    const RideFeedback = require('../models/RideFeedback');
    const feedbacks = await RideFeedback.find({
      userId: req.user._id
    });

    const sentiments = {
      positive: feedbacks.filter(f => f.sentiment === 'positive').length,
      neutral: feedbacks.filter(f => f.sentiment === 'neutral').length,
      negative: feedbacks.filter(f => f.sentiment === 'negative').length
    };

    const averageNPS = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((sum, f) => sum + (f.npsScore || 0), 0) / feedbacks.length)
      : 0;

    res.json({
      success: true,
      data: {
        sentiments,
        averageNPS,
        totalFeedbacks: feedbacks.length
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
 * GET /api/feedback/surveys
 * Obtenir les sondages en attente
 */
router.get('/surveys', authenticate, async (req, res) => {
  try {
    const RideFeedback = require('../models/RideFeedback');
    const feedbacks = await RideFeedback.find({
      userId: req.user._id,
      feedbackType: 'survey'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
