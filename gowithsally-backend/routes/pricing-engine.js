// ============================================================
// 📄 pricing-engine.js — GoWithSally
// LOG SUMMARY:
//   • console.log('pricing-engine.js ▶ Routes loaded')
// ============================================================

console.log('pricing-engine.js ▶ Routes loaded');

const express = require('express');
const pricingEngineController = require('../controllers/pricingEngineController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

/**
 * POST /api/pricing-engine/calculate
 * Calculer le prix pour un trajet
 */
router.post('/calculate', auth, pricingEngineController.calculatePrice);

/**
 * POST /api/pricing-engine/compare-all
 * Comparer les prix pour tous les services
 */
router.post('/compare-all', auth, pricingEngineController.compareAllServices);

/**
 * GET /api/pricing-engine/services
 * Récupérer tous les services disponibles
 */
router.get('/services', pricingEngineController.getAllServices);

/**
 * GET /api/pricing-engine/service/:serviceType
 * Récupérer la configuration d'un service spécifique
 */
router.get('/service/:serviceType', pricingEngineController.getServiceConfig);

/**
 * GET /api/pricing-engine/config
 * Récupérer la configuration de tarification complète
 */
router.get('/config', pricingEngineController.getTarifConfig);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
