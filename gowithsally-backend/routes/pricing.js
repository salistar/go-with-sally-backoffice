/**
 * ============================================================================
 * GO WITH SALLY - PRICING ROUTES
 * ============================================================================
 * Routes pour le pricing et les propositions de prix
 * 
 * @module routes/pricingRoutes
 * @version 1.2.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');

// Import auth middleware avec fallback
let authenticate, isDriver;
try {
  // Essayer d'abord le middleware principal
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
  isDriver = mainAuth.verifyDriver;
} catch (e) {
  // Fallback sur auth.middleware.js
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
  isDriver = altAuth.isDriver;
}

// ============================================================================
// ROUTES PUBLIQUES (estimation sans auth)
// ============================================================================

/**
 * POST /api/pricing/estimate
 * Calculer une estimation de prix (public)
 */
router.post('/estimate', pricingController.calculateEstimate);

/**
 * GET /api/pricing/surge
 * Obtenir l'info surge actuelle (public)
 */
router.get('/surge', pricingController.getCurrentSurge);

/**
 * GET /api/pricing/services
 * Obtenir les configurations de tous les services (public)
 */
router.get('/services', pricingController.getAllServices);

/**
 * GET /api/pricing/config
 * Obtenir la configuration de pricing (public)
 */
router.get('/config', pricingController.getPricingConfig);

// ============================================================================
// ROUTES AUTHENTIFIÉES (passagère)
// ============================================================================

/**
 * POST /api/pricing/likelihood
 * Calculer la probabilité d'acceptation
 */
router.post('/likelihood', authenticate, pricingController.calculateLikelihood);

/**
 * POST /api/pricing/commission
 * Calculer la commission
 */
router.post('/commission', authenticate, pricingController.calculateCommission);

/**
 * POST /api/pricing/validate
 * Valider un prix proposé
 */
router.post('/validate', authenticate, pricingController.validatePrice);

/**
 * POST /api/pricing/proposal
 * Créer une proposition de prix
 */
router.post('/proposal', authenticate, pricingController.createProposal);

/**
 * GET /api/pricing/proposals
 * Obtenir ses propositions
 */
router.get('/proposals', authenticate, pricingController.getUserProposals);

/**
 * DELETE /api/pricing/proposal/:id
 * Annuler une proposition
 */
router.delete('/proposal/:id', authenticate, pricingController.cancelProposal);

// ============================================================================
// ROUTES CONDUCTRICE
// ============================================================================

/**
 * GET /api/pricing/driver/proposals
 * Obtenir les propositions disponibles pour une conductrice
 */
router.get('/driver/proposals', authenticate, isDriver, pricingController.getAvailableProposals);

/**
 * POST /api/pricing/driver/accept/:id
 * Accepter une proposition
 */
router.post('/driver/accept/:id', authenticate, isDriver, pricingController.acceptProposal);

/**
 * POST /api/pricing/driver/reject/:id
 * Refuser une proposition
 */
router.post('/driver/reject/:id', authenticate, isDriver, pricingController.rejectProposal);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;