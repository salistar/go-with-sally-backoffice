// ============================================================
// 📄 ai-proxy.js — GoWithSally
// LOG SUMMARY:
//   • console.log('ai-proxy.js ▶ Routes loaded')
// ============================================================

console.log('ai-proxy.js ▶ Routes loaded');

const express = require('express');
const aiProxyController = require('../controllers/aiProxyController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES DE VÉRIFICATION FACIALE
// ============================================================

/**
 * POST /api/ai-proxy/face/verify
 * Vérifier un visage
 */
router.post('/face/verify', auth, aiProxyController.verifyFace);

/**
 * POST /api/ai-proxy/face/register
 * Enregistrer un visage
 */
router.post('/face/register', auth, aiProxyController.registerFace);

/**
 * POST /api/ai-proxy/face/liveness
 * Détecter la vivacité (liveness)
 */
router.post('/face/liveness', auth, aiProxyController.livenessDetection);

/**
 * POST /api/ai-proxy/face/compare
 * Comparer deux visages
 */
router.post('/face/compare', auth, aiProxyController.compareFaces);

/**
 * GET /api/ai-proxy/health
 * Vérifier la santé du service
 */
router.get('/health', aiProxyController.healthCheck);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
