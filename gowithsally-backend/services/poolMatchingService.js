// ============================================================
// 📄 poolMatchingService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('[poolMatchingService.js] ▶ Module loaded')
//   • console.log('[poolMatchingService.js] ▶ findPoolMatches() called')
// ============================================================
/**
 * Pool Matching Service
 * ====================
 * Compatible route matching for carpooling:
 * - Compare routes (pickup/dropoff)
 * - Check bearing alignment (±20%)
 * - Match riders with compatible directions
 */

console.log('[poolMatchingService.js] ▶ Module loaded');

const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

console.log('[poolMatchingService.js] ▶ Dependencies imported');

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  MAX_DETOUR_KM: 2.0, // Max distance to deviate for pooling
  BEARING_TOLERANCE: 20, // ±20 degrees for direction match
  ROUTE_SIMILARITY_THRESHOLD: 0.7, // 70% overlap required
};

console.log('[poolMatchingService.js] ▶ Configuration loaded');

// ============================================================
// BEARING & DIRECTION CALCULATION
// ============================================================

/**
 * Calculate bearing (direction) between two coordinates.
 * @param {Array} from - [longitude, latitude]
 * @param {Array} to - [longitude, latitude]
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(from, to) {
  console.log('[poolMatchingService.js] ▶ calculateBearing() called');

  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  console.log(`[poolMatchingService.js] ▶ Bearing: ${bearing.toFixed(2)}°`);
  return bearing;
}

/**
 * Calculate angle difference between two bearings.
 * @param {number} bearing1 - Bearing in degrees
 * @param {number} bearing2 - Bearing in degrees
 * @returns {number} Smallest angle difference (0-180)
 */
function bearingDifference(bearing1, bearing2) {
  console.log(`[poolMatchingService.js] ▶ bearingDifference() called (${bearing1}° vs ${bearing2}°)`);

  let diff = Math.abs(bearing1 - bearing2);
  diff = Math.min(diff, 360 - diff); // Shortest angle

  console.log(`[poolMatchingService.js] ▶ Bearing difference: ${diff.toFixed(2)}°`);
  return diff;
}

/**
 * Check if two bearings are compatible (within tolerance).
 * @param {number} bearing1
 * @param {number} bearing2
 * @param {number} tolerance - Tolerance in degrees (default ±20)
 * @returns {boolean}
 */
function bearingsCompatible(bearing1, bearing2, tolerance = CONFIG.BEARING_TOLERANCE) {
  console.log('[poolMatchingService.js] ▶ bearingsCompatible() called');

  const diff = bearingDifference(bearing1, bearing2);
  const compatible = diff <= tolerance;

  console.log(
    `[poolMatchingService.js] ▶ Compatible: ${compatible} (diff=${diff.toFixed(2)}° vs tolerance=${tolerance}°)`
  );
  return compatible;
}

// ============================================================
// HAVERSINE DISTANCE
// ============================================================

/**
 * Calculate distance between two coordinates.
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  console.log('[poolMatchingService.js] ▶ calculateDistance() called');

  const R = 6371; // Earth radius in km
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

  console.log(`[poolMatchingService.js] ▶ Distance: ${distance.toFixed(2)} km`);
  return distance;
}

// ============================================================
// ROUTE COMPATIBILITY
// ============================================================

/**
 * Check route compatibility between two rides.
 * @param {Object} rideA - Ride A {pickup, dropoff}
 * @param {Object} rideB - Ride B {pickup, dropoff}
 * @returns {Object} { compatible, score, details }
 */
