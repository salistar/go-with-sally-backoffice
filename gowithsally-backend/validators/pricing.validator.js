/**
 * ============================================================================
 * GO WITH SALLY - PRICING VALIDATOR
 * ============================================================================
 * Validateurs pour les endpoints de pricing
 * 
 * @module validators/pricing.validator
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
// VALIDATEURS
// ============================================================================

/**
 * Validation pour l'estimation de prix
 */
const estimateValidator = [
  body('distanceKm')
    .notEmpty().withMessage('Distance requise')
    .isFloat({ min: 0.1, max: 200 }).withMessage('Distance doit être entre 0.1 et 200 km'),
  
  body('durationMinutes')
    .notEmpty().withMessage('Durée requise')
    .isInt({ min: 1, max: 600 }).withMessage('Durée doit être entre 1 et 600 minutes'),
  
  body('serviceType')
    .optional()
    .isIn(['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'])
    .withMessage('Type de service invalide'),
  
  body('surgeOptions')
    .optional()
    .isObject().withMessage('surgeOptions doit être un objet'),
  
  validate,
];

/**
 * Validation pour la probabilité d'acceptation
 */
const likelihoodValidator = [
  body('proposedPrice')
    .notEmpty().withMessage('Prix proposé requis')
    .isFloat({ min: 5 }).withMessage('Prix proposé doit être au moins 5 DH'),
  
  body('suggestedPrice')
    .notEmpty().withMessage('Prix suggéré requis')
    .isFloat({ min: 5 }).withMessage('Prix suggéré doit être au moins 5 DH'),
  
  validate,
];

/**
 * Validation pour le calcul de commission
 */
const commissionValidator = [
  body('price')
    .notEmpty().withMessage('Prix requis')
    .isFloat({ min: 5 }).withMessage('Prix doit être au moins 5 DH'),
  
  body('serviceType')
    .optional()
    .isIn(['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'])
    .withMessage('Type de service invalide'),
  
  validate,
];

/**
 * Validation pour la validation de prix
 */
const validatePriceValidator = [
  body('proposedPrice')
    .notEmpty().withMessage('Prix proposé requis')
    .isFloat({ min: 5 }).withMessage('Prix proposé doit être au moins 5 DH'),
  
  body('estimate')
    .notEmpty().withMessage('Estimation requise')
    .isObject().withMessage('Estimation doit être un objet'),
  
  body('estimate.minPrice')
    .notEmpty().withMessage('Prix minimum requis')
    .isFloat({ min: 5 }).withMessage('Prix minimum invalide'),
  
  body('estimate.maxPrice')
    .notEmpty().withMessage('Prix maximum requis')
    .isFloat({ min: 5 }).withMessage('Prix maximum invalide'),
  
  body('estimate.suggestedPrice')
    .notEmpty().withMessage('Prix suggéré requis')
    .isFloat({ min: 5 }).withMessage('Prix suggéré invalide'),
  
  validate,
];

/**
 * Validation pour créer une proposition
 */
const createProposalValidator = [
  // Pickup
  body('pickup')
    .notEmpty().withMessage('Point de départ requis')
    .isObject().withMessage('Point de départ invalide'),
  
  body('pickup.latitude')
    .notEmpty().withMessage('Latitude de départ requise')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  
  body('pickup.longitude')
    .notEmpty().withMessage('Longitude de départ requise')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  
  // Destination
  body('destination')
    .notEmpty().withMessage('Destination requise')
    .isObject().withMessage('Destination invalide'),
  
  body('destination.latitude')
    .notEmpty().withMessage('Latitude de destination requise')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  
  body('destination.longitude')
    .notEmpty().withMessage('Longitude de destination requise')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  
  // Distance et durée
  body('estimatedDistance')
    .notEmpty().withMessage('Distance estimée requise')
    .isFloat({ min: 0.1 }).withMessage('Distance estimée invalide'),
  
  body('estimatedDuration')
    .notEmpty().withMessage('Durée estimée requise')
    .isInt({ min: 1 }).withMessage('Durée estimée invalide'),
  
  // Prix
  body('suggestedPrice')
    .notEmpty().withMessage('Prix suggéré requis')
    .isFloat({ min: 5 }).withMessage('Prix suggéré invalide'),
  
  body('minPrice')
    .notEmpty().withMessage('Prix minimum requis')
    .isFloat({ min: 5 }).withMessage('Prix minimum invalide'),
  
  body('maxPrice')
    .notEmpty().withMessage('Prix maximum requis')
    .isFloat({ min: 5 }).withMessage('Prix maximum invalide'),
  
  body('proposedPrice')
    .notEmpty().withMessage('Prix proposé requis')
    .isFloat({ min: 5 }).withMessage('Prix proposé invalide'),
  
  // Service
  body('serviceType')
    .optional()
    .isIn(['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'])
    .withMessage('Type de service invalide'),
  
  // Paiement
  body('preferredPaymentMethod')
    .optional()
    .isIn(['cash', 'card', 'wallet', 'any'])
    .withMessage('Méthode de paiement invalide'),
  
  validate,
];

/**
 * Validation pour les propositions utilisateur
 */
const getUserProposalsValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'searching', 'accepted', 'rejected', 'expired', 'cancelled'])
    .withMessage('Statut invalide'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite doit être entre 1 et 100'),
  
  validate,
];

/**
 * Validation pour annuler une proposition
 */
const cancelProposalValidator = [
  param('id')
    .notEmpty().withMessage('ID requis')
    .isMongoId().withMessage('ID invalide'),
  
  validate,
];

/**
 * Validation pour les propositions disponibles (conductrice)
 */
const availableProposalsValidator = [
  query('lat')
    .notEmpty().withMessage('Latitude requise')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  
  query('lng')
    .notEmpty().withMessage('Longitude requise')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  
  query('radius')
    .optional()
    .isFloat({ min: 0.5, max: 50 }).withMessage('Rayon doit être entre 0.5 et 50 km'),
  
  query('serviceType')
    .optional()
    .isIn(['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'])
    .withMessage('Type de service invalide'),
  
  validate,
];

/**
 * Validation pour accepter/refuser une proposition
 */
const proposalIdValidator = [
  param('id')
    .notEmpty().withMessage('ID requis')
    .isMongoId().withMessage('ID invalide'),
  
  validate,
];

/**
 * Validation pour refuser avec raison
 */
const rejectProposalValidator = [
  param('id')
    .notEmpty().withMessage('ID requis')
    .isMongoId().withMessage('ID invalide'),
  
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Raison trop longue (max 500 caractères)'),
  
  validate,
];

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  validate,
  estimateValidator,
  likelihoodValidator,
  commissionValidator,
  validatePriceValidator,
  createProposalValidator,
  getUserProposalsValidator,
  cancelProposalValidator,
  availableProposalsValidator,
  proposalIdValidator,
  rejectProposalValidator,
};