/**
 * ============================================================================
 * GO WITH SALLY - BADGE ROUTES
 * ============================================================================
 * Routes pour la gestion des badges
 * 
 * @module routes/badgeRoutes
 * @version 1.2.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');

// Import auth middleware avec fallback
let authenticate, isAdmin;
try {
  // Essayer d'abord le middleware principal
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
  isAdmin = mainAuth.verifyAdmin || mainAuth.admin;
} catch (e) {
  // Fallback sur auth.middleware.js
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
  isAdmin = altAuth.isAdmin;
}

// ============================================================================
// ROUTES PUBLIQUES
// ============================================================================

/**
 * GET /api/badges/all
 * Obtenir tous les badges disponibles (public)
 */
router.get('/all', badgeController.getAllBadges);

/**
 * GET /api/badges/config/:level
 * Obtenir la configuration d'un niveau de badge (public)
 */
router.get('/config/:level', badgeController.getBadgeConfig);

// ============================================================================
// ROUTES AUTHENTIFIÉES (utilisateur)
// ============================================================================

/**
 * GET /api/badges/me
 * Obtenir son badge actuel
 */
router.get('/me', authenticate, badgeController.getMyBadge);

/**
 * GET /api/badges/progress
 * Obtenir la progression vers le prochain badge
 */
router.get('/progress', authenticate, badgeController.getMyProgress);

/**
 * POST /api/badges/refresh
 * Recalculer et mettre à jour son badge
 */
router.post('/refresh', authenticate, badgeController.refreshMyBadge);

/**
 * GET /api/badges/service/:serviceType
 * Vérifier si on peut accéder à un service
 */
router.get('/service/:serviceType', authenticate, badgeController.checkServiceAccess);

// ============================================================================
// ROUTES ADMIN
// ============================================================================

/**
 * GET /api/badges/admin/stats
 * Obtenir les stats des badges (admin)
 */
router.get('/admin/stats', authenticate, isAdmin, badgeController.getBadgeStats);

/**
 * GET /api/badges/admin/user/:userId
 * Obtenir le badge d'un utilisateur (admin)
 */
router.get('/admin/user/:userId', authenticate, isAdmin, badgeController.getUserBadge);

/**
 * POST /api/badges/admin/user/:userId/update
 * Forcer la mise à jour du badge d'un utilisateur (admin)
 */
router.post('/admin/user/:userId/update', authenticate, isAdmin, badgeController.forceUpdateBadge);

/**
 * POST /api/badges/admin/user/:userId/set
 * Forcer un niveau de badge (admin override)
 */
router.post('/admin/user/:userId/set', authenticate, isAdmin, badgeController.setUserBadge);

/**
 * GET /api/badges/admin/level/:level
 * Obtenir tous les utilisateurs avec un niveau de badge (admin)
 */
router.get('/admin/level/:level', authenticate, isAdmin, badgeController.getUsersByBadgeLevel);

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;