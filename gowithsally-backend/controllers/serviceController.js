/**
 * ============================================================================
 * GO WITH SALLY - SERVICE CONTROLLER
 * ============================================================================
 * Contrôleur pour les endpoints de services
 *
 * @module controllers/serviceController
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - getAllServices() function entry
// - getService() function entry
// - All other exported functions

console.log('📄 serviceController.js ▶ Module loaded');

const Service = require('../models/Service');
const badgeService = require('../services/badgeService');

// ============================================================================
// ENDPOINTS PUBLICS
// ============================================================================

/**
 * GET /api/services
 * Obtenir tous les services actifs
 */
exports.getAllServices = async (req, res) => {
  console.log('📄 serviceController.js ▶ getAllServices() called');
  try {
    const { lang = 'fr' } = req.query;
    
    const services = await Service.getActiveServices(lang);
    
    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error('[ServiceController] Erreur getAllServices:', error);
    res.status(500).json({
      success: false,
      error: 'services_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/services/:type
 * Obtenir un service par type
 */
exports.getService = async (req, res) => {
  console.log('📄 serviceController.js ▶ getService() called');
  try {
    const { type } = req.params;
    const { lang = 'fr' } = req.query;
    
    const service = await Service.getByType(type);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'service_not_found',
        message: `Service "${type}" non trouvé`,
      });
    }
    
    res.json({
      success: true,
      data: {
        type: service.type,
        name: service.getName(lang),
        shortDescription: service.shortDescription?.[lang] || service.shortDescription?.fr,
        description: service.getDescription(lang),
        emoji: service.emoji,
        icon: service.icon,
        color: service.color,
        pricing: service.pricing,
        capacity: service.capacity,
        features: service.features.map(f => f[lang] || f.fr),
        requiredBadge: service.requiredBadge,
        stats: service.stats,
      },
    });
  } catch (error) {
    console.error('[ServiceController] Erreur getService:', error);
    res.status(500).json({
      success: false,
      error: 'get_service_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/services/:type/price
 * Calculer le prix pour un service
 */
exports.calculatePrice = async (req, res) => {
  try {
    const { type } = req.params;
    const { distanceKm, durationMinutes, surgeMultiplier = 1.0 } = req.body;
    
    if (!distanceKm || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'params_required',
        message: 'Distance et durée requises',
      });
    }
    
    const service = await Service.getByType(type);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'service_not_found',
        message: `Service "${type}" non trouvé`,
      });
    }
    
    const priceResult = service.calculatePrice(
      parseFloat(distanceKm),
      parseInt(durationMinutes),
      parseFloat(surgeMultiplier)
    );
    
    res.json({
      success: true,
      data: {
        serviceType: type,
        ...priceResult,
        currency: 'MAD',
      },
    });
  } catch (error) {
    console.error('[ServiceController] Erreur calculatePrice:', error);
    res.status(500).json({
      success: false,
      error: 'calculate_price_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/services/available
 * Obtenir les services disponibles pour l'utilisateur connecté
 */
exports.getAvailableServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lang = 'fr' } = req.query;
    
    const services = await Service.getActiveServices(lang);
    
    // Vérifier l'accès pour chaque service
    const servicesWithAccess = await Promise.all(
      services.map(async (service) => {
        const access = await badgeService.canAccessService(userId, service.type);
        return {
          ...service,
          canAccess: access.canAccess,
          accessReason: access.reason,
          requiredBadge: access.requiredBadge,
        };
      })
    );
    
    res.json({
      success: true,
      data: servicesWithAccess,
    });
  } catch (error) {
    console.error('[ServiceController] Erreur getAvailableServices:', error);
    res.status(500).json({
      success: false,
      error: 'available_services_failed',
      message: error.message,
    });
  }
};

// ============================================================================
// ENDPOINTS CONDUCTRICE
// ============================================================================

/**
 * GET /api/driver/services
 * Obtenir les services offerts par la conductrice
 */
exports.getDriverServices = async (req, res) => {
  try {
    const driverId = req.user.id;
    const User = require('../models/User');
    
    const driver = await User.findById(driverId).select('servicesOffered badge');
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'driver_not_found',
      });
    }
    
    const services = await Service.find({
      type: { $in: driver.servicesOffered || [] },
      isActive: true,
    });
    
    res.json({
      success: true,
      data: {
        servicesOffered: driver.servicesOffered || [],
        badge: driver.badge,
        services: services.map(s => ({
          type: s.type,
          name: s.name.fr,
          emoji: s.emoji,
          pricing: s.pricing,
        })),
      },
    });
  } catch (error) {
    console.error('[ServiceController] Erreur getDriverServices:', error);
    res.status(500).json({
      success: false,
      error: 'driver_services_failed',
      message: error.message,
    });
  }
};

