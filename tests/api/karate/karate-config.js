function() {
  var env = karate.env;
  if (!env) {
    env = 'dev';
  }

  var config = {
    apiUrl: 'http://localhost:5000/api',
    timeout: 5000,

    // Test credentials for comprehensive testing
    testUser: {
      email: 'sara.user@gmail.com',
      password: 'User@2024'
    },

    testDriver: {
      email: 'fatima.driver@gmail.com',
      password: 'Driver@2024'
    },

    testAdmin: {
      email: 'admin@gowithsally.ma',
      password: 'Admin@2024'
    },

    // Helper function to generate unique email
    generateEmail: function(prefix) {
      return prefix + '_' + new Date().getTime() + '@test.com';
    },

    // Helper function to generate phone number
    generatePhone: function() {
      return '+212' + Math.floor(Math.random() * 9000000000 + 1000000000);
    },

    // Common test data
    testRideData: {
      pickupLocation: {
        latitude: 33.9716,
        longitude: -6.8498,
        address: 'Place de la Republique, Casablanca, Morocco'
      },
      dropoffLocation: {
        latitude: 33.5731,
        longitude: -7.5898,
        address: 'Marrakech Medina, Marrakech, Morocco'
      }
    },

    testVehicleData: {
      make: 'Toyota',
      model: 'Prius',
      year: 2022,
      licensePlate: 'ABC123',
      color: 'Silver',
      capacity: 4
    },

    // Common expected response fields
    userFields: ['_id', 'firstName', 'lastName', 'email', 'phone', 'role', 'status'],
    rideFields: ['_id', 'passengerId', 'driverId', 'pickupLocation', 'dropoffLocation', 'status', 'fare', 'createdAt']
  };

  // Environment-specific configuration
  if (env == 'dev') {
    config.apiUrl = 'http://localhost:5000/api';
  } else if (env == 'staging') {
    config.apiUrl = 'https://staging-api.gowithsally.ma/api';
  } else if (env == 'prod') {
    config.apiUrl = 'https://api.gowithsally.ma/api';
  }

  // Configure Karate logging and HTTP settings
  karate.configure('logLevel', 'info');
  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 10000);

  return config;
}
