/**
 * ============================================================================
 * GO WITH SALLY - USER SETTINGS ROUTES
 * ============================================================================
 * Routes pour les paramètres utilisateurs
 *
 * @module routes/settings
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
 * GET /api/settings
 * Obtenir ses paramètres
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    let settings = await UserSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
      await settings.save();
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Mettre à jour ses paramètres
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    let settings = await UserSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
    }

    Object.assign(settings, req.body);
    await settings.save();

    res.json({
      success: true,
      message: 'Paramètres mis à jour',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/settings/notifications
 * Mettre à jour les notifications
 */
router.put('/notifications', authenticate, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    let settings = await UserSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
    }

    settings.notifications = { ...settings.notifications, ...req.body };
    await settings.save();

    res.json({
      success: true,
      message: 'Notifications mises à jour',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/settings/privacy
 * Mettre à jour la confidentialité
 */
router.put('/privacy', authenticate, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    let settings = await UserSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
    }

    settings.privacy = { ...settings.privacy, ...req.body };
    await settings.save();

    res.json({
      success: true,
      message: 'Paramètres de confidentialité mis à jour',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/settings/safety
 * Mettre à jour la sécurité
 */
router.put('/safety', authenticate, async (req, res) => {
  try {
    const UserSettings = require('../models/UserSettings');
    let settings = await UserSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
    }

    settings.safety = { ...settings.safety, ...req.body };
    await settings.save();

    res.json({
      success: true,
      message: 'Paramètres de sécurité mis à jour',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
