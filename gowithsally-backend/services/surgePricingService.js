// ============================================================
// 📄 surgePricingService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('surgePricingService.js ▶ Module loaded')
//   • console.log('surgePricingService.js ▶ calculateSurgeMultiplier() called')
// ============================================================

console.log('surgePricingService.js ▶ Module loaded');

const Ride = require('../models/Ride');

// ============================================================
// CONFIGURATION
// ============================================================

const SURGE_FACTORS = {
  RUSH_HOUR: {
    multiplier: 1.25,
    percentage: 25,
    times: [
      { start: 7, end: 9 },     // Matin 7h-9h
      { start: 17, end: 20 },   // Soir 17h-20h
    ],
  },
  NIGHT_RATE: {
    multiplier: 1.30,
    percentage: 30,
    times: [
      { start: 22, end: 24 },   // 22h-minuit
      { start: 0, end: 6 },     // Minuit-6h
    ],
  },
  WEEKEND: {
    multiplier: 1.15,
    percentage: 15,
    days: [5, 6], // Vendredi et samedi
  },
  RAIN: {
    multiplier: 1.15,
    percentage: 15,
  },
  HIGH_DEMAND: {
    multiplier: 1.40,
    percentage: 40,
  },
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Vérifie si c'est actuellement une heure de pointe
 */
function isRushHour(date = new Date()) {
  console.log('surgePricingService.js ▶ isRushHour() called');
  const hour = date.getHours();

  return SURGE_FACTORS.RUSH_HOUR.times.some(
    time => hour >= time.start && hour < time.end
  );
}

/**
 * Vérifie si c'est actuellement les heures de nuit
 */
function isNightRate(date = new Date()) {
  console.log('surgePricingService.js ▶ isNightRate() called');
  const hour = date.getHours();

  return SURGE_FACTORS.NIGHT_RATE.times.some(
    time => hour >= time.start && hour < time.end
  );
}

/**
 * Vérifie si c'est le weekend
 */
function isWeekend(date = new Date()) {
  console.log('surgePricingService.js ▶ isWeekend() called');
  const day = date.getDay();
  return SURGE_FACTORS.WEEKEND.days.includes(day);
}

/**
 * Calcule le ratio demande/offre basé sur le nombre de trajets actifs
 */
async function calculateDemandSupplyRatio(latitude, longitude, radiusKm = 2) {
  console.log('surgePricingService.js ▶ calculateDemandSupplyRatio() called');

  try {
    // Nombre de trajets actifs en attente (demande)
    const activeRidesCount = await Ride.countDocuments({
      status: 'accepted',
      'pickup.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000, // convertir en mètres
        },
      },
    });

    // Nombre de conducteurs disponibles dans la zone (offre)
    const User = require('../models/User');
    const availableDriversCount = await User.countDocuments({
      role: 'driver',
      isAvailable: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000,
        },
      },
    });

    // Si pas de conducteurs disponibles, ratio très élevé
    if (availableDriversCount === 0) {
      return 2.0; // Multiplier max 2x
    }

    const ratio = activeRidesCount / Math.max(availableDriversCount, 1);

    // Normaliser entre 0.5 et 2.0
    return Math.min(Math.max(ratio, 0.5), 2.0);
  } catch (error) {
    console.error('surgePricingService.js ▶ calculateDemandSupplyRatio() error:', error.message);
    return 1.0; // Pas de surge en cas d'erreur
  }
}

/**
 * Évalue le niveau de demande basé sur l'historique des heures
 */
async function evaluateDemandLevel(date = new Date()) {
  console.log('surgePricingService.js ▶ evaluateDemandLevel() called');

  try {
    const hour = date.getHours();

    // Nombre de complétions de trajets cette heure-ci (basé sur l'historique)
    const completedRidesThisHour = await Ride.countDocuments({
      status: 'completed',
      completedAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 1),
      },
    });

    // Classer le niveau
    if (completedRidesThisHour > 100) return 'very_high';
    if (completedRidesThisHour > 50) return 'high';
    if (completedRidesThisHour > 20) return 'medium';
    return 'low';
  } catch (error) {
    console.error('surgePricingService.js ▶ evaluateDemandLevel() error:', error.message);
    return 'medium';
  }
}

// ============================================================
// MAIN SERVICE
// ============================================================

