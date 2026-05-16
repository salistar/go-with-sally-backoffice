// ============================================================
// 📄 matchingService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('[matchingService.js] ▶ Module loaded')
//   • console.log('[matchingService.js] ▶ calculateMatch() called')
// ============================================================
/**
 * Matching Algorithm Service
 * =========================
 * Multi-criteria matching for ride matching:
 * Score = 0.4*(1/distance) + 0.3*rating + 0.2*(1/eta) + 0.1*history
 *
 * Features:
 * - Haversine distance calculation (5km radius)
 * - Rating normalization (0-5 → 0-1)
 * - ETA estimation
 * - Ride history points
 * - 2dsphere MongoDB index support
 */

console.log('[matchingService.js] ▶ Module loaded');

const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const RideHistory = require('../models/RideHistory');

console.log('[matchingService.js] ▶ Dependencies imported');

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  SEARCH_RADIUS: 5000, // 5km in meters
  MAX_RATING: 5.0,
  AVERAGE_SPEED: 30, // km/h for ETA calculation

  // Weighting factors
  WEIGHT_DISTANCE: 0.4,
  WEIGHT_RATING: 0.3,
  WEIGHT_ETA: 0.2,
  WEIGHT_HISTORY: 0.1,

  // Scoring thresholds
  MIN_RATING: 3.0,
  MIN_MATCH_SCORE: 0.5,
};

console.log('[matchingService.js] ▶ Configuration loaded');

// ============================================================
// HAVERSINE DISTANCE CALCULATION
// ============================================================
/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {number} Distance in meters
 */
function haversineDistance(coord1, coord2) {
  console.log('[matchingService.js] ▶ haversineDistance() called');

  const R = 6371000; // Earth radius in meters
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  console.log(`[matchingService.js] ▶ Distance: ${distance.toFixed(2)}m`);
  return distance;
}

// ============================================================
// SCORE CALCULATION COMPONENTS
// ============================================================

/**
 * Normalize distance to score (closer = higher score).
 * @param {number} distance - Distance in meters
 * @returns {number} Score 0-1
 */
function scoreDistance(distance) {
  console.log(`[matchingService.js] ▶ scoreDistance() called (distance=${distance}m)`);

  if (distance === 0) return 1.0;
  if (distance > CONFIG.SEARCH_RADIUS) return 0.0;

  // Inverse distance: closer drivers score higher
  const maxDist = CONFIG.SEARCH_RADIUS;
  const score = 1 - (distance / maxDist);

  console.log(`[matchingService.js] ▶ Distance score: ${score.toFixed(4)}`);
  return score;
}

/**
 * Normalize rating to score (higher rating = higher score).
 * @param {number} rating - Rating 0-5
 * @returns {number} Score 0-1
 */
function scoreRating(rating) {
  console.log(`[matchingService.js] ▶ scoreRating() called (rating=${rating})`);

  const normalized = Math.max(0, Math.min(rating / CONFIG.MAX_RATING, 1.0));

  console.log(`[matchingService.js] ▶ Rating score: ${normalized.toFixed(4)}`);
  return normalized;
}

/**
 * Estimate ETA and normalize to score.
 * @param {number} distance - Distance in meters
 * @returns {number} Score 0-1 (lower ETA = higher score)
 */
function scoreETA(distance) {
  console.log(`[matchingService.js] ▶ scoreETA() called (distance=${distance}m)`);

  // Convert distance to km
  const distanceKm = distance / 1000;

  // Calculate ETA in minutes
  const etaMinutes = (distanceKm / CONFIG.AVERAGE_SPEED) * 60;

  // Max acceptable ETA = 30 minutes
  const maxEta = 30;
  const eta_score = 1 - Math.min(etaMinutes / maxEta, 1.0);

  console.log(`[matchingService.js] ▶ ETA: ${etaMinutes.toFixed(2)}min, Score: ${eta_score.toFixed(4)}`);
  return eta_score;
}

/**
 * Calculate history bonus based on ride history.
 * @param {string} driverId - Driver ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} Score 0-1
 */
async function scoreRideHistory(driverId, userId) {
  console.log('[matchingService.js] ▶ scoreRideHistory() called');

  try {
    // Check if driver and user have shared history
    const sharedRides = await RideHistory.countDocuments({
      driver: driverId,
      passenger: userId,
      status: 'completed'
    });

    // Bonus: 0.1 for each shared ride (max 0.3)
    const historyScore = Math.min(sharedRides * 0.1, 0.3);

    console.log(`[matchingService.js] ▶ Shared rides: ${sharedRides}, Score: ${historyScore.toFixed(4)}`);
    return historyScore;
  } catch (err) {
    console.error(`[matchingService.js] ▶ History scoring error: ${err.message}`);
    return 0;
  }
}

