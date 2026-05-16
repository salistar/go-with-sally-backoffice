// ============================================================
// 📄 token.js — GoWithSally
// LOG SUMMARY:
//   • console.log('token.js ▶ Routes loaded')
// ============================================================

console.log('token.js ▶ Routes loaded');

const express = require('express');
const tokenController = require('../controllers/tokenController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

/**
 * POST /api/tokens/refresh
 * Rafraîchir les tokens
 */
router.post('/refresh', tokenController.refreshToken);

/**
 * POST /api/tokens/logout
 * Logout et révoquer le token actuel
 */
router.post('/logout', tokenController.logout);

// ============================================================
// ROUTES AUTHENTIFIÉES
// ============================================================

/**
 * POST /api/tokens/logout-all
 * Logout de tous les appareils
 */
router.post('/logout-all', auth, tokenController.logoutAll);

/**
 * GET /api/tokens/active
 * Récupérer les tokens actifs
 */
router.get('/active', auth, tokenController.getActiveTokens);

/**
 * POST /api/tokens/revoke/:tokenId
 * Révoquer un token spécifique
 */
router.post('/revoke/:tokenId', auth, tokenController.revokeSpecificToken);

/**
 * GET /api/tokens/config
 * Récupérer la configuration des tokens
 */
router.get('/config', tokenController.getTokenConfig);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
