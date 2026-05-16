/**
 * ============================================================================
 * GO WITH SALLY - PRICING SERVICE (Backend)
 * ============================================================================
 * Service de calcul des prix et estimations côté serveur
 *
 * @module services/pricingService
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 pricingService.js ▶ Module loaded');

// ============================================================================
// CONFIGURATION DES PRIX PAR SERVICE
// ============================================================================

const SERVICE_PRICING = {
  sally_confort: {
    basePrice: 15,
    pricePerKm: 5.5,
    pricePerMinute: 0.8,
    minimumFare: 35,
    multiplier: 1.4,
    commissionRate: 0.18,
  },
  sally_standard: {
    basePrice: 10,
    pricePerKm: 4.0,
    pricePerMinute: 0.5,
    minimumFare: 20,
    multiplier: 1.0,
    commissionRate: 0.15,
  },
  sally_eco: {
    basePrice: 7,
    pricePerKm: 3.0,
    pricePerMinute: 0.3,
    minimumFare: 15,
    multiplier: 0.8,
    commissionRate: 0.12,
  },
  sally_pool: {
    basePrice: 5,
    pricePerKm: 2.5,
    pricePerMinute: 0.2,
    minimumFare: 10,
    multiplier: 0.6,
    commissionRate: 0.10,
  },
};

const PRICING_CONFIG = {
  currency: 'MAD',
  currencySymbol: 'DH',
  minPricePercentage: 0.75,
  maxPricePercentage: 1.35,
  defaultCommissionRate: 0.15,
  priceStep: 5,
  surgeMultiplierMax: 2.0,
};

const SURGE_CONFIGS = {
  rush_hour: { multiplier: 1.3, icon: '🚦', color: '#F59E0B' },
  night_rate: { multiplier: 1.25, icon: '🌙', color: '#8B5CF6' },
  high_demand: { multiplier: 1.4, icon: '📈', color: '#EF4444' },
  bad_weather: { multiplier: 1.35, icon: '🌧️', color: '#6B7280' },
  special_event: { multiplier: 1.5, icon: '🎉', color: '#EC4899' },
  weekend: { multiplier: 1.1, icon: '📅', color: '#10B981' },
};

const LIKELIHOOD_CONFIGS = {
  very_high: { minRatio: 1.2, percentage: 95, minutes: 1, emoji: '🚀', color: '#22C55E' },
  high: { minRatio: 1.0, percentage: 80, minutes: 3, emoji: '⚡', color: '#3B82F6' },
  medium: { minRatio: 0.85, percentage: 55, minutes: 6, emoji: '⏳', color: '#F59E0B' },
  low: { minRatio: 0, percentage: 25, minutes: 12, emoji: '🐢', color: '#EF4444' },
};

// ============================================================================
// HELPERS
// ============================================================================

function roundPrice(price, step = PRICING_CONFIG.priceStep) {
  return Math.round(price / step) * step;
}

function calculateCurrentSurge(options = {}) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  let multiplier = 1.0;
  let reason = null;
  
  if (day === 5 || day === 6) {
    multiplier = Math.max(multiplier, SURGE_CONFIGS.weekend.multiplier);
    reason = 'weekend';
  }
  
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    multiplier = Math.max(multiplier, SURGE_CONFIGS.rush_hour.multiplier);
    reason = 'rush_hour';
  }
  
  if (hour >= 22 || hour <= 6) {
    multiplier = Math.max(multiplier, SURGE_CONFIGS.night_rate.multiplier);
    reason = 'night_rate';
  }
  
  if (options.badWeather) {
    multiplier = Math.max(multiplier, SURGE_CONFIGS.bad_weather.multiplier);
    reason = 'bad_weather';
  }
  
  if (options.specialEvent) {
    multiplier = Math.max(multiplier, SURGE_CONFIGS.special_event.multiplier);
    reason = 'special_event';
  }
  
  multiplier = Math.min(multiplier, PRICING_CONFIG.surgeMultiplierMax);
  
  return {
    isActive: multiplier > 1,
    multiplier: Math.round(multiplier * 100) / 100,
    reason,
    config: reason ? SURGE_CONFIGS[reason] : null,
  };
}

function getLikelihoodLevel(ratio) {
  if (ratio >= LIKELIHOOD_CONFIGS.very_high.minRatio) return 'very_high';
  if (ratio >= LIKELIHOOD_CONFIGS.high.minRatio) return 'high';
  if (ratio >= LIKELIHOOD_CONFIGS.medium.minRatio) return 'medium';
  return 'low';
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

const pricingService = {
  calculateEstimate(params) {
    const { distanceKm, durationMinutes, serviceType = 'sally_standard', surgeOptions = {} } = params;
    
    if (!SERVICE_PRICING[serviceType]) {
      throw new Error(`Service inconnu: ${serviceType}`);
    }
    
    const config = SERVICE_PRICING[serviceType];
    const surge = calculateCurrentSurge(surgeOptions);
    
    const basePrice = config.basePrice;
    const distancePrice = distanceKm * config.pricePerKm;
    const durationPrice = durationMinutes * config.pricePerMinute;
    
    const rawPrice = (basePrice + distancePrice + durationPrice) * config.multiplier * surge.multiplier;
    const suggestedPrice = Math.max(config.minimumFare, roundPrice(rawPrice));
    const minPrice = Math.max(config.minimumFare, roundPrice(suggestedPrice * PRICING_CONFIG.minPricePercentage));
    const maxPrice = roundPrice(suggestedPrice * PRICING_CONFIG.maxPricePercentage);
    
    return {
      suggestedPrice,
      minPrice,
      maxPrice,
      breakdown: { base: basePrice, distance: distancePrice, duration: durationPrice, total: suggestedPrice },
      currency: PRICING_CONFIG.currency,
      serviceType,
      surgeInfo: surge.isActive ? { isActive: true, multiplier: surge.multiplier, reason: surge.reason } : null,
    };
  },
  
  calculateAcceptanceLikelihood(proposedPrice, suggestedPrice) {
    const ratio = proposedPrice / suggestedPrice;
    const level = getLikelihoodLevel(ratio);
    const config = LIKELIHOOD_CONFIGS[level];
    
    return {
      level,
      percentage: config.percentage,
      estimatedMinutes: config.minutes,
      emoji: config.emoji,
      color: config.color,
      ratio: Math.round(ratio * 100) / 100,
    };
  },
  
  calculateCommission(price, serviceType = 'sally_standard') {
    const config = SERVICE_PRICING[serviceType];
    const commissionRate = config?.commissionRate || PRICING_CONFIG.defaultCommissionRate;
    const commission = Math.round(price * commissionRate * 100) / 100;
    const driverEarnings = Math.round((price - commission) * 100) / 100;
    
    return { totalPrice: price, commission, commissionRate, driverEarnings, currency: PRICING_CONFIG.currency };
  },
  
  validateProposedPrice(proposedPrice, estimate) {
    if (proposedPrice < estimate.minPrice) {
      return { isValid: false, error: 'price_too_low', minPrice: estimate.minPrice };
    }
    if (proposedPrice > estimate.maxPrice) {
      return { isValid: false, error: 'price_too_high', maxPrice: estimate.maxPrice };
    }
    return { isValid: true, proposedPrice };
  },
  
  generateQuickPrices(minPrice, maxPrice, suggestedPrice) {
    const prices = [minPrice, suggestedPrice, maxPrice];
    const midLow = roundPrice((minPrice + suggestedPrice) / 2);
    const midHigh = roundPrice((suggestedPrice + maxPrice) / 2);
    if (midLow > minPrice && midLow < suggestedPrice) prices.push(midLow);
    if (midHigh > suggestedPrice && midHigh < maxPrice) prices.push(midHigh);
    return [...new Set(prices)].sort((a, b) => a - b);
  },
  
  getServiceConfig(serviceType) {
    return SERVICE_PRICING[serviceType] || null;
  },
  
  getAllServices() {
    return Object.entries(SERVICE_PRICING).map(([type, config]) => ({ type, ...config }));
  },
  
  getCurrentSurge(options = {}) {
    return calculateCurrentSurge(options);
  },
};

module.exports = pricingService;
module.exports.SERVICE_PRICING = SERVICE_PRICING;
module.exports.PRICING_CONFIG = PRICING_CONFIG;
module.exports.SURGE_CONFIGS = SURGE_CONFIGS;
module.exports.LIKELIHOOD_CONFIGS = LIKELIHOOD_CONFIGS;