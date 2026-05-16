/**
 * ============================================================================
 * GO WITH SALLY - SUB-ADMIN ROUTES
 * ============================================================================
 * Routes pour les sous-administrateurs (managers régionaux)
 * Gestion des conductrices et utilisateurs par région
 *
 * Base URL: /api/subadmin
 * ============================================================================
 */

console.log('[routes/subadmin.js] Fichier chargé');

const express = require('express');
const router = express.Router();

console.log('[routes/subadmin.js] Express Router initialisé');

// ============================================================================
// IMPORTS
// ============================================================================

const { verifyToken } = require('../middleware/auth');
const {
  checkSubAdmin,
  checkRegionAccess,
  addRegionFilter,
  getAllowedRegions
} = require('../middleware/subadmin.middleware');
const adminController = require('../controllers/adminController');

console.log('[routes/subadmin.js] Contrôleurs et middleware importés');

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================

// Vérifier le token et le rôle sub-admin
router.use(verifyToken);
router.use(checkSubAdmin);
router.use(addRegionFilter);
router.use(getAllowedRegions);

console.log('[routes/subadmin.js] Middleware global appliqué');

// ============================================================================
// DASHBOARD & STATISTICS
// ============================================================================

/**
 * GET /api/subadmin/dashboard
 * Tableau de bord avec statistiques régionales
 */
router.get('/dashboard', (req, res) => {
  console.log('[routes/subadmin.js] ▶ GET /dashboard');

  res.json({
    success: true,
    message: 'Dashboard sub-admin',
    data: {
      region: req.subAdminRegion,
      permissionsNote: 'Limité à la région: ' + req.subAdminRegion
    }
  });
});

// ============================================================================
// DRIVERS MANAGEMENT
// ============================================================================

/**
 * GET /api/subadmin/drivers/pending
 * Conductrices en attente dans la région
 */
router.get('/drivers/pending', adminController.getPendingDrivers);

/**
 * PUT /api/subadmin/drivers/:driverId/verify
 * Approuver/Rejeter une conductrice
 */
router.put('/drivers/:driverId/verify', adminController.verifyDriver);

/**
 * GET /api/subadmin/drivers/:driverId/documents
 * Voir les documents d'une conductrice
 */
router.get('/drivers/:driverId/documents', adminController.getDriverDocuments);

/**
 * PUT /api/subadmin/documents/:documentType/verify
 * Vérifier un document
 */
router.put('/documents/:documentType/verify', adminController.verifyDocument);

console.log('[routes/subadmin.js] Routes Drivers configurées');

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

/**
 * GET /api/subadmin/users
 * Lister les utilisateurs de la région
 */
router.get('/users', adminController.getUsers);

/**
 * DELETE /api/subadmin/users/:userId/ban
 * Bannir un utilisateur
 */
router.delete('/users/:userId/ban', adminController.banUser);

console.log('[routes/subadmin.js] Routes Users configurées');

// ============================================================================
// CLAIMS MANAGEMENT
// ============================================================================

/**
 * GET /api/subadmin/claims
 * Lister les réclamations de la région
 */
router.get('/claims', adminController.getClaims);

/**
 * PUT /api/subadmin/claims/:claimId/resolve
 * Résoudre une réclamation
 */
router.put('/claims/:claimId/resolve', adminController.resolveClaim);

console.log('[routes/subadmin.js] Routes Claims configurées');

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/subadmin/analytics
 * Analyses de la région
 */
router.get('/analytics', adminController.getAnalytics);

console.log('[routes/subadmin.js] Routes Analytics configurées');

// ============================================================================
// HELP / DOCUMENTATION
// ============================================================================

router.get(
  '/help',
  (req, res) => {
    console.log('[routes/subadmin.js] ▶ GET /help');

    res.json({
      success: true,
      message: 'Routes disponibles pour les sub-admins',
      region: req.subAdminRegion,
      endpoints: {
        dashboard: {
          method: 'GET',
          path: '/dashboard',
          description: 'Tableau de bord'
        },
        drivers: {
          pending: { method: 'GET', path: '/drivers/pending', description: 'Conductrices en attente' },
          verify: { method: 'PUT', path: '/drivers/:driverId/verify', description: 'Approuver/Rejeter' },
          documents: { method: 'GET', path: '/drivers/:driverId/documents', description: 'Voir documents' },
          verifyDocument: { method: 'PUT', path: '/documents/:documentType/verify', description: 'Vérifier doc' }
        },
        users: {
          list: { method: 'GET', path: '/users', description: 'Lister utilisateurs' },
          ban: { method: 'DELETE', path: '/users/:userId/ban', description: 'Bannir utilisateur' }
        },
        claims: {
          list: { method: 'GET', path: '/claims', description: 'Réclamations' },
          resolve: { method: 'PUT', path: '/claims/:claimId/resolve', description: 'Résoudre' }
        },
        analytics: {
          list: { method: 'GET', path: '/analytics', description: 'Analyses' }
        }
      },
      restrictions: {
        region: `Accès limité à: ${req.subAdminRegion}`,
        actions: 'Vérification de conductrices, gestion des utilisateurs, résolution de réclamations',
        limitations: 'Ne peut pas créer d\'autres sub-admins ou modifier les configurations globales'
      }
    });
  }
);

console.log('[routes/subadmin.js] Route Help configurée');

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((err, req, res, next) => {
  console.log('[routes/subadmin.js] ❌ Erreur:', err.message);

  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

console.log('[routes/subadmin.js] ✅ Router exporté');
console.log('[routes/subadmin.js] Routes: dashboard, drivers, users, claims, analytics');

module.exports = router;
