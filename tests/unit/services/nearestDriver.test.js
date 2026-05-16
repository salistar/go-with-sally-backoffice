const expect = require('chai').expect;
const sinon = require('sinon');
const NearestDriverService = require('../../../gowithsally-backend/services/NearestDriverService');

describe('NearestDriverService', () => {
  let service;

  beforeEach(() => {
    service = new NearestDriverService();
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two coordinates using Haversine formula', () => {
      const loc1 = { latitude: 33.9716, longitude: -6.8498 }; // Casablanca
      const loc2 = { latitude: 33.9731, longitude: -6.8412 }; // Near Casablanca

      const distance = service.calculateDistance(loc1, loc2);

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(0);
      expect(distance).to.be.lessThan(5); // Should be less than 5 km
    });

    it('should return 0 for same coordinates', () => {
      const loc = { latitude: 33.9716, longitude: -6.8498 };
      const distance = service.calculateDistance(loc, loc);

      expect(distance).to.equal(0);
    });

    it('should handle large distances correctly', () => {
      const loc1 = { latitude: 33.9716, longitude: -6.8498 }; // Casablanca
      const loc2 = { latitude: 31.6295, longitude: -7.9811 }; // Agadir

      const distance = service.calculateDistance(loc1, loc2);

      expect(distance).to.be.greaterThan(400);
      expect(distance).to.be.lessThan(500);
    });
  });

  describe('Finding Nearest Drivers', () => {
    it('should return empty array when no drivers available', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5);

      expect(nearest).to.be.an('array');
      expect(nearest).to.have.lengthOf(0);
    });

    it('should find nearest driver', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Driver A',
          currentLocation: { latitude: 33.9731, longitude: -6.8412 }
        },
        {
          id: '2',
          name: 'Driver B',
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5);

      expect(nearest).to.have.length.greaterThan(0);
      expect(nearest[0].id).to.equal('2'); // Driver B is closer
    });

    it('should filter drivers by radius', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Close Driver',
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Far Driver',
          currentLocation: { latitude: 31.6295, longitude: -7.9811 } // Agadir
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5); // 5 km radius

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].id).to.equal('1');
    });

    it('should return drivers sorted by distance', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '3',
          name: 'Driver C',
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        },
        {
          id: '1',
          name: 'Driver A',
          currentLocation: { latitude: 33.9731, longitude: -6.8412 }
        },
        {
          id: '2',
          name: 'Driver B',
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 10);

      // Should be sorted by distance (closest first)
      let previousDistance = 0;
      for (const driver of nearest) {
        const distance = service.calculateDistance(userLocation, driver.currentLocation);
        expect(distance).to.be.greaterThanOrEqual(previousDistance);
        previousDistance = distance;
      }
    });

    it('should respect limit parameter', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        name: `Driver ${i}`,
        currentLocation: {
          latitude: 33.9716 + (i * 0.001),
          longitude: -6.8498 + (i * 0.001)
        }
      }));

      const nearest = service.findNearestDrivers(userLocation, drivers, 10, 3);

      expect(nearest).to.have.lengthOf(3);
    });
  });

  describe('Driver Availability Check', () => {
    it('should exclude offline drivers', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Online Driver',
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Offline Driver',
          isOnline: false,
          isAvailable: false,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5);

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].isOnline).to.be.true;
    });

    it('should exclude busy drivers', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Available Driver',
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Busy Driver',
          isOnline: true,
          isAvailable: false,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5);

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].isAvailable).to.be.true;
    });

    it('should exclude suspended drivers', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Active Driver',
          status: 'VERIFIED',
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Suspended Driver',
          status: 'SUSPENDED',
          isOnline: true,
          isAvailable: false,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5);

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].status).to.equal('VERIFIED');
    });
  });

  describe('Rating Filter', () => {
    it('should filter drivers by minimum rating', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Highly Rated Driver',
          rating: 4.8,
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Low Rated Driver',
          rating: 2.5,
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(userLocation, drivers, 5, null, 4.0);

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].rating).to.be.greaterThanOrEqual(4.0);
    });
  });

  describe('Service Type Filter', () => {
    it('should filter drivers by service type', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Economy Driver',
          serviceTypes: ['economy'],
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Premium Driver',
          serviceTypes: ['business', 'comfort'],
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(
        userLocation,
        drivers,
        5,
        null,
        null,
        'economy'
      );

      expect(nearest).to.have.lengthOf(1);
      expect(nearest[0].serviceTypes).to.include('economy');
    });
  });

  describe('Load Balancing', () => {
    it('should prefer drivers with fewer current rides', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Driver A',
          currentRides: 5,
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        },
        {
          id: '2',
          name: 'Driver B',
          currentRides: 1,
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9700, longitude: -6.8500 }
        }
      ];

      const nearest = service.findNearestDrivers(
        userLocation,
        drivers,
        5,
        null,
        null,
        null,
        true // Enable load balancing
      );

      expect(nearest).to.have.lengthOf(2);
      // Driver B should be prioritized due to lower load
      expect(nearest[0].currentRides).to.be.lessThanOrEqual(nearest[1].currentRides);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large driver lists efficiently', async () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Driver ${i}`,
        isOnline: true,
        isAvailable: true,
        currentLocation: {
          latitude: 33.9716 + (Math.random() - 0.5) * 0.5,
          longitude: -6.8498 + (Math.random() - 0.5) * 0.5
        }
      }));

      const startTime = Date.now();
      const nearest = service.findNearestDrivers(userLocation, drivers, 5, 10);
      const endTime = Date.now();

      expect(nearest).to.have.lengthOf(10);
      expect(endTime - startTime).to.be.lessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Caching', () => {
    it('should cache driver locations for performance', () => {
      const userLocation = { latitude: 33.9716, longitude: -6.8498 };
      const drivers = [
        {
          id: '1',
          name: 'Driver A',
          isOnline: true,
          isAvailable: true,
          currentLocation: { latitude: 33.9720, longitude: -6.8490 }
        }
      ];

      // First call
      service.findNearestDrivers(userLocation, drivers, 5);

      // Second call should use cache
      const cacheHit = service.isCached(userLocation);

      expect(cacheHit).to.be.true;
    });
  });
});
