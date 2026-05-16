/**
 * ============================================================================
 * GO WITH SALLY - AFFILIATION ROUTES
 * ============================================================================
 * Routes pour le système d'affiliation
 *
 * @module routes/affiliations
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');
const affiliationController = require('../controllers/affiliationController');

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * POST /api/affiliations/apply
 * Apply to become an affiliate
 * @access Public (authenticated)
 */
router.post('/apply', verifyToken, affiliationController.applyForAffiliation);

/**
 * GET /api/affiliations/my
 * Get current user's affiliation stats
 * @access Private
 */
router.get('/my', verifyToken, affiliationController.getMyAffiliationStats);

/**
 * GET /api/affiliations/:id/stats
 * Get specific affiliate's public stats
 * @access Public
 */
router.get('/:id/stats', affiliationController.getAffiliateStats);

/**
 * POST /api/affiliations/track/:code
 * Track a referral click/signup
 * @access Public
 */
router.post('/track/:code', affiliationController.trackReferral);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /api/affiliations
 * Create new affiliate (admin only)
 * @access Admin
 */
router.post('/', verifyToken, isAdmin, affiliationController.createAffiliation);

/**
 * GET /api/affiliations
 * List all affiliates (admin only)
 * @access Admin
 */
router.get('/', verifyToken, isAdmin, affiliationController.listAffiliates);

/**
 * PUT /api/affiliations/:id/approve
 * Approve affiliate application (admin only)
 * @access Admin
 */
router.put('/:id/approve', verifyToken, isAdmin, affiliationController.approveAffiliation);

/**
 * PUT /api/affiliations/:id/reject
 * Reject affiliate application (admin only)
 * @access Admin
 */
router.put('/:id/reject', verifyToken, isAdmin, affiliationController.rejectAffiliation);

/**
 * PUT /api/affiliations/:id/suspend
 * Suspend affiliate account (admin only)
 * @access Admin
 */
router.put('/:id/suspend', verifyToken, isAdmin, affiliationController.suspendAffiliation);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 for undefined routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'route_not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('[affiliationRoutes] Error:', error);
  res.status(500).json({
    success: false,
    error: 'internal_error',
    message: error.message
  });
});

module.exports = router;
