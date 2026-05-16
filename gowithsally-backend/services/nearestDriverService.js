/**
 * ============================================================================
 * GO WITH SALLY - NEAREST DRIVER SERVICE
 * ============================================================================
 * Service pour trouver les conductrices les plus proches et gérer
 * l'assignation et la notification des courses
 * ============================================================================
 */

console.log('[nearestDriverService.js] Fichier chargé');

const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { io } = require('../socket');

console.log('[nearestDriverService.js] Dépendances importées');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  DEFAULT_SEARCH_RADIUS: 10000, // 10km
  MAX_SEARCH_RADIUS: 30000, // 30km
  AVERAGE_SPEED_CITY: 30, // km/h
  MIN_DRIVER_RATING: 3.5,
  NEARBY_NOTIFICATION_RADIUS: 10000 // Rayon pour notifier les conductrices
};

// ============================================================================
// FIND NEAREST DRIVERS
// ============================================================================

/**
 * Trouve les conductrices les plus proches pour une demande de course
 * @param {Array} userCoordinates - [longitude, latitude]
 * @param {number} maxDistance - Distance maximale en mètres
 * @param {string} serviceType - Type de service demandé
 * @param {number} limit - Nombre maximal de résultats
 * @returns {Promise<Array>} - Array de conductrices triées par distance
 */
exports.findNearestDrivers = async (userCoordinates, maxDistance = config.DEFAULT_SEARCH_RADIUS, serviceType = 'sally_standard', limit = 10) => {
  console.log('[nearestDriverService.js] findNearestDrivers() appelé');
  console.log('[nearestDriverService.js] Coordonnées utilisateur:', userCoordinates);
  console.log('[nearestDriverService.js] Distance max:', maxDistance, 'mètres');
  console.log('[nearestDriverService.js] Type service:', serviceType);

  try {
    // Vérifier les coordonnées
    if (!userCoordinates || userCoordinates.length !== 2) {
      throw new Error('Coordonnées invalides');
    }

    // Vérifier que le rayon ne dépasse pas le maximum
    const searchRadius = Math.min(maxDistance, config.MAX_SEARCH_RADIUS);

    // Rechercher les conductrices disponibles à proximité
    const drivers = await Driver.findNearbyAvailable(userCoordinates, searchRadius);

    console.log('[nearestDriverService.js] Conductrices trouvées:', drivers.length);

    if (drivers.length === 0) {
      console.log('[nearestDriverService.js] ⚠ Aucune conductrice disponible');
      return [];
    }

    // Calculer la distance pour chaque conductrice et les trier
    const driversWithDistance = drivers.map(driver => {
      const driverCoords = driver.currentLocation.coordinates;
      const distance = calculateDistanceMeters(
        userCoordinates[1], // lat
        userCoordinates[0], // lng
        driverCoords[1], // lat
        driverCoords[0] // lng
      );

      return {
        ...driver.toObject(),
        distance,
        eta: calculateETA(driverCoords, userCoordinates),
        score: calculateDriverScore(driver, distance)
      };
    });

    // Trier par score (distance + note + disponibilité)
    const sorted = driversWithDistance.sort((a, b) => b.score - a.score);

    // Limiter les résultats
    const result = sorted.slice(0, limit);

    console.log('[nearestDriverService.js] ✓ Conductrices retournées:', result.length);
    return result;

  } catch (error) {
    console.log('[nearestDriverService.js] ❌ Erreur findNearestDrivers:', error.message);
    throw error;
  }
};

// ============================================================================
// CALCULATE ETA
// ============================================================================

/**
 * Estime le temps d'arrivée de la conductrice
 * @param {Array} driverCoordinates - [longitude, latitude]
 * @param {Array} userCoordinates - [longitude, latitude]
 * @returns {number} - ETA en secondes
 */
exports.calculateETA = (driverCoordinates, userCoordinates) => {
  console.log('[nearestDriverService.js] calculateETA() appelé');

  try {
    const distanceMeters = calculateDistanceMeters(
      userCoordinates[1], // lat
      userCoordinates[0], // lng
      driverCoordinates[1], // lat
      driverCoordinates[0] // lng
    );

    // Convertir en km et calculer le temps à 30km/h moyenne en ville
    const distanceKm = distanceMeters / 1000;
    const speedKmh = config.AVERAGE_SPEED_CITY;
    const etaSeconds = Math.round((distanceKm / speedKmh) * 3600);

    console.log('[nearestDriverService.js] ETA calculée:', etaSeconds, 'secondes');
    return Math.max(60, etaSeconds); // Minimum 1 minute

  } catch (error) {
    console.log('[nearestDriverService.js] ❌ Erreur calculateETA:', error.message);
    return 300; // 5 minutes par défaut en cas d'erreur
  }
};

// ============================================================================
// ASSIGN BEST DRIVER
// ============================================================================

/**
 * Assigne la meilleure conductrice disponible à une course
 * @param {ObjectId} rideId - ID de la course
 * @returns {Promise<Object>} - Objet avec driver assigné et ride
 */
