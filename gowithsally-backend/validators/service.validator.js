/**
 * ============================================================================
 * GO WITH SALLY - SERVICE VALIDATOR
 * ============================================================================
 * Validateurs pour les endpoints de services
 * 
 * @module validators/service.validator
 * @version 1.0.0
 * ============================================================================
 */

const { body, param, query, validationResult } = require('express-validator');

// ============================================================================
// HELPER - Vérifier les erreurs de validation
// ============================================================================

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      details: errors.array(),
    });
  }
  next();
};

// ============================================================================
// CONSTANTES
// ============================================================================

const VALID_SERVICE_TYPES = ['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'];
const VALID_LANGUAGES = ['fr', 'ar', 'en'];
const VALID_BADGE_LEVELS = ['none', 'basic', 'verified', 'premium', 'elite'];

// ============================================================================
// VALIDATEURS
// ============================================================================

/**
 * Validation pour obtenir un service par type
 */
const getServiceValidator = [
  param('type')
    .notEmpty().withMessage('Type de service requis')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  query('lang')
    .optional()
    .isIn(VALID_LANGUAGES).withMessage('Langue invalide (fr, ar, en)'),
  
  validate,
];

/**
 * Validation pour calculer le prix d'un service
 */
const calculatePriceValidator = [
  param('type')
    .notEmpty().withMessage('Type de service requis')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  body('distanceKm')
    .notEmpty().withMessage('Distance requise')
    .isFloat({ min: 0.1, max: 200 }).withMessage('Distance doit être entre 0.1 et 200 km'),
  
  body('durationMinutes')
    .notEmpty().withMessage('Durée requise')
    .isInt({ min: 1, max: 600 }).withMessage('Durée doit être entre 1 et 600 minutes'),
  
  body('surgeMultiplier')
    .optional()
    .isFloat({ min: 1, max: 3 }).withMessage('Multiplicateur surge doit être entre 1 et 3'),
  
  validate,
];

/**
 * Validation pour la liste des services
 */
const listServicesValidator = [
  query('lang')
    .optional()
    .isIn(VALID_LANGUAGES).withMessage('Langue invalide (fr, ar, en)'),
  
  validate,
];

/**
 * Validation pour mettre à jour les services d'une conductrice
 */
const updateDriverServicesValidator = [
  body('servicesOffered')
    .notEmpty().withMessage('Services requis')
    .isArray({ min: 1 }).withMessage('Au moins un service requis'),
  
  body('servicesOffered.*')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  validate,
];

/**
 * Validation pour créer/mettre à jour un service (admin)
 */
const updateServiceValidator = [
  param('type')
    .notEmpty().withMessage('Type de service requis')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  body('name')
    .optional()
    .isObject().withMessage('name doit être un objet'),
  
  body('name.fr')
    .optional()
    .isString().isLength({ min: 2, max: 50 }).withMessage('Nom FR invalide'),
  
  body('name.ar')
    .optional()
    .isString().isLength({ min: 2, max: 50 }).withMessage('Nom AR invalide'),
  
  body('name.en')
    .optional()
    .isString().isLength({ min: 2, max: 50 }).withMessage('Nom EN invalide'),
  
  body('description')
    .optional()
    .isObject().withMessage('description doit être un objet'),
  
  body('emoji')
    .optional()
    .isString().isLength({ min: 1, max: 4 }).withMessage('Emoji invalide'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Couleur doit être au format #XXXXXX'),
  
  body('requiredBadge')
    .optional()
    .isIn(VALID_BADGE_LEVELS).withMessage('Niveau de badge invalide'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Ordre d\'affichage invalide'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive doit être un booléen'),
  
  validate,
];

/**
 * Validation pour mettre à jour les prix d'un service (admin)
 */
const updateServicePricingValidator = [
  param('type')
    .notEmpty().withMessage('Type de service requis')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  body('basePrice')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Prix de base doit être entre 0 et 100 DH'),
  
  body('pricePerKm')
    .optional()
    .isFloat({ min: 0, max: 20 }).withMessage('Prix/km doit être entre 0 et 20 DH'),
  
  body('pricePerMinute')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('Prix/min doit être entre 0 et 5 DH'),
  
  body('minimumFare')
    .optional()
    .isFloat({ min: 5, max: 100 }).withMessage('Tarif minimum doit être entre 5 et 100 DH'),
  
  body('multiplier')
    .optional()
    .isFloat({ min: 0.5, max: 3 }).withMessage('Multiplicateur doit être entre 0.5 et 3'),
  
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 0.5 }).withMessage('Taux de commission doit être entre 0 et 50%'),
  
  validate,
];

/**
 * Validation pour toggle service (admin)
 */
const toggleServiceValidator = [
  param('type')
    .notEmpty().withMessage('Type de service requis')
    .isIn(VALID_SERVICE_TYPES).withMessage('Type de service invalide'),
  
  validate,
];

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  validate,
  getServiceValidator,
  calculatePriceValidator,
  listServicesValidator,
  updateDriverServicesValidator,
  updateServiceValidator,
  updateServicePricingValidator,
  toggleServiceValidator,
  VALID_SERVICE_TYPES,
  VALID_LANGUAGES,
  VALID_BADGE_LEVELS,
};