/**
 * ============================================================================
 * GO WITH SALLY - NEAREST DRIVER CONTROLLER
 * ============================================================================
 * Contrôleur pour trouver les conductrices les plus proches
 * et gérer l'assignation automatique
 * ============================================================================
 */

console.log('[nearestDriverController.js] Fichier chargé');

const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const nearestDriverService = require('../services/nearestDriverService');

console.log('[nearestDriverController.js] Dépendances importées');

// ============================================================================
// FIND DRIVERS FOR RIDE
// ============================================================================

/**
 * Trouver les conductrices les plus proches pour une course
 * @route POST /api/rides/find-drivers
 * @body {
 *   rideId: string,
 *   maxDistance: number (optionnel, défaut 10000m),
 *   serviceType: string,
 *   limit: number (optionnel, défaut 10)
 * }
 */
exports.findDriversForRide = async (req, res) => {
  console.log('[nearestDriverController.js] ▶ findDriversForRide() appelé');

  try {
    const { rideId, maxDistance = 10000, serviceType = 'sally_standard', limit = 10 } = req.body;

    // Validation
    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'rideId requis'
      });
    }

    // Récupérer la course
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Course non trouvée'
      });
    }

    console.log('[nearestDriverController.js] Recherche pour:', ride.rideNumber);

    // Récupérer les coordonnées de pickup
    const coordinates = ride.pickup.coordinates.coordinates;

    // Trouver les conductrices
    const drivers = await nearestDriverService.findNearestDrivers(
      coordinates,
      maxDistance,
      serviceType,
      limit
    );

    console.log('[nearestDriverController.js] ✓ Conductrices trouvées:', drivers.length);

    // Formater la réponse
    const formattedDrivers = drivers.map(driver => ({
      id: driver._id,
      name: driver.user?.firstName,
      avatar: driver.user?.avatar,
      rating: driver.stats?.averageRating,
      totalRides: driver.stats?.completedRides,
      vehicle: {
        brand: driver.vehicle?.brand,
        model: driver.vehicle?.model,
        color: driver.vehicle?.color,
        plateNumber: driver.vehicle?.plateNumber,
        type: driver.vehicle?.type
      },
      distance: Math.round(driver.distance),
      distanceKm: Math.round(driver.distance / 1000 * 10) / 10,
      eta: driver.eta,
      etaMinutes: Math.ceil(driver.eta / 60),
      acceptanceRate: driver.stats?.acceptanceRate,
      score: Math.round(driver.score)
    }));

    res.status(200).json({
      success: true,
      message: `${drivers.length} conductrices trouvées`,
      data: {
        rideId,
        driversCount: drivers.length,
        drivers: formattedDrivers
      }
    });

  } catch (error) {
    console.log('[nearestDriverController.js] ❌ Erreur findDriversForRide:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
};

// ============================================================================
// AUTO ASSIGN BEST DRIVER
// ============================================================================

/**
 * Assigner automatiquement la meilleure conductrice
 * @route POST /api/rides/:rideId/assign
 */
exports.autoAssignDriver = async (req, res) => {
  console.log('[nearestDriverController.js] ▶ autoAssignDriver() appelé');

  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'rideId requis'
      });
    }

    // Assigner la meilleure conductrice
    const result = await nearestDriverService.assignBestDriver(rideId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          rideId,
          status: result.ride?.status
        }
      });
    }

    console.log('[nearestDriverController.js] ✓ Conductrice assignée');

    res.status(200).json({
      success: true,
      message: 'Conductrice assignée',
      data: {
        rideId,
        driver: result.driver,
        ride: {
          id: result.ride._id,
          rideNumber: result.ride.rideNumber,
          status: result.ride.status,
          driverAssignedAt: result.ride.timestamps.driverAssigned
        }
      }
    });

  } catch (error) {
    console.log('[nearestDriverController.js] ❌ Erreur autoAssignDriver:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation'
    });
  }
};

// ============================================================================
// GET NEARBY DRIVERS
// ============================================================================