// ============================================================
// MAIN MATCHING FUNCTION
// ============================================================

/**
 * Calculate match score between driver and ride request.
 * Score = 0.4*distance_score + 0.3*rating_score + 0.2*eta_score + 0.1*history_score
 *
 * @param {Object} driver - Driver object
 * @param {Array} rideCoordinates - [longitude, latitude] of ride pickup
 * @param {string} userId - User ID for history calculation
 * @returns {Promise<Object>} { score, components, details }
 */
async function calculateMatchScore(driver, rideCoordinates, userId) {
  console.log('[matchingService.js] ▶ calculateMatchScore() called');

  try {
    // Extract driver info
    const driverCoords = driver.location.coordinates;
    const driverRating = driver.rating || 4.0;

    // Component 1: Distance
    const distance = haversineDistance(driverCoords, rideCoordinates);
    if (distance > CONFIG.SEARCH_RADIUS) {
      console.log(`[matchingService.js] ▶ Driver outside search radius (${distance}m > ${CONFIG.SEARCH_RADIUS}m)`);
      return {
        score: 0,
        components: { distance: 0, rating: 0, eta: 0, history: 0 },
        details: 'Outside search radius',
        distance_m: distance,
      };
    }

    const distanceScore = scoreDistance(distance);

    // Component 2: Rating
    if (driverRating < CONFIG.MIN_RATING) {
      console.log(`[matchingService.js] ▶ Rating below minimum (${driverRating} < ${CONFIG.MIN_RATING})`);
      return {
        score: 0,
        components: { distance: 0, rating: 0, eta: 0, history: 0 },
        details: 'Rating below minimum',
        distance_m: distance,
      };
    }

    const ratingScore = scoreRating(driverRating);

    // Component 3: ETA
    const etaScore = scoreETA(distance);

    // Component 4: Ride History
    const historyScore = await scoreRideHistory(driver._id, userId);

    // Calculate weighted score
    const totalScore =
      CONFIG.WEIGHT_DISTANCE * distanceScore +
      CONFIG.WEIGHT_RATING * ratingScore +
      CONFIG.WEIGHT_ETA * etaScore +
      CONFIG.WEIGHT_HISTORY * historyScore;

    console.log(`[matchingService.js] ▶ Match score: ${totalScore.toFixed(4)}`);

    return {
      score: totalScore,
      components: {
        distance: distanceScore,
        rating: ratingScore,
        eta: etaScore,
        history: historyScore,
      },
      details: {
        distance_m: distance,
        rating: driverRating,
        eta_minutes: (distance / 1000 / CONFIG.AVERAGE_SPEED) * 60,
        shared_rides: await RideHistory.countDocuments({
          driver: driver._id,
          passenger: userId,
          status: 'completed'
        }),
      },
    };
  } catch (err) {
    console.error(`[matchingService.js] ▶ Scoring error: ${err.message}`);
    throw err;
  }
}

// ============================================================
// FIND MATCHING DRIVERS
// ============================================================

/**
 * Find best matching drivers for a ride request.
 * @param {Array} rideCoordinates - [longitude, latitude]
 * @param {string} userId - User ID
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Sorted drivers with match scores
 */
async function findMatchingDrivers(rideCoordinates, userId, limit = 10) {
  console.log('[matchingService.js] ▶ findMatchingDrivers() called');
  console.log(`[matchingService.js] ▶ Ride coords: [${rideCoordinates}], Limit: ${limit}`);

  try {
    // Query drivers near location using 2dsphere index
    const nearbyDrivers = await Driver.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: rideCoordinates
          },
          $maxDistance: CONFIG.SEARCH_RADIUS
        }
      },
      active: true,
      available: true,
    }).limit(limit * 2); // Get extra drivers for scoring

    console.log(`[matchingService.js] ▶ Found ${nearbyDrivers.length} nearby drivers`);

    // Score each driver
    const scoredDrivers = await Promise.all(
      nearbyDrivers.map(async (driver) => {
        const scoreResult = await calculateMatchScore(driver, rideCoordinates, userId);
        return {
          driver,
          ...scoreResult,
        };
      })
    );

    // Filter and sort by score
    const matches = scoredDrivers
      .filter(m => m.score >= CONFIG.MIN_MATCH_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`[matchingService.js] ▶ Matched ${matches.length} drivers with min score ${CONFIG.MIN_MATCH_SCORE}`);

    return matches;
  } catch (err) {
    console.error(`[matchingService.js] ▶ Matching error: ${err.message}`);
    throw err;
  }
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  calculateMatchScore,
  findMatchingDrivers,
  haversineDistance,
  CONFIG,
};

console.log('[matchingService.js] ▶ Module exports ready');