function checkRouteCompatibility(rideA, rideB) {
  console.log('[poolMatchingService.js] ▶ checkRouteCompatibility() called');

  const pickupA = rideA.pickup.coordinates;
  const dropoffA = rideA.dropoff.coordinates;
  const pickupB = rideB.pickup.coordinates;
  const dropoffB = rideB.dropoff.coordinates;

  // Calculate bearings
  const bearingA = calculateBearing(pickupA, dropoffA);
  const bearingB = calculateBearing(pickupB, dropoffB);

  // Check bearing compatibility
  const bearingCompatible = bearingsCompatible(bearingA, bearingB);

  if (!bearingCompatible) {
    console.log('[poolMatchingService.js] ▶ Routes incompatible: bearing mismatch');
    return {
      compatible: false,
      score: 0,
      details: 'Bearing mismatch',
    };
  }

  // Calculate route distances
  const distA = calculateDistance(pickupA, dropoffA);
  const distB = calculateDistance(pickupB, dropoffB);

  // Check if routes overlap (simplified)
  const pickupDistance = calculateDistance(pickupA, pickupB);
  const dropoffDistance = calculateDistance(dropoffA, dropoffB);

  // Both pickups and dropoffs should be close
  const pickupClose = pickupDistance <= CONFIG.MAX_DETOUR_KM;
  const dropoffClose = dropoffDistance <= CONFIG.MAX_DETOUR_KM;

  if (!pickupClose || !dropoffClose) {
    console.log(
      `[poolMatchingService.js] ▶ Routes incompatible: endpoints too far ` +
      `(pickup=${pickupDistance.toFixed(2)}km, dropoff=${dropoffDistance.toFixed(2)}km)`
    );
    return {
      compatible: false,
      score: 0,
      details: 'Endpoints too far apart',
    };
  }

  // Calculate compatibility score
  const maxDetour = CONFIG.MAX_DETOUR_KM;
  const pickupScore = Math.max(0, 1 - (pickupDistance / maxDetour));
  const dropoffScore = Math.max(0, 1 - (dropoffDistance / maxDetour));
  const bearingScore = 1 - (bearingDifference(bearingA, bearingB) / CONFIG.BEARING_TOLERANCE);

  const score = (pickupScore + dropoffScore + bearingScore) / 3;

  console.log(`[poolMatchingService.js] ▶ Routes compatible with score: ${score.toFixed(4)}`);

  return {
    compatible: true,
    score,
    details: {
      bearing_diff: bearingDifference(bearingA, bearingB),
      pickup_distance_km: pickupDistance,
      dropoff_distance_km: dropoffDistance,
    },
  };
}

// ============================================================
// POOL MATCHING
// ============================================================

/**
 * Find compatible rides for pooling.
 * @param {Object} ride - Request ride
 * @param {number} limit - Max matches
 * @returns {Promise<Array>} Compatible rides with scores
 */
async function findPoolMatches(ride, limit = 5) {
  console.log('[poolMatchingService.js] ▶ findPoolMatches() called');
  console.log(
    `[poolMatchingService.js] ▶ Ride: ` +
    `[${ride.pickup.coordinates}] → [${ride.dropoff.coordinates}]`
  );

  try {
    // Find nearby rides with similar timing
    const timeWindow = 30; // 30 minutes
    const requestTime = new Date(ride.createdAt);
    const windowStart = new Date(requestTime.getTime() - timeWindow * 60000);
    const windowEnd = new Date(requestTime.getTime() + timeWindow * 60000);

    const otherRides = await Ride.find({
      _id: { $ne: ride._id },
      status: { $in: ['requested', 'accepted'] },
      createdAt: { $gte: windowStart, $lte: windowEnd },
      // Within general area (bounding box)
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: ride.pickup.coordinates
          },
          $maxDistance: 5000 // 5km
        }
      }
    }).limit(limit * 2); // Get more for compatibility check

    console.log(`[poolMatchingService.js] ▶ Found ${otherRides.length} nearby rides`);

    // Check compatibility
    const matches = otherRides
      .map(otherRide => {
        const compatibility = checkRouteCompatibility(ride, otherRide);
        return {
          ride: otherRide,
          ...compatibility,
        };
      })
      .filter(m => m.compatible)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`[poolMatchingService.js] ▶ Found ${matches.length} compatible rides`);

    return matches;
  } catch (err) {
    console.error(`[poolMatchingService.js] ▶ Pool matching error: ${err.message}`);
    throw err;
  }
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  findPoolMatches,
  checkRouteCompatibility,
  calculateBearing,
  bearingsCompatible,
  calculateDistance,
  CONFIG,
};

console.log('[poolMatchingService.js] ▶ Module exports ready');