/**
 * PUT /api/driver/services
 * Mettre à jour les services offerts par la conductrice
 */
exports.updateDriverServices = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { servicesOffered } = req.body;
    
    if (!Array.isArray(servicesOffered)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_services',
        message: 'servicesOffered doit être un tableau',
      });
    }
    
    // Vérifier que les services existent
    const validTypes = ['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'];
    const invalidServices = servicesOffered.filter(s => !validTypes.includes(s));
    
    if (invalidServices.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_service_types',
        message: `Services invalides: ${invalidServices.join(', ')}`,
      });
    }
    
    // Vérifier les accès par badge
    const accessChecks = await Promise.all(
      servicesOffered.map(async (serviceType) => {
        const access = await badgeService.canAccessService(driverId, serviceType);
        return { serviceType, ...access };
      })
    );
    
    const deniedServices = accessChecks.filter(a => !a.canAccess);
    
    if (deniedServices.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'badge_required',
        message: 'Certains services nécessitent un badge supérieur',
        details: deniedServices.map(d => ({
          service: d.serviceType,
          requiredBadge: d.requiredBadge,
        })),
      });
    }
    
    const User = require('../models/User');
    const driver = await User.findByIdAndUpdate(
      driverId,
      { servicesOffered },
      { new: true }
    ).select('servicesOffered badge');
    
    res.json({
      success: true,
      data: {
        servicesOffered: driver.servicesOffered,
      },
      message: 'Services mis à jour',
    });
  } catch (error) {
    console.error('[ServiceController] Erreur updateDriverServices:', error);
    res.status(500).json({
      success: false,
      error: 'update_services_failed',
      message: error.message,
    });
  }
};

// ============================================================================
// ENDPOINTS ADMIN
// ============================================================================

/**
 * POST /api/admin/services/initialize
 * Initialiser les services par défaut (admin)
 */
exports.initializeServices = async (req, res) => {
  try {
    await Service.initializeDefaults();
    
    const services = await Service.find({});
    
    res.json({
      success: true,
      data: services,
      message: 'Services initialisés',
    });
  } catch (error) {
    console.error('[ServiceController] Erreur initializeServices:', error);
    res.status(500).json({
      success: false,
      error: 'initialize_failed',
      message: error.message,
    });
  }
};

/**
 * PUT /api/admin/services/:type
 * Mettre à jour un service (admin)
 */
exports.updateService = async (req, res) => {
  try {
    const { type } = req.params;
    const updates = req.body;
    
    const service = await Service.findOneAndUpdate(
      { type },
      updates,
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'service_not_found',
      });
    }
    
    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('[ServiceController] Erreur updateService:', error);
    res.status(500).json({
      success: false,
      error: 'update_failed',
      message: error.message,
    });
  }
};

/**
 * PUT /api/admin/services/:type/toggle
 * Activer/désactiver un service (admin)
 */
exports.toggleService = async (req, res) => {
  try {
    const { type } = req.params;
    
    const service = await Service.findOne({ type });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'service_not_found',
      });
    }
    
    service.isActive = !service.isActive;
    await service.save();
    
    res.json({
      success: true,
      data: {
        type: service.type,
        isActive: service.isActive,
      },
      message: `Service ${service.isActive ? 'activé' : 'désactivé'}`,
    });
  } catch (error) {
    console.error('[ServiceController] Erreur toggleService:', error);
    res.status(500).json({
      success: false,
      error: 'toggle_failed',
      message: error.message,
    });
  }
};

/**
 * PUT /api/admin/services/:type/pricing
 * Mettre à jour les prix d'un service (admin)
 */
exports.updateServicePricing = async (req, res) => {
  try {
    const { type } = req.params;
    const { basePrice, pricePerKm, pricePerMinute, minimumFare, multiplier, commissionRate } = req.body;
    
    const service = await Service.findOne({ type });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'service_not_found',
      });
    }
    
    // Mise à jour des prix
    if (basePrice !== undefined) service.pricing.basePrice = basePrice;
    if (pricePerKm !== undefined) service.pricing.pricePerKm = pricePerKm;
    if (pricePerMinute !== undefined) service.pricing.pricePerMinute = pricePerMinute;
    if (minimumFare !== undefined) service.pricing.minimumFare = minimumFare;
    if (multiplier !== undefined) service.pricing.multiplier = multiplier;
    if (commissionRate !== undefined) service.pricing.commissionRate = commissionRate;
    
    await service.save();
    
    res.json({
      success: true,
      data: {
        type: service.type,
        pricing: service.pricing,
      },
      message: 'Prix mis à jour',
    });
  } catch (error) {
    console.error('[ServiceController] Erreur updateServicePricing:', error);
    res.status(500).json({
      success: false,
      error: 'pricing_update_failed',
      message: error.message,
    });
  }
};