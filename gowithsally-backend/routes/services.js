/**
 * ============================================================================
 * GO WITH SALLY - SERVICE ROUTES
 * ============================================================================
 * Routes pour la gestion des services
 * 
 * @module routes/serviceRoutes
 * @version 1.2.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Import auth middleware avec fallback
let authenticate, isDriver, isAdmin;
try {
  // Essayer d'abord le middleware principal
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
  isDriver = mainAuth.verifyDriver;
  isAdmin = mainAuth.verifyAdmin || mainAuth.admin;
} catch (e) {
  // Fallback sur auth.middleware.js
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
  isDriver = altAuth.isDriver;
  isAdmin = altAuth.isAdmin;
}

// ============================================================================
// ROUTES PUBLIQUES
// ============================================================================

/**
 * GET /api/services
 * Obtenir tous les services actifs (public)
 */
router.get('/', serviceController.getAllServices);

/**
 * GET /api/services/:type
 * Obtenir un service par type (public)
 */
router.get('/:type', serviceController.getService);

/**
 * POST /api/services/:type/price
 * Calculer le prix pour un service (public)
 */
router.post('/:type/price', serviceController.calculatePrice);

// ============================================================================
// ROUTES AUTHENTIFIÉES (passagère)
// ============================================================================

/**
 * GET /api/services/user/available
 * Obtenir les services disponibles pour l'utilisateur connecté
 */
router.get('/user/available', authenticate, serviceController.getAvailableServices);

// ============================================================================
// ROUTES CONDUCTRICE
// ============================================================================

/**
 * GET /api/services/driver/my-services
 * Obtenir les services offerts par la conductrice
 */
router.get('/driver/my-services', authenticate, isDriver, serviceController.getDriverServices);

/**
 * PUT /api/services/driver/my-services
 * Mettre à jour les services offerts par la conductrice
 */
router.put('/driver/my-services', authenticate, isDriver, serviceController.updateDriverServices);

// ============================================================================
// ROUTES ADMIN
// ============================================================================

/**
 * POST /api/services/admin/initialize
 * Initialiser les services par défaut (admin)
 */
router.post('/admin/initialize', authenticate, isAdmin, serviceController.initializeServices);

/**
 * PUT /api/services/admin/:type
 * Mettre à jour un service (admin)
 */
router.put('/admin/:type', authenticate, isAdmin, serviceController.updateService);

/**
 * PUT /api/services/admin/:type/toggle
 * Activer/désactiver un service (admin)
 */
router.put('/admin/:type/toggle', authenticate, isAdmin, serviceController.toggleService);

/**
 * PUT /api/services/admin/:type/pricing
 * Mettre à jour les prix d'un service (admin)
 */
router.put('/admin/:type/pricing', authenticate, isAdmin, serviceController.updateServicePricing);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;