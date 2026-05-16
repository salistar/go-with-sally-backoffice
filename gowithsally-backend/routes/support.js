/**
 * ============================================================================
 * GO WITH SALLY - SUPPORT TICKETS ROUTES
 * ============================================================================
 * Routes pour les tickets de support
 *
 * @module routes/support
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
 * POST /api/support
 * Créer un ticket de support
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const SupportTicket = require('../models/SupportTicket');
    const { category, priority, subject, description, relatedRideId } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie, sujet et description requis'
      });
    }

    const ticket = new SupportTicket({
      userId: req.user._id,
      category,
      priority: priority || 'medium',
      subject,
      description,
      relatedRideId,
      status: 'open'
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Ticket créé',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/support
 * Obtenir ses tickets
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const SupportTicket = require('../models/SupportTicket');
    const tickets = await SupportTicket.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/support/:id
 * Obtenir un ticket
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const SupportTicket = require('../models/SupportTicket');
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/support/:id/message
 * Ajouter un message au ticket
 */
router.post('/:id/message', authenticate, async (req, res) => {
  try {
    const SupportTicket = require('../models/SupportTicket');
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message requis'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    ticket.messages.push({
      senderId: req.user._id,
      senderType: 'user',
      message,
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Message ajouté',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/support/:id (ADMIN)
 * Mettre à jour un ticket
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const SupportTicket = require('../models/SupportTicket');
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    Object.assign(ticket, req.body);
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket mis à jour',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
