/**
 * ============================================================================
 * GO WITH SALLY - FAQ ROUTES
 * ============================================================================
 * Routes pour les FAQ
 *
 * @module routes/faq
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
 * GET /api/faq
 * Obtenir les FAQ
 */
router.get('/', async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const { category, search, page = 1, limit = 20 } = req.query;

    let query = { active: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const faqs = await FAQ.find(query)
      .sort({ category: 1, order: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FAQ.countDocuments(query);

    res.json({
      success: true,
      data: {
        faqs,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
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
 * GET /api/faq/categories
 * Obtenir les catégories
 */
router.get('/categories', async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const categories = await FAQ.distinct('category', { active: true });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/faq/:id
 * Obtenir une FAQ
 */
router.get('/:id', async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ non trouvée'
      });
    }

    res.json({
      success: true,
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/faq/:id/vote
 * Voter sur une FAQ
 */
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const { helpful } = req.body;

    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ non trouvée'
      });
    }

    faq.votes.push({
      userId: req.user._id,
      helpful,
      timestamp: new Date()
    });

    if (helpful) {
      faq.helpfulness += 1;
    } else {
      faq.helpfulness -= 1;
    }

    await faq.save();

    res.json({
      success: true,
      message: 'Vote enregistré',
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/faq (ADMIN)
 * Créer une FAQ
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const { question, answer, category } = req.body;

    if (!question || !answer || !category) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis'
      });
    }

    const faq = new FAQ({
      question,
      answer,
      category,
      createdBy: req.user._id,
      active: true
    });

    await faq.save();

    res.status(201).json({
      success: true,
      message: 'FAQ créée',
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/faq/:id (ADMIN)
 * Modifier une FAQ
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const FAQ = require('../models/FAQ');
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ non trouvée'
      });
    }

    Object.assign(faq, req.body);
    faq.lastModifiedBy = req.user._id;
    await faq.save();

    res.json({
      success: true,
      message: 'FAQ mise à jour',
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
