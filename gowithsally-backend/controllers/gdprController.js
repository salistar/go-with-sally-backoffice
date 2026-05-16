// ============================================================
// 📄 gdprController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('gdprController.js ▶ Module loaded')
//   • console.log('gdprController.js ▶ exportUserData() called')
// ============================================================

console.log('gdprController.js ▶ Module loaded');

const gdprService = require('../services/gdprService');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * GET /api/gdpr/export/:userId
 * Exporter les données personnelles
 */
exports.exportUserData = async (req, res) => {
  console.log('gdprController.js ▶ exportUserData() called');

  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id;

    // Vérifier que l'utilisateur n'exporte que ses propres données
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'You can only export your own data',
      });
    }

    const result = await gdprService.exportUserData(userId);

    if (result.success) {
      // Retourner en tant que fichier JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      return res.json(result.data);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ exportUserData() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/gdpr/delete-account
 * Supprimer le compte (Right to be Forgotten)
 */
exports.deleteAccount = async (req, res) => {
  console.log('gdprController.js ▶ deleteAccount() called');

  try {
    const userId = req.user?.id || req.body.userId;
    const { reason } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_userId',
        message: 'userId is required',
      });
    }

    const result = await gdprService.deleteUserAccount(userId, reason);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ deleteAccount() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/gdpr/consent
 * Gérer les consentements
 */
exports.manageConsent = async (req, res) => {
  console.log('gdprController.js ▶ manageConsent() called');

  try {
    const userId = req.user?.id || req.body.userId;
    const { consents } = req.body;

    // Validation
    if (!userId || !consents) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'userId and consents are required',
      });
    }

    const result = await gdprService.manageConsent(userId, consents);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ manageConsent() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/gdpr/access-history/:userId
 * Récupérer l'historique d'accès aux données
 */
exports.getAccessHistory = async (req, res) => {
  console.log('gdprController.js ▶ getAccessHistory() called');

  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id;

    // Vérifier que l'utilisateur consulte ses propres données
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'You can only view your own access history',
      });
    }

    const result = await gdprService.getAccessHistory(userId);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ getAccessHistory() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * PUT /api/gdpr/rectify
 * Rectifier les données personnelles
 */
exports.rectifyUserData = async (req, res) => {
  console.log('gdprController.js ▶ rectifyUserData() called');

  try {
    const userId = req.user?.id || req.body.userId;
    const { firstName, lastName, dateOfBirth, gender, addresses, profilePicture } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_userId',
        message: 'userId is required',
      });
    }

    const result = await gdprService.rectifyUserData(userId, {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      addresses,
      profilePicture,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ rectifyUserData() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/gdpr/compliance/:userId
 * Récupérer le statut de conformité
 */
exports.getComplianceStatus = async (req, res) => {
  console.log('gdprController.js ▶ getComplianceStatus() called');

  try {
    const { userId } = req.params;
    const requestUserId = req.user?.id;

    // Vérifier que l'utilisateur consulte ses propres données
    if (requestUserId && requestUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'You can only view your own compliance status',
      });
    }

    const result = await gdprService.getComplianceStatus(userId);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('gdprController.js ▶ getComplianceStatus() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = exports;
