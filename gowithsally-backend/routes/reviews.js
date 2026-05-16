/**
 * ============================================================================
 * GO WITH SALLY - REVIEWS ROUTES
 * ============================================================================
 * Routes pour les avis détaillés
 *
 * @module routes/reviews
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
 * POST /api/reviews
 * Créer un avis
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const Review = require('../models/Review');
    const { rideId, revieweeId, revieweeType, overallRating, categories, comment, tags } = req.body;

    if (!rideId || !revieweeId || !overallRating) {
      return res.status(400).json({
        success: false,
        message: 'Trajet, évaluateur et note requises'
      });
    }

    const review = new Review({
      rideId,
      reviewerId: req.user._id,
      revieweeId,
      revieweeType,
      overallRating,
      categories,
      comment,
      tags
    });

    await review.save();

    res.status(201).json({
      success: true,
      message: 'Avis créé',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/:userId
 * Obtenir les avis d'un utilisateur
 */
router.get('/:userId', async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find({
      revieweeId: req.params.userId,
      visible: true
    }).populate('reviewerId', 'firstName lastName avatar');

    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        reviews,
        averageRating,
        totalReviews: reviews.length
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
 * GET /api/reviews/ride/:rideId
 * Obtenir l'avis d'un trajet
 */
router.get('/ride/:rideId', async (req, res) => {
  try {
    const Review = require('../models/Review');
    const review = await Review.findOne({
      rideId: req.params.rideId
    });

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/reviews/:id
 * Modifier un avis
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const Review = require('../models/Review');
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }

    if (review.reviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    Object.assign(review, req.body);
    await review.save();

    res.json({
      success: true,
      message: 'Avis mis à jour',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/reviews/:id
 * Supprimer un avis
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const Review = require('../models/Review');
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Avis non trouvé'
      });
    }

    if (review.reviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await Review.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Avis supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
