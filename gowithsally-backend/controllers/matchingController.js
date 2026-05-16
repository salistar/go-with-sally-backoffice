// ============================================================
// 📄 matchingController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('[matchingController.js] ▶ Module loaded')
//   • console.log('[matchingController.js] ▶ findMatches() called')
// ============================================================
/**
 * Matching Controller
 * ===================
 * Handles ride matching requests and pool matching orchestration.
 */

console.log('[matchingController.js] ▶ Module loaded');

const { findMatchingDrivers } = require('../services/matchingService');
const { findPoolMatches } = require('../services/poolMatchingService');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

console.log('[matchingController.js] ▶ Dependencies imported');

// ============================================================
// FIND MATCHING DRIVERS
// ============================================================

/**
 * POST /api/matching/find-drivers
 * Find matching drivers for a ride request.
 *
 * Body:
 * {
 *   "pickup": [longitude, latitude],
 *   "dropoff": [longitude, latitude],
 *   "limit": 10
 * }
 */
exports.findMatches = async (req, res) => {
  console.log('[matchingController.js] ▶ findMatches() called');
  console.log(`[matchingController.js] ▶ User ID: ${req.user._id}`);

  try {
    const { pickup, dropoff, limit = 10 } = req.body;

    console.log(`[matchingController.js] ▶ Pickup: [${pickup}], Dropoff: [${dropoff}]`);

    // Validate coordinates
    if (!pickup || pickup.length !== 2 || !dropoff || dropoff.length !== 2) {
      console.error('[matchingController.js] ▶ Invalid coordinates format');
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Expected [longitude, latitude]'
      });
    }

    // Find matching drivers
    const matches = await findMatchingDrivers(pickup, req.user._id, limit);

    console.log(`[matchingController.js] ▶ Found ${matches.length} matching drivers`);

    // Format response
    const formattedMatches = matches.map(m => ({
      driver: {
        _id: m.driver._id,
        name: m.driver.name,
        phone: m.driver.phone,
        rating: m.driver.rating,
        vehicle: m.driver.vehicle,
        location: m.driver.location,
        active: m.driver.active,
      },
      score: m.score,
      components: m.components,
      details: m.details,
    }));

    console.log('[matchingController.js] ▶ Response formatted');

    return res.status(200).json({
      success: true,
      data: {
        matches: formattedMatches,
        count: formattedMatches.length,
        pickup,
        dropoff,
      }
    });

  } catch (err) {
    console.error(`[matchingController.js] ▶ Error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ============================================================
// FIND POOL MATCHES
// ============================================================

/**
 * POST /api/matching/find-pool
 * Find compatible riders for ride pooling.
 *
 * Body:
 * {
 *   "rideId": "ride_id",
 *   "limit": 5
 * }
 */
exports.findPoolMatches = async (req, res) => {
  console.log('[matchingController.js] ▶ findPoolMatches() called');
  console.log(`[matchingController.js] ▶ User ID: ${req.user._id}`);

  try {
    const { rideId, limit = 5 } = req.body;

    console.log(`[matchingController.js] ▶ Ride ID: ${rideId}`);

    // Get ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.error('[matchingController.js] ▶ Ride not found');
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    // Find pool matches
    const matches = await findPoolMatches(ride, limit);

    console.log(`[matchingController.js] ▶ Found ${matches.length} pool matches`);

    // Format response
    const formattedMatches = matches.map(m => ({
      ride: {
        _id: m.ride._id,
        passenger: m.ride.passenger,
        pickup: m.ride.pickup,
        dropoff: m.ride.dropoff,
        status: m.ride.status,
      },
      score: m.score,
      details: m.details,
    }));

    return res.status(200).json({
      success: true,
      data: {
        matches: formattedMatches,
        count: formattedMatches.length,
        ride: rideId,
      }
    });

  } catch (err) {
    console.error(`[matchingController.js] ▶ Error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ============================================================
// GET MATCHING STATISTICS
// ============================================================

/**
 * GET /api/matching/stats
 * Get matching statistics for a user.
 */
exports.getMatchingStats = async (req, res) => {
  console.log('[matchingController.js] ▶ getMatchingStats() called');
  console.log(`[matchingController.js] ▶ User ID: ${req.user._id}`);

  try {
    const userId = req.user._id;

    // Count various stats
    const completedRides = await Ride.countDocuments({
      passenger: userId,
      status: 'completed'
    });

    const averageMatchTime = await Ride.aggregate([
      { $match: { passenger: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          avgTime: {
            $avg: {
              $subtract: ['$acceptedAt', '$createdAt']
            }
          }
        }
      }
    ]);

    const driverPreferences = await Ride.aggregate([
      { $match: { passenger: userId, status: 'completed' } },
      {
        $group: {
          _id: '$driver',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log('[matchingController.js] ▶ Stats calculated');

    return res.status(200).json({
      success: true,
      data: {
        completed_rides: completedRides,
        average_match_time_ms: averageMatchTime[0]?.avgTime || 0,
        favorite_drivers: driverPreferences.map(p => ({
          driver_id: p._id,
          ride_count: p.count
        })),
      }
    });

  } catch (err) {
    console.error(`[matchingController.js] ▶ Error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

console.log('[matchingController.js] ▶ Module exports ready');
