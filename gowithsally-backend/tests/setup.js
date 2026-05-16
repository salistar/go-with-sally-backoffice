/**
 * GoWithSally Test Setup
 * Initialize mongodb-memory-server for testing environment
 *
 * Features:
 *   - Automatic MongoDB in-memory database
 *   - Jest/Mocha compatible setup
 *   - Automatic cleanup
 *   - Environment configuration
 *
 * Logging:
 *   Setup operations logged to console during test runs
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Setup function - called before tests run
 * Starts in-memory MongoDB instance
 */
async function setupTests() {
  console.log('[TEST SETUP] Starting MongoDB in-memory server...');

  try {
    // Download MongoDB binary if not cached
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();
    console.log(`[TEST SETUP] MongoDB in-memory server started at ${mongoUri}`);

    // Set test environment variables
    process.env.MONGODB_URI = mongoUri;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-12345';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-12345';
    process.env.REDIS_URI = 'redis://localhost:6379/0';

    // Connect mongoose
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('[TEST SETUP] Mongoose connected to test database');

    return mongoServer;
  } catch (error) {
    console.error('[TEST SETUP] Failed to setup tests', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Teardown function - called after tests finish
 * Closes database connection and stops MongoDB
 */
async function teardownTests() {
  console.log('[TEST TEARDOWN] Cleaning up test database...');

  try {
    // Disconnect mongoose
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[TEST TEARDOWN] Mongoose disconnected');
    }

    // Stop MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
      console.log('[TEST TEARDOWN] MongoDB in-memory server stopped');
    }
  } catch (error) {
    console.error('[TEST TEARDOWN] Failed to cleanup tests', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Clear database collections
 * @returns {Promise<void>}
 */
async function clearDatabase() {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    console.log('[TEST] Database cleared');
  } catch (error) {
    console.error('[TEST] Failed to clear database', {
      error: error.message,
    });
  }
}

/**
 * Get test database URI
 * @returns {string} MongoDB URI
 */
function getTestDatabaseUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/gowithsally_test';
}

/**
 * Initialize for mocha/chai
 */
if (global.before) {
  global.before(async function () {
    this.timeout(30000); // Mocha timeout for setup
    await setupTests();
  });

  global.after(async function () {
    this.timeout(30000); // Mocha timeout for teardown
    await teardownTests();
  });

  // Clear database before each test
  global.beforeEach(async function () {
    await clearDatabase();
  });
}

module.exports = {
  setupTests,
  teardownTests,
  clearDatabase,
  getTestDatabaseUri,
};
