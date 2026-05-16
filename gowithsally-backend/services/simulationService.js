/**
 * ============================================================================
 * GO WITH SALLY - SIMULATION SERVICE (Backend)
 * ============================================================================
 * Service de simulation pour les modes offline et hybrid
 *
 * @module services/simulationService
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 simulationService.js ▶ Module loaded');

// ============================================================================
// DONNÉES SIMULÉES - CONDUCTRICES CASABLANCA
// ============================================================================

const SIMULATED_DRIVERS = [
  {
    id: 'sim_driver_001',
    firstName: 'Amina',
    lastName: 'El Amrani',
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    phone: '+212600000001',
    rating: 4.9,
    totalRides: 542,
    vehicle: { brand: 'Dacia', model: 'Logan', color: 'Blanc', plateNumber: '12345-A-1' },
    badge: { level: 'premium', icon: '💜' },
    servicesOffered: ['sally_standard', 'sally_confort'],
    baseLocation: { latitude: 33.5731, longitude: -7.5898 },
  },
  {
    id: 'sim_driver_002',
    firstName: 'Fatima',
    lastName: 'Benali',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    phone: '+212600000002',
    rating: 4.8,
    totalRides: 328,
    vehicle: { brand: 'Renault', model: 'Clio', color: 'Gris', plateNumber: '54321-B-2' },
    badge: { level: 'verified', icon: '✅' },
    servicesOffered: ['sally_standard', 'sally_eco'],
    baseLocation: { latitude: 33.5831, longitude: -7.6098 },
  },
  {
    id: 'sim_driver_003',
    firstName: 'Khadija',
    lastName: 'Mansouri',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    phone: '+212600000003',
    rating: 4.95,
    totalRides: 1247,
    vehicle: { brand: 'Mercedes', model: 'Classe C', color: 'Noir', plateNumber: '98765-C-3' },
    badge: { level: 'elite', icon: '👑' },
    servicesOffered: ['sally_standard', 'sally_confort', 'sally_eco'],
    baseLocation: { latitude: 33.5631, longitude: -7.5798 },
  },
  {
    id: 'sim_driver_004',
    firstName: 'Salma',
    lastName: 'Chakir',
    avatar: 'https://randomuser.me/api/portraits/women/55.jpg',
    phone: '+212600000004',
    rating: 4.7,
    totalRides: 156,
    vehicle: { brand: 'Peugeot', model: '208', color: 'Rouge', plateNumber: '11111-D-4' },
    badge: { level: 'basic', icon: '🔵' },
    servicesOffered: ['sally_eco', 'sally_standard'],
    baseLocation: { latitude: 33.5531, longitude: -7.5698 },
  },
  {
    id: 'sim_driver_005',
    firstName: 'Nadia',
    lastName: 'Tahiri',
    avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
    phone: '+212600000005',
    rating: 4.85,
    totalRides: 412,
    vehicle: { brand: 'Toyota', model: 'Yaris', color: 'Bleu', plateNumber: '22222-E-5' },
    badge: { level: 'verified', icon: '✅' },
    servicesOffered: ['sally_standard', 'sally_pool'],
    baseLocation: { latitude: 33.5931, longitude: -7.6198 },
  },
];

// Lieux populaires à Casablanca
const POPULAR_LOCATIONS = [
  { name: 'Morocco Mall', address: 'Corniche, Casablanca', lat: 33.5447, lng: -7.6311 },
  { name: 'Mosquée Hassan II', address: 'Boulevard de la Corniche', lat: 33.6086, lng: -7.6328 },
  { name: 'Twin Center', address: 'Maarif, Casablanca', lat: 33.5883, lng: -7.6192 },
  { name: 'Gare Casa Voyageurs', address: 'Centre-ville', lat: 33.5897, lng: -7.5894 },
  { name: 'Aéroport Mohammed V', address: 'Nouaceur', lat: 33.3675, lng: -7.5898 },
  { name: 'Anfa Place', address: 'Anfa, Casablanca', lat: 33.5978, lng: -7.6481 },
  { name: 'Marina Casablanca', address: 'Corniche', lat: 33.6042, lng: -7.6231 },
  { name: 'Centre Commercial Anfaplace', address: 'Ain Diab', lat: 33.5989, lng: -7.6511 },
];

// ============================================================================
// HELPERS
// ============================================================================

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRideId() {
  return `ride_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

const simulationService = {
  /**
   * Rechercher une conductrice simulée
   */
  async searchDriver(params) {
    const {
      pickupLocation,
      serviceType = 'sally_standard',
      proposedPrice,
      suggestedPrice,
    } = params;
    
    // Filtrer les conductrices compatibles
    const compatibleDrivers = SIMULATED_DRIVERS.filter(
      d => d.servicesOffered.includes(serviceType)
    );
    
    if (compatibleDrivers.length === 0) {
      return {
        success: false,
        error: 'no_drivers_available',
        message: 'Aucune conductrice disponible pour ce service',
      };
    }
    
    // Simuler un délai de recherche
    const searchDelay = randomDelay(2000, 5000);
    await new Promise(resolve => setTimeout(resolve, searchDelay));
    
    // Calculer la probabilité d'acceptation basée sur le prix
    const priceRatio = proposedPrice / suggestedPrice;
    let acceptanceChance = 0.5;
    
    if (priceRatio >= 1.2) acceptanceChance = 0.95;
    else if (priceRatio >= 1.0) acceptanceChance = 0.85;
    else if (priceRatio >= 0.85) acceptanceChance = 0.60;
    else acceptanceChance = 0.30;
    
    // Décider si une conductrice accepte
    const accepted = Math.random() < acceptanceChance;
    
    if (!accepted) {
      return {
        success: false,
        error: 'no_driver_accepted',
        message: 'Aucune conductrice n\'a accepté. Essayez d\'augmenter votre offre.',
        searchDuration: searchDelay,
      };
    }
    
    // Sélectionner une conductrice au hasard
    const driver = compatibleDrivers[Math.floor(Math.random() * compatibleDrivers.length)];
    
    // Calculer l'ETA
    const distance = calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      driver.baseLocation.latitude,
      driver.baseLocation.longitude
    );
    const eta = Math.max(3, Math.round(distance * 3)); // ~20 km/h en ville
    
    // Créer la course simulée
    const ride = {
      id: generateRideId(),
      status: 'driver_assigned',
      driver: {
        ...driver,
        location: {
          latitude: driver.baseLocation.latitude + (Math.random() - 0.5) * 0.01,
          longitude: driver.baseLocation.longitude + (Math.random() - 0.5) * 0.01,
        },
      },
      eta,
      distance: Math.round(distance * 10) / 10,
      price: proposedPrice,
      serviceType,
      acceptedAt: new Date().toISOString(),
      isSimulated: true,
    };
    
    return {
      success: true,
      ride,
      searchDuration: searchDelay,
    };
  },
  
  /**
   * Simuler la progression d'une course
   */
  async progressRide(rideId, currentStatus) {
    const statusFlow = [
      'driver_assigned',
      'driver_arriving',
      'driver_arrived',
      'in_progress',
      'completed',
    ];
    
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) {
      return { success: false, error: 'invalid_status' };
    }
    
    // Simuler un délai
    const delay = randomDelay(1000, 3000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const newStatus = statusFlow[currentIndex + 1];
    
    return {
      success: true,
      rideId,
      previousStatus: currentStatus,
      newStatus,
      updatedAt: new Date().toISOString(),
    };
  },
  
  /**
   * Simuler les positions GPS d'une conductrice
   */
  simulateDriverMovement(fromLocation, toLocation, durationMs, updateCallback) {
    const steps = 20;
    const interval = durationMs / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      const lat = fromLocation.latitude + 
        (toLocation.latitude - fromLocation.latitude) * progress +
        (Math.random() - 0.5) * 0.0005;
      
      const lng = fromLocation.longitude + 
        (toLocation.longitude - fromLocation.longitude) * progress +
        (Math.random() - 0.5) * 0.0005;
      
      updateCallback({
        latitude: lat,
        longitude: lng,
        heading: Math.random() * 360,
        speed: 20 + Math.random() * 30,
        progress,
      });
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);
    
    return () => clearInterval(timer);
  },
  
  /**
   * Générer un historique de courses simulé
   */
  generateRideHistory(count = 10) {
    const rides = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const driver = SIMULATED_DRIVERS[Math.floor(Math.random() * SIMULATED_DRIVERS.length)];
      const pickup = POPULAR_LOCATIONS[Math.floor(Math.random() * POPULAR_LOCATIONS.length)];
      const destination = POPULAR_LOCATIONS[Math.floor(Math.random() * POPULAR_LOCATIONS.length)];
      
      const distance = 2 + Math.random() * 15;
      const duration = Math.round(distance * 3);
      const price = Math.round((10 + distance * 4) / 5) * 5;
      
      rides.push({
        id: `ride_hist_${i}`,
        status: 'completed',
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          avatar: driver.avatar,
          rating: driver.rating,
          vehicle: driver.vehicle,
          badge: driver.badge,
        },
        pickup: {
          name: pickup.name,
          address: pickup.address,
          latitude: pickup.lat,
          longitude: pickup.lng,
        },
        destination: {
          name: destination.name,
          address: destination.address,
          latitude: destination.lat,
          longitude: destination.lng,
        },
        distance: Math.round(distance * 10) / 10,
        duration,
        price,
        serviceType: ['sally_eco', 'sally_standard', 'sally_confort'][Math.floor(Math.random() * 3)],
        paymentMethod: ['cash', 'card'][Math.floor(Math.random() * 2)],
        rating: 4 + Math.random(),
        createdAt: new Date(now - (i + 1) * 24 * 60 * 60 * 1000 * Math.random() * 7).toISOString(),
        completedAt: new Date(now - i * 24 * 60 * 60 * 1000 * Math.random() * 7).toISOString(),
        isSimulated: true,
      });
    }
    
    return rides.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  
  /**
   * Générer des stats conductrice simulées
   */
  generateDriverStats() {
    return {
      totalRides: Math.floor(Math.random() * 100) + 20,
      todayRides: Math.floor(Math.random() * 10) + 1,
      totalEarnings: Math.floor(Math.random() * 5000) + 1000,
      todayEarnings: Math.floor(Math.random() * 500) + 100,
      rating: 4.5 + Math.random() * 0.5,
      acceptanceRate: 0.85 + Math.random() * 0.14,
      onlineHours: Math.round((Math.random() * 8 + 2) * 10) / 10,
      isSimulated: true,
    };
  },
  
  /**
   * Obtenir une conductrice simulée par ID
   */
  getDriver(driverId) {
    return SIMULATED_DRIVERS.find(d => d.id === driverId) || null;
  },
  
  /**
   * Obtenir toutes les conductrices simulées
   */
  getAllDrivers() {
    return SIMULATED_DRIVERS;
  },
  
  /**
   * Obtenir un lieu populaire aléatoire
   */
  getRandomLocation() {
    return POPULAR_LOCATIONS[Math.floor(Math.random() * POPULAR_LOCATIONS.length)];
  },
  
  /**
   * Obtenir tous les lieux populaires
   */
  getAllLocations() {
    return POPULAR_LOCATIONS;
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = simulationService;
module.exports.SIMULATED_DRIVERS = SIMULATED_DRIVERS;
module.exports.POPULAR_LOCATIONS = POPULAR_LOCATIONS;