/**
 * Obtenir les conductrices à proximité (pour l'admin)
 * @route GET /api/drivers/nearby?lat=&lng=&radius=
 * @query {
 *   lat: number,
 *   lng: number,
 *   radius: number (optionnel, défaut 10000m)
 * }
 */
exports.getNearbyDrivers = async (req, res) => {
  console.log('[nearestDriverController.js] ▶ getNearbyDrivers() appelé');

  try {
    const { lat, lng, radius = 10000 } = req.query;

    // Validation
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat et lng requis'
      });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseInt(radius);

    // Validation des valeurs
    if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius)) {
      return res.status(400).json({
        success: false,
        message: 'Valeurs invalides'
      });
    }

    // Trouver les conductrices à proximité
    const drivers = await nearestDriverService.findNearestDrivers(
      [parsedLng, parsedLat],
      parsedRadius,
      'sally_standard',
      50 // Plus de résultats pour l'admin
    );

    console.log('[nearestDriverController.js] ✓ Conductrices trouvées:', drivers.length);

    // Formater la réponse
    const formattedDrivers = drivers.map(driver => ({
      id: driver._id,
      name: `${driver.user?.firstName} ${driver.user?.lastName}`,
      email: driver.user?.email,
      phone: driver.user?.phone,
      avatar: driver.user?.avatar,
      status: driver.status,
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable,
      currentLocation: {
        type: driver.currentLocation?.type,
        coordinates: driver.currentLocation?.coordinates
      },
      distance: Math.round(driver.distance),
      distanceKm: Math.round(driver.distance / 1000 * 10) / 10,
      rating: driver.stats?.averageRating,
      totalRides: driver.stats?.completedRides,
      acceptanceRate: driver.stats?.acceptanceRate,
      vehicle: {
        brand: driver.vehicle?.brand,
        model: driver.vehicle?.model,
        color: driver.vehicle?.color,
        type: driver.vehicle?.type
      },
      earnings: {
        today: driver.earnings?.today,
        week: driver.earnings?.week,
        month: driver.earnings?.month,
        total: driver.earnings?.total
      }
    }));

    res.status(200).json({
      success: true,
      message: `${drivers.length} conductrices trouvées`,
      data: {
        searchCenter: { latitude: parsedLat, longitude: parsedLng },
        searchRadius: parsedRadius,
        driversCount: drivers.length,
        drivers: formattedDrivers
      }
    });

  } catch (error) {
    console.log('[nearestDriverController.js] ❌ Erreur getNearbyDrivers:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
};

// ============================================================================
// NOTIFY NEARBY DRIVERS
// ============================================================================

/**
 * Notifier les conductrices à proximité
 * @route POST /api/rides/:rideId/notify-drivers
 */
exports.notifyNearbyDrivers = async (req, res) => {
  console.log('[nearestDriverController.js] ▶ notifyNearbyDrivers() appelé');

  try {
    const { rideId } = req.params;
    const { radius = 10000 } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'rideId requis'
      });
    }

    // Récupérer la course
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Course non trouvée'
      });
    }

    // Notifier les conductrices
    const notifiedCount = await nearestDriverService.notifyNearbyDrivers(
      rideId,
      ride.pickup.coordinates.coordinates,
      radius
    );

    console.log('[nearestDriverController.js] ✓ Conductrices notifiées:', notifiedCount);

    res.status(200).json({
      success: true,
      message: `${notifiedCount} conductrices notifiées`,
      data: {
        rideId,
        rideNumber: ride.rideNumber,
        notifiedCount,
        radius
      }
    });

  } catch (error) {
    console.log('[nearestDriverController.js] ❌ Erreur notifyNearbyDrivers:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la notification'
    });
  }
};

console.log('[nearestDriverController.js] ✅ Contrôleur exporté');
console.log('[nearestDriverController.js] Routes: findDriversForRide, autoAssignDriver, getNearbyDrivers, notifyNearbyDrivers');
