// ============================================================
// 📄 gdpr.js — GoWithSally
// LOG SUMMARY:
//   • console.log('gdpr.js ▶ Routes loaded')
// ============================================================

console.log('gdpr.js ▶ Routes loaded');

const express = require('express');
const gdprController = require('../controllers/gdprController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES GDPR (RGPD)
// ============================================================

/**
 * GET /api/gdpr/export/:userId
 * Exporter les données personnelles (Right to Data Portability)
 */
router.get('/export/:userId', auth, gdprController.exportUserData);

/**
 * POST /api/gdpr/delete-account
 * Supprimer le compte (Right to be Forgotten)
 */
router.post('/delete-account', auth, gdprController.deleteAccount);

/**
 * POST /api/gdpr/consent
 * Gérer les consentements
 */
router.post('/consent', auth, gdprController.manageConsent);

/**
 * GET /api/gdpr/access-history/:userId
 * Récupérer l'historique d'accès aux données
 */
router.get('/access-history/:userId', auth, gdprController.getAccessHistory);

/**
 * PUT /api/gdpr/rectify
 * Rectifier les données personnelles (Right to Rectification)
 */
router.put('/rectify', auth, gdprController.rectifyUserData);

/**
 * GET /api/gdpr/compliance/:userId
 * Récupérer le statut de conformité GDPR/CNDP
 */
router.get('/compliance/:userId', auth, gdprController.getComplianceStatus);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
