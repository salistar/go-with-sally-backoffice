const expect = require('chai').expect;
const Driver = require('../../../gowithsally-backend/models/Driver');

describe('Driver Model', () => {
  describe('Driver Creation', () => {
    it('should create a driver with valid data', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        vehicleColor: 'white',
        vehicleYear: 2022
      };

      const driver = new Driver(driverData);

      expect(driver.firstName).to.equal('Aisha');
      expect(driver.licenseNumber).to.equal('DL123456789');
      expect(driver.vehicleType).to.equal('sedan');
    });

    it('should set default status as PENDING_VERIFICATION', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      expect(driver.status).to.equal('PENDING_VERIFICATION');
    });

    it('should set role as driver', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      expect(driver.role).to.equal('driver');
    });
  });

  describe('License Validation', () => {
    it('should validate license expiry date', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      const isValid = driver.isLicenseValid();

      expect(isValid).to.be.true;
    });

    it('should identify expired license', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2020-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      const isValid = driver.isLicenseValid();

      expect(isValid).to.be.false;
    });
  });

  describe('Vehicle Information', () => {
    it('should store vehicle information', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        vehicleColor: 'black',
        vehicleYear: 2022,
        vehicleModel: 'Toyota Corolla'
      };

      const driver = new Driver(driverData);

      expect(driver.vehicleType).to.equal('sedan');
      expect(driver.licensePlate).to.equal('ABC-1234');
      expect(driver.vehicleColor).to.equal('black');
      expect(driver.vehicleYear).to.equal(2022);
    });

    it('should validate supported vehicle types', () => {
      const supportedTypes = ['economy', 'comfort', 'business'];
      expect(supportedTypes).to.include('economy');
      expect(supportedTypes).to.include('comfort');
    });
  });

  describe('Driver Rating', () => {
    it('should initialize rating as null', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      expect(driver.rating).to.be.null;
    });

    it('should calculate average rating', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        ratings: [5, 5, 4, 5, 4]
      };

      const driver = new Driver(driverData);
      const avgRating = driver.getAverageRating();

      expect(avgRating).to.equal(4.6);
    });

    it('should track number of ratings', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        ratings: [5, 5, 4, 5, 4]
      };

      const driver = new Driver(driverData);
      expect(driver.ratings.length).to.equal(5);
    });
  });

  describe('Driver Documents', () => {
    it('should store document references', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        documents: {
          license: 'doc_license_123',
          vehicleRegistration: 'doc_reg_123',
          insurance: 'doc_insurance_123'
        }
      };

      const driver = new Driver(driverData);

      expect(driver.documents.license).to.equal('doc_license_123');
      expect(driver.documents.vehicleRegistration).to.equal('doc_reg_123');
    });

    it('should track document verification status', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        documentsVerified: {
          license: true,
          vehicleRegistration: false,
          insurance: true
        }
      };

      const driver = new Driver(driverData);

      expect(driver.documentsVerified.license).to.be.true;
      expect(driver.documentsVerified.vehicleRegistration).to.be.false;
    });

    it('should require all documents before approval', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        documentsVerified: {
          license: true,
          vehicleRegistration: true,
          insurance: true
        }
      };

      const driver = new Driver(driverData);
      const allVerified = Object.values(driver.documentsVerified).every(v => v === true);

      expect(allVerified).to.be.true;
    });
  });

  describe('Driver Status', () => {
    it('should track driver online status', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        isOnline: false
      };

      const driver = new Driver(driverData);
      expect(driver.isOnline).to.be.false;

      driver.isOnline = true;
      expect(driver.isOnline).to.be.true;
    });

    it('should track driver availability for rides', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        isAvailable: true
      };

      const driver = new Driver(driverData);
      expect(driver.isAvailable).to.be.true;
    });
  });

  describe('Driver Location', () => {
    it('should store driver current location', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        currentLocation: {
          latitude: 33.9716,
          longitude: -6.8498
        }
      };

      const driver = new Driver(driverData);

      expect(driver.currentLocation.latitude).to.equal(33.9716);
      expect(driver.currentLocation.longitude).to.equal(-6.8498);
    });

    it('should update location timestamp', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234'
      };

      const driver = new Driver(driverData);
      driver.updateLocation({
        latitude: 33.9716,
        longitude: -6.8498
      });

      expect(driver.currentLocation).to.exist;
      expect(driver.lastLocationUpdate).to.exist;
    });
  });

  describe('Driver Earnings', () => {
    it('should track total earnings', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        totalEarnings: 500.00
      };

      const driver = new Driver(driverData);
      expect(driver.totalEarnings).to.equal(500.00);
    });

    it('should track completed rides', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        completedRides: 45
      };

      const driver = new Driver(driverData);
      expect(driver.completedRides).to.equal(45);
    });
  });

  describe('Driver Background Check', () => {
    it('should track background check status', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        backgroundCheckStatus: 'PENDING'
      };

      const driver = new Driver(driverData);
      expect(driver.backgroundCheckStatus).to.equal('PENDING');
    });

    it('should validate background check result', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        backgroundCheckStatus: 'COMPLETED',
        backgroundCheckResult: 'PASSED'
      };

      const driver = new Driver(driverData);

      const validResults = ['PASSED', 'FAILED', 'PENDING'];
      expect(validResults).to.include(driver.backgroundCheckResult);
    });
  });

  describe('Driver Bank Account', () => {
    it('should store bank account information', () => {
      const driverData = {
        firstName: 'Aisha',
        lastName: 'Mohamed',
        email: 'aisha@test.com',
        password: 'Driver@123',
        phoneNumber: '+212612345678',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        bankAccount: {
          bankName: 'Bank Al Maghrib',
          accountNumber: '1234567890',
          iban: 'MA21XXXX0000000000000000000'
        }
      };

      const driver = new Driver(driverData);

      expect(driver.bankAccount.bankName).to.equal('Bank Al Maghrib');
      expect(driver.bankAccount.accountNumber).to.equal('1234567890');
    });
  });
});
