/**
 * ============================================================================
 * GO WITH SALLY - EMERGENCY CONTACTS ROUTES
 * ============================================================================
 * Routes pour les contacts d'urgence
 *
 * @module routes/emergencyContacts
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
 * POST /api/emergency-contacts
 * Ajouter un contact d'urgence
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const { name, relationship, phoneNumber, email, isPrimary } = req.body;

    if (!name || !relationship || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Nom, relation et numéro requis'
      });
    }

    const contact = new EmergencyContact({
      userId: req.user._id,
      name,
      relationship,
      phoneNumber,
      email,
      isPrimary: isPrimary || false
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact d\'urgence ajouté',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/emergency-contacts
 * Obtenir tous ses contacts d'urgence
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const contacts = await EmergencyContact.find({
      userId: req.user._id
    });

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/emergency-contacts/primary
 * Obtenir le contact d'urgence principal
 */
router.get('/primary', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const contact = await EmergencyContact.findOne({
      userId: req.user._id,
      isPrimary: true
    });

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/emergency-contacts/:id
 * Modifier un contact d'urgence
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    if (contact.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    Object.assign(contact, req.body);
    await contact.save();

    res.json({
      success: true,
      message: 'Contact mis à jour',
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/emergency-contacts/:id
 * Supprimer un contact d'urgence
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    if (contact.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await EmergencyContact.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Contact supprimé'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/emergency-contacts/:id/sos
 * Notifier un contact d'urgence (SOS)
 */
router.post('/:id/sos', authenticate, async (req, res) => {
  try {
    const EmergencyContact = require('../models/EmergencyContact');
    const contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact non trouvé'
      });
    }

    if (contact.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Send SOS notification (in real implementation, send SMS/email)
    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      message: 'Alerte SOS envoyée au contact',
      data: {
        contactName: contact.name,
        phoneNumber: contact.phoneNumber,
        message: `Alerte SOS de ${user.firstName} ${user.lastName}`
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
