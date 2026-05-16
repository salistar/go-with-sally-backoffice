/**
 * ============================================================================
 * GO WITH SALLY - PRICING CONTROLLER
 * ============================================================================
 * Contrôleur pour les endpoints de pricing
 *
 * @module controllers/pricingController
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - calculateEstimate() function entry
// - Other exported functions

console.log('📄 pricingController.js ▶ Module loaded');

const pricingService = require('../services/pricingService');
const PriceProposal = require('../models/PriceProposal');

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * POST /api/pricing/estimate
 * Calculer une estimation de prix
 */
exports.calculateEstimate = async (req, res) => {
  console.log('📄 pricingController.js ▶ calculateEstimate() called');
  try {
    const { distanceKm, durationMinutes, serviceType, surgeOptions } = req.body;
    
    // Validation
    if (!distanceKm || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'distance_duration_required',
        message: 'Distance et durée requises',
      });
    }
    
    const estimate = pricingService.calculateEstimate({
      distanceKm,
      durationMinutes,
      serviceType: serviceType || 'sally_standard',
      surgeOptions: surgeOptions || {},
    });
    
    // Générer les quick prices
    const quickPrices = pricingService.generateQuickPrices(
      estimate.minPrice,
      estimate.maxPrice,
      estimate.suggestedPrice
    );
    
    res.json({
      success: true,
      data: {
        ...estimate,
        quickPrices,
      },
    });
  } catch (error) {
    console.error('[PricingController] Erreur estimate:', error);
    res.status(500).json({
      success: false,
      error: 'estimate_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/likelihood
 * Calculer la probabilité d'acceptation
 */
exports.calculateLikelihood = async (req, res) => {
  try {
    const { proposedPrice, suggestedPrice } = req.body;
    
    if (!proposedPrice || !suggestedPrice) {
      return res.status(400).json({
        success: false,
        error: 'prices_required',
        message: 'Prix proposé et suggéré requis',
      });
    }
    
    const likelihood = pricingService.calculateAcceptanceLikelihood(proposedPrice, suggestedPrice);
    
    res.json({
      success: true,
      data: likelihood,
    });
  } catch (error) {
    console.error('[PricingController] Erreur likelihood:', error);
    res.status(500).json({
      success: false,
      error: 'likelihood_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/commission
 * Calculer la commission
 */
exports.calculateCommission = async (req, res) => {
  try {
    const { price, serviceType } = req.body;
    
    if (!price) {
      return res.status(400).json({
        success: false,
        error: 'price_required',
        message: 'Prix requis',
      });
    }
    
    const commission = pricingService.calculateCommission(price, serviceType || 'sally_standard');
    
    res.json({
      success: true,
      data: commission,
    });
  } catch (error) {
    console.error('[PricingController] Erreur commission:', error);
    res.status(500).json({
      success: false,
      error: 'commission_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/validate
 * Valider un prix proposé
 */
exports.validatePrice = async (req, res) => {
  try {
    const { proposedPrice, estimate } = req.body;
    
    if (!proposedPrice || !estimate) {
      return res.status(400).json({
        success: false,
        error: 'data_required',
        message: 'Prix proposé et estimation requis',
      });
    }
    
    const validation = pricingService.validateProposedPrice(proposedPrice, estimate);
    
    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('[PricingController] Erreur validate:', error);
    res.status(500).json({
      success: false,
      error: 'validation_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/proposal
 * Créer une proposition de prix
 */
exports.createProposal = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      pickup,
      destination,
      estimatedDistance,
      estimatedDuration,
      serviceType,
      suggestedPrice,
      minPrice,
      maxPrice,
      proposedPrice,
      preferredPaymentMethod,
    } = req.body;
    
    // Validation
    if (!pickup || !destination || !proposedPrice) {
      return res.status(400).json({
        success: false,
        error: 'data_required',
        message: 'Pickup, destination et prix proposé requis',
      });
    }
    
    // Valider le prix
    const validation = pricingService.validateProposedPrice(proposedPrice, {
      minPrice,
      maxPrice,
      suggestedPrice,
    });
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        message: validation.message,
      });
    }
    
    // Calculer la likelihood
    const likelihood = pricingService.calculateAcceptanceLikelihood(proposedPrice, suggestedPrice);
    
    // Vérifier le surge actuel
    const surgeInfo = pricingService.getCurrentSurge();
    
    // Créer la proposition
    const proposal = await PriceProposal.createProposal({
      userId,
      pickup,
      destination,
      estimatedDistance,
      estimatedDuration,
      serviceType: serviceType || 'sally_standard',
      suggestedPrice,
      minPrice,
      maxPrice,
      proposedPrice,
      acceptanceLikelihood: {
        level: likelihood.level,
        percentage: likelihood.percentage,
        estimatedMinutes: likelihood.estimatedMinutes,
      },
      surgeInfo: surgeInfo.isActive ? {
        isActive: true,
        multiplier: surgeInfo.multiplier,
        reason: surgeInfo.reason,
      } : null,
      preferredPaymentMethod: preferredPaymentMethod || 'any',
    });
    
    res.status(201).json({
      success: true,
      data: {
        proposal,
        likelihood,
        surgeInfo: surgeInfo.isActive ? surgeInfo : null,
      },
    });
  } catch (error) {
    console.error('[PricingController] Erreur createProposal:', error);
    res.status(500).json({
      success: false,
      error: 'proposal_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing/proposals
 * Obtenir les propositions de l'utilisateur
 */
exports.getUserProposals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit } = req.query;
    
    const proposals = await PriceProposal.getUserProposals(
      userId,
      status || null,
      parseInt(limit) || 20
    );
    
    res.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    console.error('[PricingController] Erreur getUserProposals:', error);
    res.status(500).json({
      success: false,
      error: 'get_proposals_failed',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/pricing/proposal/:id
 * Annuler une proposition
 */
exports.cancelProposal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const proposal = await PriceProposal.findOne({ _id: id, userId });
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'proposal_not_found',
        message: 'Proposition non trouvée',
      });
    }
    
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'cannot_cancel',
        message: 'Cette proposition ne peut plus être annulée',
      });
    }
    
    await proposal.cancel();
    
    res.json({
      success: true,
      message: 'Proposition annulée',
    });
  } catch (error) {
    console.error('[PricingController] Erreur cancelProposal:', error);
    res.status(500).json({
      success: false,
      error: 'cancel_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing/surge
 * Obtenir l'info surge actuelle
 */
exports.getCurrentSurge = async (req, res) => {
  try {
    const { badWeather, specialEvent, demandRatio } = req.query;
    
    const surgeInfo = pricingService.getCurrentSurge({
      badWeather: badWeather === 'true',
      specialEvent: specialEvent === 'true',
      demandRatio: parseFloat(demandRatio) || 1,
    });
    
    res.json({
      success: true,
      data: surgeInfo,
    });
  } catch (error) {
    console.error('[PricingController] Erreur getCurrentSurge:', error);
    res.status(500).json({
      success: false,
      error: 'surge_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing/services
 * Obtenir les configurations de tous les services
 */
exports.getAllServices = async (req, res) => {
  try {
    const services = pricingService.getAllServices();
    
    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('[PricingController] Erreur getAllServices:', error);
    res.status(500).json({
      success: false,
      error: 'services_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing/config
 * Obtenir la configuration de pricing
 */
exports.getPricingConfig = async (req, res) => {
  try {
    const config = pricingService.getPricingConfig();
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[PricingController] Erreur getPricingConfig:', error);
    res.status(500).json({
      success: false,
      error: 'config_failed',
      message: error.message,
    });
  }
};

// ============================================================================
// ENDPOINTS CONDUCTRICE
// ============================================================================

/**
 * GET /api/pricing/driver/proposals
 * Obtenir les propositions disponibles pour une conductrice
 */
exports.getAvailableProposals = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { lat, lng, radius, serviceType } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'location_required',
        message: 'Position requise',
      });
    }
    
    const proposals = await PriceProposal.getActiveInArea(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius) || 5,
      serviceType || null
    );
    
    res.json({
      success: true,
      data: proposals,
      count: proposals.length,
    });
  } catch (error) {
    console.error('[PricingController] Erreur getAvailableProposals:', error);
    res.status(500).json({
      success: false,
      error: 'proposals_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/driver/accept/:id
 * Accepter une proposition
 */
exports.acceptProposal = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;
    
    const proposal = await PriceProposal.findOne({ _id: id, status: 'pending' });
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'proposal_not_found',
        message: 'Proposition non trouvée ou déjà traitée',
      });
    }
    
    // Vérifier expiration
    if (proposal.isExpired) {
      await proposal.checkExpiration();
      return res.status(400).json({
        success: false,
        error: 'proposal_expired',
        message: 'Cette proposition a expiré',
      });
    }
    
    await proposal.accept(driverId);
    
    res.json({
      success: true,
      data: proposal,
      message: 'Proposition acceptée',
    });
  } catch (error) {
    console.error('[PricingController] Erreur acceptProposal:', error);
    res.status(500).json({
      success: false,
      error: 'accept_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing/driver/reject/:id
 * Refuser une proposition
 */
exports.rejectProposal = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    const proposal = await PriceProposal.findOne({ _id: id, status: 'pending' });
    
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'proposal_not_found',
        message: 'Proposition non trouvée',
      });
    }
    
    await proposal.rejectBy(driverId, reason);
    
    res.json({
      success: true,
      message: 'Proposition refusée',
    });
  } catch (error) {
    console.error('[PricingController] Erreur rejectProposal:', error);
    res.status(500).json({
      success: false,
      error: 'reject_failed',
      message: error.message,
    });
  }
};