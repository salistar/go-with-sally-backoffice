/**
 * ============================================================================
 * GO WITH SALLY - SUB-ADMIN MIDDLEWARE
 * ============================================================================
 * Middleware pour vérifier les rôles et permissions des sub-admins
 * Gère l'accès par région et les permissions de gestion
 * ============================================================================
 */

console.log('[subadmin.middleware.js] Fichier chargé');

const User = require('../models/User');

console.log('[subadmin.middleware.js] Dépendances importées');

// ============================================================================
// REGIONS
// ============================================================================

const REGIONS = [
  'casablanca-settat',
  'rabat-sale-kenitra',
  'marrakech-safi',
  'fes-meknes',
  'tanger-tetouan',
  'souss-massa',
  'oriental',
  'draa-tafilalet',
  'beni-mellal-khenifra',
  'laayoune-sakia',
  'dakhla-oued',
  'guelmim-oued'
];

// ============================================================================
// CHECK SUB-ADMIN
// ============================================================================

/**
 * Vérifie que l'utilisateur est un sub-admin
 */
exports.checkSubAdmin = async (req, res, next) => {
  console.log('[subadmin.middleware.js] ▶ checkSubAdmin() appelé');

  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'sub_admin') {
      console.log('[subadmin.middleware.js] ❌ Rôle insuffisant:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Accès sub-admin requis'
      });
    }

    if (!user.region) {
      console.log('[subadmin.middleware.js] ❌ Région non assignée');
      return res.status(403).json({
        success: false,
        message: 'Région non assignée'
      });
    }

    // Attacher l'utilisateur et sa région au request
    req.user = user;
    req.subAdminRegion = user.region;

    console.log('[subadmin.middleware.js] ✓ Sub-admin vérifié pour région:', user.region);

    next();

  } catch (error) {
    console.log('[subadmin.middleware.js] ❌ Erreur checkSubAdmin:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

// ============================================================================
// CHECK REGION ACCESS
// ============================================================================

/**
 * Vérifie que le sub-admin a accès à la région demandée
 * @param {string} regionParam - Nom du paramètre contenant la région (défaut: 'region')
 */
exports.checkRegionAccess = (regionParam = 'region') => {
  return async (req, res, next) => {
    console.log('[subadmin.middleware.js] ▶ checkRegionAccess() appelé');

    try {
      // Récupérer la région depuis les params ou la query
      const requestedRegion = req.params[regionParam] || req.query[regionParam];

      if (!requestedRegion) {
        return res.status(400).json({
          success: false,
          message: 'Région non spécifiée'
        });
      }

      // Vérifier que c'est une région valide
      if (!REGIONS.includes(requestedRegion)) {
        console.log('[subadmin.middleware.js] ❌ Région invalide:', requestedRegion);
        return res.status(400).json({
          success: false,
          message: 'Région invalide'
        });
      }

      // Vérifier que le sub-admin a accès à cette région
      if (req.subAdminRegion !== requestedRegion) {
        console.log('[subadmin.middleware.js] ❌ Accès refusé pour région:', requestedRegion);
        return res.status(403).json({
          success: false,
          message: 'Accès refusé pour cette région'
        });
      }

      console.log('[subadmin.middleware.js] ✓ Accès autorisé pour région:', requestedRegion);

      next();

    } catch (error) {
      console.log('[subadmin.middleware.js] ❌ Erreur checkRegionAccess:', error.message);

      res.status(500).json({
        success: false,
        message: 'Erreur de vérification'
      });
    }
  };
};

// ============================================================================
// ADD REGION FILTER
// ============================================================================

/**
 * Ajoute automatiquement un filtre par région aux requêtes du sub-admin
 * Modifie le req.body ou req.query pour inclure la région
 */
exports.addRegionFilter = (req, res, next) => {
  console.log('[subadmin.middleware.js] ▶ addRegionFilter() appelé');

  if (req.subAdminRegion) {
    // Ajouter la région au query MongoDB
    if (req.mongoQuery) {
      req.mongoQuery.region = req.subAdminRegion;
    }

    // Ajouter la région aux paramètres
    req.subAdminRegion = req.subAdminRegion;

    console.log('[subadmin.middleware.js] ✓ Filtre région ajouté:', req.subAdminRegion);
  }

  next();
};

// ============================================================================
// GET ALLOWED REGIONS
// ============================================================================

/**
 * Retourne les régions autorisées pour un sub-admin
 */
exports.getAllowedRegions = (req, res, next) => {
  console.log('[subadmin.middleware.js] ▶ getAllowedRegions() appelé');

  if (req.subAdminRegion) {
    req.allowedRegions = [req.subAdminRegion];
  } else {
    req.allowedRegions = [];
  }

  next();
};

// ============================================================================
// CHECK SUPER ADMIN (Pour créer/modifier sub-admins)
// ============================================================================

/**
 * Vérifie que l'utilisateur est un super-admin
 * Nécessaire pour créer ou modifier d'autres sub-admins
 */
exports.checkSuperAdmin = async (req, res, next) => {
  console.log('[subadmin.middleware.js] ▶ checkSuperAdmin() appelé');

  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'admin') {
      console.log('[subadmin.middleware.js] ❌ Rôle super-admin requis');
      return res.status(403).json({
        success: false,
        message: 'Super-admin requis'
      });
    }

    req.user = user;
    console.log('[subadmin.middleware.js] ✓ Super-admin vérifié');

    next();

  } catch (error) {
    console.log('[subadmin.middleware.js] ❌ Erreur checkSuperAdmin:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

// ============================================================================
// VALIDATE REGION
// ============================================================================

/**
 * Valide qu'une région est valide
 * @param {string} region - Région à valider
 * @returns {boolean}
 */
exports.isValidRegion = (region) => {
  console.log('[subadmin.middleware.js] isValidRegion:', region);
  return REGIONS.includes(region);
};

// ============================================================================
// GET VALID REGIONS
// ============================================================================

/**
 * Retourne la liste de toutes les régions valides
 */
exports.getValidRegions = () => {
  return REGIONS;
};

console.log('[subadmin.middleware.js] ✅ Middleware exporté');
console.log('[subadmin.middleware.js] Fonctions: checkSubAdmin, checkRegionAccess, addRegionFilter, checkSuperAdmin');
console.log('[subadmin.middleware.js] Régions:', REGIONS.join(', '));
