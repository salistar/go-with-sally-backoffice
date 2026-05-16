// ============================================================
// 📄 pricingEngineService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('pricingEngineService.js ▶ Module loaded')
//   • console.log('pricingEngineService.js ▶ calculatePrice() called')
// ============================================================

console.log('pricingEngineService.js ▶ Module loaded');

const surgePricingService = require('./surgePricingService');

// ============================================================
// CONFIGURATION DE TARIFICATION DÉTAILLÉE
// ============================================================

const TARIF_CONFIG = {
  // Base price par service (MAD)
  BASE_PRICE: {
    sally_eco: 7,
    sally_standard: 10,
    sally_confort: 15,
    sally_pool: 5,
  },

  // Tarif au km (MAD/km)
  TARIF_KM: {
    sally_eco: 3.0,
    sally_standard: 4.0,
    sally_confort: 5.5,
    sally_pool: 2.5,
  },

  // Tarif à la minute (MAD/min)
  TARIF_MIN: {
    sally_eco: 0.3,
    sally_standard: 0.5,
    sally_confort: 0.8,
    sally_pool: 0.2,
  },

  // Multiplicateurs de service
  SERVICE_MULTIPLIERS: {
    sally_eco: 0.8,
    sally_standard: 1.0,
    sally_confort: 1.3,
    sally_pool: 0.6,
  },

  // Prix minimum (MAD)
  MIN_PRICE: {
    sally_eco: 15,
    sally_standard: 20,
    sally_confort: 35,
    sally_pool: 10,
  },

  // Facteurs supplémentaires
  NIGHT_SURCHARGE: 0.30,      // +30%
  RAIN_SURCHARGE: 0.15,        // +15%
  RUSH_HOUR_SURCHARGE: 0.25,  // +25%
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Arrondit le prix à 5 MAD près
 */
function roundPrice(price) {
  console.log('pricingEngineService.js ▶ roundPrice() called');
  return Math.round(price / 5) * 5;
}

/**
 * Valide le type de service
 */
function isValidServiceType(serviceType) {
  return Object.keys(TARIF_CONFIG.BASE_PRICE).includes(serviceType);
}

// ============================================================
// MAIN SERVICE
// ============================================================

const pricingEngineService = {
  /**
   * Calcule le prix complet avec formule:
   * Prix = (Base + Distance*TarifKm + Duration*TarifMin) * ServiceMultiplier * SurgeMultiplier
   *
   * Puis ajoute les surcharges additionnelles (nuit, pluie, etc.)
   */
  async calculatePrice(params = {}) {
    console.log('pricingEngineService.js ▶ calculatePrice() called');

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
      } = params;

      // Validation
      if (!distanceKm || !durationMinutes) {
        throw new Error('distanceKm and durationMinutes are required');
      }

      if (!isValidServiceType(serviceType)) {
        throw new Error(`Invalid service type: ${serviceType}`);
      }

      // 1. Calcul de base
      const basePrice = TARIF_CONFIG.BASE_PRICE[serviceType];
      const distanceFare = distanceKm * TARIF_CONFIG.TARIF_KM[serviceType];
      const timeFare = durationMinutes * TARIF_CONFIG.TARIF_MIN[serviceType];

      // 2. Sous-total avant multiplicateurs
      const subtotal = basePrice + distanceFare + timeFare;

      // 3. Appliquer le multiplicateur de service
      const serviceMultiplier = TARIF_CONFIG.SERVICE_MULTIPLIERS[serviceType];
      let priceAfterService = subtotal * serviceMultiplier;

      // 4. Obtenir le multiplicateur de surge
      const surgeResult = await surgePricingService.calculateSurgeMultiplier({
        latitude,
        longitude,
        hasRain,
      });

      const surgeMultiplier = surgeResult.multiplier;
      let priceAfterSurge = priceAfterService * surgeMultiplier;

      // 5. Appliquer les surcharges additionnelles
      let additionalSurcharge = 0;

      if (includeNightSurcharge) {
        additionalSurcharge += priceAfterSurge * TARIF_CONFIG.NIGHT_SURCHARGE;
      }

      if (includeRushHourSurcharge) {
        additionalSurcharge += priceAfterSurge * TARIF_CONFIG.RUSH_HOUR_SURCHARGE;
      }

      if (hasRain && !surgeResult.factors.some(f => f.type === 'rain')) {
        additionalSurcharge += priceAfterSurge * TARIF_CONFIG.RAIN_SURCHARGE;
      }

      const finalPrice = priceAfterSurge + additionalSurcharge;

      // 6. Appliquer le prix minimum
      const minPrice = TARIF_CONFIG.MIN_PRICE[serviceType];
      const suggestedPrice = Math.max(finalPrice, minPrice);

      // 7. Arrondir
      const roundedPrice = roundPrice(suggestedPrice);

      // 8. Calculer les prix min et max
      const pricingRange = {
        minPrice: roundPrice(roundedPrice * 0.75),
        suggestedPrice: roundedPrice,
        maxPrice: roundPrice(roundedPrice * 1.35),
      };

      console.log('pricingEngineService.js ▶ Price calculated:', roundedPrice);

      return {
        success: true,
        pricing: {
          ...pricingRange,
          currency: 'MAD',
        },
        breakdown: {
          basePrice,
          distanceFare,
          timeFare,
          subtotal,
          serviceMultiplier,
          priceAfterService,
          surgeMultiplier,
          additionalSurcharge,
          finalPrice,
          suggestedPrice: roundedPrice,
        },
        surgeInfo: {
          isActive: surgeResult.isActive,
          multiplier: surgeMultiplier,
          factors: surgeResult.factors,
        },
        serviceType,
        distance: distanceKm,
        duration: durationMinutes,
      };
    } catch (error) {
      console.error('pricingEngineService.js ▶ calculatePrice() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Calcule les prix pour tous les services
   */
  async calculateAllServicePrices(params = {}) {
    console.log('pricingEngineService.js ▶ calculateAllServicePrices() called');

    try {
      const serviceTypes = Object.keys(TARIF_CONFIG.BASE_PRICE);
      const results = {};

      for (const serviceType of serviceTypes) {
        const result = await this.calculatePrice({
          ...params,
          serviceType,
        });

        results[serviceType] = result;
      }

      return {
        success: true,
        allPrices: results,
        comparison: this.compareServices(results),
      };
    } catch (error) {
      console.error('pricingEngineService.js ▶ calculateAllServicePrices() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Compare les prix entre services
   */
  compareServices(priceResults) {
    console.log('pricingEngineService.js ▶ compareServices() called');

    const comparison = {};

    Object.entries(priceResults).forEach(([serviceType, result]) => {
      if (result.success) {
        comparison[serviceType] = {
          suggestedPrice: result.pricing.suggestedPrice,
          minPrice: result.pricing.minPrice,
          maxPrice: result.pricing.maxPrice,
        };
      }
    });

    // Trouver l'option la moins chère
    const cheapest = Object.entries(comparison).reduce((prev, [type, pricing]) => {
      if (!prev || pricing.suggestedPrice < prev.pricing.suggestedPrice) {
        return { type, pricing };
      }
      return prev;
    });

    // Trouver l'option la plus chère
    const expensive = Object.entries(comparison).reduce((prev, [type, pricing]) => {
      if (!prev || pricing.suggestedPrice > prev.pricing.suggestedPrice) {
        return { type, pricing };
      }
      return prev;
    });

    return {
      cheapest: cheapest?.type,
      cheapestPrice: cheapest?.pricing?.suggestedPrice,
      expensive: expensive?.type,
      expensivePrice: expensive?.pricing?.suggestedPrice,
      allOptions: comparison,
    };
  },

  /**
   * Récupère la configuration de tarification
   */
  getTarifConfig() {
    console.log('pricingEngineService.js ▶ getTarifConfig() called');
    return TARIF_CONFIG;
  },

  /**
   * Récupère la configuration détaillée pour un service
   */
  getServiceConfig(serviceType) {
    console.log('pricingEngineService.js ▶ getServiceConfig() called');

    if (!isValidServiceType(serviceType)) {
      return null;
    }

    return {
      serviceType,
      basePrice: TARIF_CONFIG.BASE_PRICE[serviceType],
      tarifKm: TARIF_CONFIG.TARIF_KM[serviceType],
      tarifMin: TARIF_CONFIG.TARIF_MIN[serviceType],
      multiplier: TARIF_CONFIG.SERVICE_MULTIPLIERS[serviceType],
      minPrice: TARIF_CONFIG.MIN_PRICE[serviceType],
    };
  },

  /**
   * Récupère tous les services disponibles
   */
  getAllServices() {
    console.log('pricingEngineService.js ▶ getAllServices() called');

    return Object.keys(TARIF_CONFIG.BASE_PRICE).map(serviceType => ({
      serviceType,
      config: this.getServiceConfig(serviceType),
    }));
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = pricingEngineService;
