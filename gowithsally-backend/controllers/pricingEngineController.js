// ============================================================
// 📄 pricingEngineController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('pricingEngineController.js ▶ Module loaded')
//   • console.log('pricingEngineController.js ▶ calculatePrice() called')
// ============================================================

console.log('pricingEngineController.js ▶ Module loaded');

const pricingEngineService = require('../services/pricingEngineService');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/pricing-engine/calculate
 * Calculer le prix pour un trajet
 */
exports.calculatePrice = async (req, res) => {
  console.log('pricingEngineController.js ▶ calculatePrice() called');

  try {
    const {
      distanceKm,
      durationMinutes,
      serviceType = 'sally_standard',
      latitude,
      longitude,
      hasRain = false,
      includeNightSurcharge = false,
      includeRushHourSurcharge = false,
    } = req.body;

    // Validation
    if (!distanceKm || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'distanceKm and durationMinutes are required',
      });
    }

    const result = await pricingEngineService.calculatePrice({
      distanceKm,
      durationMinutes,
      serviceType,
      latitude,
      longitude,
      hasRain,
      includeNightSurcharge,
      includeRushHourSurcharge,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('pricingEngineController.js ▶ calculatePrice() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/pricing-engine/compare-all
 * Comparer les prix pour tous les services
 */
exports.compareAllServices = async (req, res) => {
  console.log('pricingEngineController.js ▶ compareAllServices() called');

  try {
    const {
      distanceKm,
      durationMinutes,
      latitude,
      longitude,
      hasRain = false,
      includeNightSurcharge = false,
      includeRushHourSurcharge = false,
    } = req.body;

    // Validation
    if (!distanceKm || !durationMinutes) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'distanceKm and durationMinutes are required',
      });
    }

    const result = await pricingEngineService.calculateAllServicePrices({
      distanceKm,
      durationMinutes,
      latitude,
      longitude,
      hasRain,
      includeNightSurcharge,
      includeRushHourSurcharge,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('pricingEngineController.js ▶ compareAllServices() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing-engine/services
 * Récupérer tous les services disponibles
 */
exports.getAllServices = async (req, res) => {
  console.log('pricingEngineController.js ▶ getAllServices() called');

  try {
    const services = pricingEngineService.getAllServices();

    res.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error('pricingEngineController.js ▶ getAllServices() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing-engine/service/:serviceType
 * Récupérer la configuration d'un service spécifique
 */
exports.getServiceConfig = async (req, res) => {
  console.log('pricingEngineController.js ▶ getServiceConfig() called');

  try {
    const { serviceType } = req.params;

    const config = pricingEngineService.getServiceConfig(serviceType);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: `Service type not found: ${serviceType}`,
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('pricingEngineController.js ▶ getServiceConfig() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/pricing-engine/config
 * Récupérer la configuration de tarification complète
 */
exports.getTarifConfig = async (req, res) => {
  console.log('pricingEngineController.js ▶ getTarifConfig() called');

  try {
    const config = pricingEngineService.getTarifConfig();

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('pricingEngineController.js ▶ getTarifConfig() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = exports;