const surgePricingService = {
  /**
   * Calcule le multiplicateur de surge complet
   * @param {Object} options - Options de calcul
   * @returns {Promise<Object>} - Multiplicateur et détails
   */
  async calculateSurgeMultiplier(options = {}) {
    console.log('surgePricingService.js ▶ calculateSurgeMultiplier() called');

    const {
      latitude,
      longitude,
      radius = 2,
      date = new Date(),
      hasRain = false,
      specialEvent = false,
    } = options;

    let totalMultiplier = 1.0;
    const factors = [];

    // 1. Heure de pointe
    if (isRushHour(date)) {
      totalMultiplier *= SURGE_FACTORS.RUSH_HOUR.multiplier;
      factors.push({
        type: 'rush_hour',
        multiplier: SURGE_FACTORS.RUSH_HOUR.multiplier,
        percentage: SURGE_FACTORS.RUSH_HOUR.percentage,
      });
    }

    // 2. Heures de nuit
    if (isNightRate(date)) {
      totalMultiplier *= SURGE_FACTORS.NIGHT_RATE.multiplier;
      factors.push({
        type: 'night_rate',
        multiplier: SURGE_FACTORS.NIGHT_RATE.multiplier,
        percentage: SURGE_FACTORS.NIGHT_RATE.percentage,
      });
    }

    // 3. Weekend
    if (isWeekend(date)) {
      totalMultiplier *= 1.15; // 15% supplémentaire weekend
      factors.push({
        type: 'weekend',
        multiplier: 1.15,
        percentage: 15,
      });
    }

    // 4. Pluie
    if (hasRain) {
      totalMultiplier *= SURGE_FACTORS.RAIN.multiplier;
      factors.push({
        type: 'rain',
        multiplier: SURGE_FACTORS.RAIN.multiplier,
        percentage: SURGE_FACTORS.RAIN.percentage,
      });
    }

    // 5. Événement spécial
    if (specialEvent) {
      totalMultiplier *= 1.25; // 25% pour événement spécial
      factors.push({
        type: 'special_event',
        multiplier: 1.25,
        percentage: 25,
      });
    }

    // 6. Ratio demande/offre
    let demandSupplyMultiplier = 1.0;
    if (latitude && longitude) {
      const ratio = await calculateDemandSupplyRatio(latitude, longitude, radius);
      // Converter ratio vers multiplicateur (linéaire)
      demandSupplyMultiplier = 0.5 + ratio * 0.75; // Entre 0.5x et 2x
      totalMultiplier *= demandSupplyMultiplier;

      if (demandSupplyMultiplier > 1.1) {
        factors.push({
          type: 'demand_supply',
          multiplier: demandSupplyMultiplier,
          ratio,
        });
      }
    }

    // 7. Demande générale
    const demandLevel = await evaluateDemandLevel(date);
    let demandMultiplier = 1.0;

    if (demandLevel === 'very_high') {
      demandMultiplier = SURGE_FACTORS.HIGH_DEMAND.multiplier;
      totalMultiplier *= demandMultiplier;
      factors.push({
        type: 'high_demand',
        level: demandLevel,
        multiplier: demandMultiplier,
        percentage: SURGE_FACTORS.HIGH_DEMAND.percentage,
      });
    }

    // Limiter à 2x maximum
    totalMultiplier = Math.min(totalMultiplier, 2.0);

    // Arrondir à 2 décimales
    totalMultiplier = Math.round(totalMultiplier * 100) / 100;

    return {
      multiplier: totalMultiplier,
      factors,
      isActive: totalMultiplier > 1.05,
      timestamp: new Date(),
    };
  },

  /**
   * Récupère les informations de surge pour une zone
   */
  async getSurgeInfo(latitude, longitude, radius = 2) {
    console.log('surgePricingService.js ▶ getSurgeInfo() called');

    try {
      const surge = await this.calculateSurgeMultiplier({
        latitude,
        longitude,
        radius,
      });

      return {
        success: true,
        surge,
      };
    } catch (error) {
      console.error('surgePricingService.js ▶ getSurgeInfo() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère les heures de surge historiques
   */
  async getSurgeHistory(days = 7) {
    console.log('surgePricingService.js ▶ getSurgeHistory() called');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = {};

      for (let i = 0; i < 24; i++) {
        const completedRides = await Ride.countDocuments({
          status: 'completed',
          completedAt: {
            $gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), i),
            $lt: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), i + 1),
          },
        });

        history[i] = {
          hour: i,
          completedRides,
          avgMultiplier: completedRides > 50 ? 1.4 : completedRides > 20 ? 1.2 : 1.0,
        };
      }

      return {
        success: true,
        history,
        period: `Last ${days} days`,
      };
    } catch (error) {
      console.error('surgePricingService.js ▶ getSurgeHistory() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère les facteurs de surge actuels
   */
  getCurrentFactors(date = new Date()) {
    console.log('surgePricingService.js ▶ getCurrentFactors() called');

    const factors = {
      rushHour: isRushHour(date),
      nightRate: isNightRate(date),
      weekend: isWeekend(date),
      timestamp: date,
    };

    return factors;
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = surgePricingService;