exports.assignBestDriver = async (rideId) => {
  console.log('[nearestDriverService.js] assignBestDriver() appelé, rideId:', rideId);

  try {
    // Récupérer la course
    const ride = await Ride.findById(rideId).populate('user');

    if (!ride) {
      throw new Error('Course non trouvée');
    }

    console.log('[nearestDriverService.js] Recherche de conductrice pour:', ride.rideNumber);

    // Trouver les conductrices les plus proches
    const nearbyDrivers = await exports.findNearestDrivers(
      ride.pickup.coordinates.coordinates,
      config.DEFAULT_SEARCH_RADIUS,
      ride.serviceType,
      1 // On ne prend que la meilleure
    );

    if (nearbyDrivers.length === 0) {
      console.log('[nearestDriverService.js] ❌ Aucune conductrice disponible');

      // Mettre à jour le statut de la course
      ride.status = 'no_driver';
      await ride.save();

      return {
        success: false,
        message: 'Aucune conductrice disponible',
        ride
      };
    }

    // Assigner la meilleure conductrice
    const bestDriver = nearbyDrivers[0];
    const driver = await Driver.findById(bestDriver._id);

    if (!driver) {
      throw new Error('Conductrice non trouvée');
    }

    // Vérifier que la conductrice est toujours disponible
    if (!driver.isAvailable || driver.currentRide) {
      console.log('[nearestDriverService.js] ⚠ Conductrice plus disponible');
      return exports.assignBestDriver(rideId); // Essayer avec la suivante
    }

    // Assigner la conductrice
    driver.isAvailable = false;
    driver.currentRide = ride._id;
    await driver.save();

    // Mettre à jour la course
    ride.driver = driver._id;
    ride.status = 'driver_assigned';
    ride.timestamps.driverAssigned = new Date();
    await ride.save();

    console.log('[nearestDriverService.js] ✓ Conductrice assignée:', driver.user?.firstName);
    console.log('[nearestDriverService.js] ETA:', bestDriver.eta, 'secondes');

    return {
      success: true,
      message: 'Conductrice assignée',
      driver: {
        id: driver._id,
        name: driver.user?.firstName,
        avatar: driver.user?.avatar,
        rating: driver.stats.averageRating,
        vehicle: driver.vehicle,
        distance: bestDriver.distance,
        eta: bestDriver.eta
      },
      ride
    };

  } catch (error) {
    console.log('[nearestDriverService.js] ❌ Erreur assignBestDriver:', error.message);
    throw error;
  }
};

// ============================================================================
// NOTIFY NEARBY DRIVERS
// ============================================================================

/**
 * Notifie les conductrices à proximité d'une nouvelle demande
 * @param {ObjectId} rideId - ID de la course
 * @param {Array} coordinates - [longitude, latitude]
 * @param {number} radius - Rayon de notification en mètres
 * @returns {Promise<number>} - Nombre de conductrices notifiées
 */
exports.notifyNearbyDrivers = async (rideId, coordinates, radius = config.NEARBY_NOTIFICATION_RADIUS) => {
  console.log('[nearestDriverService.js] notifyNearbyDrivers() appelé');
  console.log('[nearestDriverService.js] Rayon de notification:', radius, 'mètres');

  try {
    // Récupérer la course
    const ride = await Ride.findById(rideId)
      .populate('user', 'firstName lastName avatar');

    if (!ride) {
      throw new Error('Course non trouvée');
    }

    // Trouver les conductrices à proximité
    const nearbyDrivers = await exports.findNearestDrivers(
      coordinates,
      radius,
      ride.serviceType,
      20 // Notifier jusqu'à 20 conductrices
    );

    if (nearbyDrivers.length === 0) {
      console.log('[nearestDriverService.js] ⚠ Aucune conductrice à proximité');
      return 0;
    }

    console.log('[nearestDriverService.js] Notifiant:', nearbyDrivers.length, 'conductrices');

    // Envoyer les notifications via Socket.io
    let notifiedCount = 0;

    for (const driverData of nearbyDrivers) {
      try {
        // Émettre l'événement socket pour la conductrice
        if (io) {
          io.to(`driver:${driverData._id}`).emit('new_ride_request', {
            rideId: ride._id,
            rideNumber: ride.rideNumber,
            pickup: {
              address: ride.pickup.address,
              coordinates: ride.pickup.coordinates.coordinates
            },
            dropoff: {
              address: ride.dropoff.address,
              coordinates: ride.dropoff.coordinates.coordinates
            },
            user: {
              name: ride.user.firstName,
              avatar: ride.user.avatar,
              rating: ride.user.stats?.averageRating
            },
            serviceType: ride.serviceType,
            estimatedFare: ride.pricing.estimatedFare,
            distance: driverData.distance,
            eta: driverData.eta,
            timestamp: new Date()
          });

          notifiedCount++;
          console.log('[nearestDriverService.js] ✓ Notifiée:', driverData._id);
        }
      } catch (err) {
        console.log('[nearestDriverService.js] ⚠ Erreur notification:', err.message);
      }
    }

    console.log('[nearestDriverService.js] Conductrices notifiées:', notifiedCount);
    return notifiedCount;

  } catch (error) {
    console.log('[nearestDriverService.js] ❌ Erreur notifyNearbyDrivers:', error.message);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcule la distance entre deux points GPS (Haversine)
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} - Distance en mètres
 */
function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calcule un score pour la conductrice (distance + note)
 * @param {Object} driver - Objet conductrice
 * @param {number} distance - Distance en mètres
 * @returns {number} - Score de sélection
 */
function calculateDriverScore(driver, distance) {
  // Score basé sur: note (50%) + distance (50%)
  const maxDistance = 15000; // 15km max
  const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
  const ratingScore = (driver.stats?.averageRating || 5) / 5 * 100;

  const score = (ratingScore * 0.5) + (distanceScore * 0.5);

  return score;
}

console.log('[nearestDriverService.js] ✅ Service exporté');
console.log('[nearestDriverService.js] Fonctions: findNearestDrivers, calculateETA, assignBestDriver, notifyNearbyDrivers');
