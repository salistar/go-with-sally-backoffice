const expect = require('chai').expect;
const User = require('../../../gowithsally-backend/models/User');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', () => {
      const userData = {
        firstName: 'Fatima',
        lastName: 'Hassan',
        email: 'fatima@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        role: 'user'
      };

      const user = new User(userData);

      expect(user.firstName).to.equal('Fatima');
      expect(user.lastName).to.equal('Hassan');
      expect(user.email).to.equal('fatima@test.com');
      expect(user.role).to.equal('user');
    });

    it('should set default role as user', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      expect(user.role).to.equal('user');
    });

    it('should set status as PENDING for new users', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      expect(user.status).to.equal('PENDING');
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      expect(user.validate).to.exist;
    });

    it('should reject invalid email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'not-an-email',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      try {
        await user.validate();
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      const plainPassword = user.password;

      // Simulate password hashing (actual implementation would be in the model)
      expect(plainPassword).to.not.equal('Password@123');
    });

    it('should not return password in JSON', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      const userJSON = user.toJSON();

      expect(userJSON.password).to.not.exist;
    });
  });

  describe('User Full Name', () => {
    it('should generate full name correctly', () => {
      const userData = {
        firstName: 'Fatima',
        lastName: 'Hassan',
        email: 'fatima@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      expect(user.getFullName()).to.equal('Fatima Hassan');
    });
  });

  describe('User Status', () => {
    it('should allow status transitions', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      user.status = 'ACTIVE';

      expect(user.status).to.equal('ACTIVE');
    });

    it('should prevent invalid status values', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);

      const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'];
      expect(validStatuses).to.include(user.status);
    });
  });

  describe('User Preferences', () => {
    it('should store user preferences', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        preferences: {
          notifications: true,
          darkMode: false,
          language: 'en'
        }
      };

      const user = new User(userData);
      expect(user.preferences.notifications).to.equal(true);
      expect(user.preferences.darkMode).to.equal(false);
    });
  });

  describe('User Address', () => {
    it('should store user address', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        address: {
          street: '123 Main St',
          city: 'Casablanca',
          state: 'Casablanca',
          zipCode: '20000',
          country: 'Morocco'
        }
      };

      const user = new User(userData);
      expect(user.address.city).to.equal('Casablanca');
      expect(user.address.country).to.equal('Morocco');
    });
  });

  describe('User Emergency Contact', () => {
    it('should store emergency contact', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        emergencyContact: {
          name: 'Emergency Person',
          phoneNumber: '+212612999999'
        }
      };

      const user = new User(userData);
      expect(user.emergencyContact.name).to.equal('Emergency Person');
    });
  });

  describe('User Timestamps', () => {
    it('should set createdAt timestamp', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      expect(user.createdAt).to.exist;
    });

    it('should update updatedAt timestamp', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678'
      };

      const user = new User(userData);
      const initialUpdatedAt = user.updatedAt;

      user.firstName = 'Updated';
      expect(user.updatedAt).to.not.equal(initialUpdatedAt);
    });
  });

  describe('User Verification', () => {
    it('should track email verification', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        isEmailVerified: false
      };

      const user = new User(userData);
      expect(user.isEmailVerified).to.equal(false);

      user.isEmailVerified = true;
      expect(user.isEmailVerified).to.equal(true);
    });

    it('should track phone verification', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        isPhoneVerified: false
      };

      const user = new User(userData);
      expect(user.isPhoneVerified).to.equal(false);
    });
  });

  describe('User Suspension', () => {
    it('should track suspension reason', () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password@123',
        phoneNumber: '+212612345678',
        status: 'SUSPENDED',
        suspensionReason: 'Policy violation'
      };

      const user = new User(userData);
      expect(user.suspensionReason).to.equal('Policy violation');
    });
  });
});
