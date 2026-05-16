/**
 * GoWithSally Authentication Service Tests
 * Tests JWT token generation, validation, and refresh flow
 *
 * Test Scenarios:
 *   - JWT token creation and validation
 *   - Token expiration and refresh
 *   - Invalid/malformed tokens
 *   - User context in tokens
 *
 * Logging:
 *   All test operations logged for debugging
 */

const { expect } = require('chai');
const jwt = require('jsonwebtoken');

/**
 * Mock Authentication Service
 * In production, import the actual service
 */
const AuthService = {
  generateToken: function (userId, expiresIn = '7d') {
    console.log(`[TEST] Generating token for user ${userId}`);

    if (!userId) {
      throw new Error('User ID is required');
    }

    const secret = process.env.JWT_SECRET || 'test-secret';

    return jwt.sign(
      {
        userId,
        iat: Math.floor(Date.now() / 1000),
      },
      secret,
      { expiresIn }
    );
  },

  generateRefreshToken: function (userId, expiresIn = '30d') {
    console.log(`[TEST] Generating refresh token for user ${userId}`);

    if (!userId) {
      throw new Error('User ID is required');
    }

    const secret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

    return jwt.sign(
      {
        userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      },
      secret,
      { expiresIn }
    );
  },

  verifyToken: function (token) {
    console.log('[TEST] Verifying token');

    if (!token) {
      throw new Error('Token is required');
    }

    const secret = process.env.JWT_SECRET || 'test-secret';

    try {
      const decoded = jwt.verify(token, secret);
      console.log(`[TEST] Token verified for user ${decoded.userId}`);
      return decoded;
    } catch (error) {
      console.log(`[TEST] Token verification failed: ${error.message}`);
      throw new Error('Invalid token');
    }
  },

  verifyRefreshToken: function (token) {
    console.log('[TEST] Verifying refresh token');

    if (!token) {
      throw new Error('Refresh token is required');
    }

    const secret = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

    try {
      const decoded = jwt.verify(token, secret);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      console.log(`[TEST] Refresh token verified for user ${decoded.userId}`);
      return decoded;
    } catch (error) {
      console.log(`[TEST] Refresh token verification failed: ${error.message}`);
      throw new Error('Invalid refresh token');
    }
  },
};

/**
 * Test Suite
 */
describe('Authentication Service Tests', function () {
  this.timeout(5000);

  describe('JWT Token Generation', function () {
    it('should generate a valid JWT token', function () {
      console.log('[TEST] Running: generate valid JWT token');

      const userId = 'user_123';
      const token = AuthService.generateToken(userId);

      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.lengthOf(3); // JWT has 3 parts

      console.log('[TEST] ✓ Valid JWT token generated');
    });

    it('should throw error if user ID is missing', function () {
      console.log('[TEST] Running: throw error if user ID missing');

      expect(() => {
        AuthService.generateToken(null);
      }).to.throw('User ID is required');

      console.log('[TEST] ✓ Correctly threw error for missing user ID');
    });

    it('should include user ID in token payload', function () {
      console.log('[TEST] Running: token includes user ID in payload');

      const userId = 'user_456';
      const token = AuthService.generateToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.userId).to.equal(userId);
      expect(decoded).to.have.property('iat'); // Issued at time

      console.log('[TEST] ✓ Token payload contains correct user ID');
    });
  });

  describe('Token Verification', function () {
    it('should verify a valid token', function () {
      console.log('[TEST] Running: verify valid token');

      const userId = 'user_789';
      const token = AuthService.generateToken(userId);
      const decoded = AuthService.verifyToken(token);

      expect(decoded.userId).to.equal(userId);

      console.log('[TEST] ✓ Valid token verified successfully');
    });

    it('should throw error for invalid token', function () {
      console.log('[TEST] Running: throw error for invalid token');

      const invalidToken = 'invalid.token.here';

      expect(() => {
        AuthService.verifyToken(invalidToken);
      }).to.throw();

      console.log('[TEST] ✓ Correctly threw error for invalid token');
    });

    it('should throw error if token is missing', function () {
      console.log('[TEST] Running: throw error if token missing');

      expect(() => {
        AuthService.verifyToken(null);
      }).to.throw('Token is required');

      console.log('[TEST] ✓ Correctly threw error for missing token');
    });
  });

  describe('Refresh Token Flow', function () {
    it('should generate refresh token', function () {
      console.log('[TEST] Running: generate refresh token');

      const userId = 'user_refresh_1';
      const refreshToken = AuthService.generateRefreshToken(userId);

      expect(refreshToken).to.be.a('string');

      const decoded = jwt.decode(refreshToken);
      expect(decoded.type).to.equal('refresh');
      expect(decoded.userId).to.equal(userId);

      console.log('[TEST] ✓ Refresh token generated with correct type');
    });

    it('should verify refresh token', function () {
      console.log('[TEST] Running: verify refresh token');

      const userId = 'user_refresh_2';
      const refreshToken = AuthService.generateRefreshToken(userId);
      const decoded = AuthService.verifyRefreshToken(refreshToken);

      expect(decoded.userId).to.equal(userId);
      expect(decoded.type).to.equal('refresh');

      console.log('[TEST] ✓ Refresh token verified successfully');
    });

    it('should reject non-refresh tokens as refresh tokens', function () {
      console.log('[TEST] Running: reject non-refresh token as refresh token');

      const userId = 'user_refresh_3';
      const accessToken = AuthService.generateToken(userId);

      expect(() => {
        AuthService.verifyRefreshToken(accessToken);
      }).to.throw('Invalid token type');

      console.log('[TEST] ✓ Correctly rejected non-refresh token');
    });
  });

  describe('Token Expiration', function () {
    it('should create token with custom expiration', function () {
      console.log('[TEST] Running: token with custom expiration');

      const userId = 'user_expiry';
      const token = AuthService.generateToken(userId, '1h');

      const decoded = jwt.decode(token);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Check that expiration is approximately 1 hour from now
      const timeDiff = expiresAt - now;
      expect(timeDiff).to.be.greaterThan(oneHour - 5000); // 5 second tolerance
      expect(timeDiff).to.be.lessThan(oneHour + 5000);

      console.log('[TEST] ✓ Token expiration set correctly');
    });
  });

  describe('Security Scenarios', function () {
    it('should not verify token signed with different secret', function () {
      console.log('[TEST] Running: verify token with different secret');

      const userId = 'user_security';
      const token = AuthService.generateToken(userId);

      // Create a token with different secret
      const maliciousToken = jwt.sign({ userId: 'hacker' }, 'different-secret');

      expect(() => {
        AuthService.verifyToken(maliciousToken);
      }).to.throw();

      console.log('[TEST] ✓ Token with different secret rejected');
    });

    it('should validate token structure', function () {
      console.log('[TEST] Running: validate token structure');

      const token = 'not.a.real.jwt.token';

      expect(() => {
        AuthService.verifyToken(token);
      }).to.throw();

      console.log('[TEST] ✓ Malformed token rejected');
    });
  });
});
