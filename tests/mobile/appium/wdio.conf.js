exports.config = {
  runner: 'local',
  port: 4723,
  host: 'localhost',
  specs: ['./tests/**/*.test.js'],
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'emulator-5554',
      'appium:app': '/path/to/gowithsally.apk',
      'appium:appPackage': 'com.gowithsally.mobile',
      'appium:appActivity': '.MainActivity',
      'appium:noReset': false,
      'appium:newCommandTimeout': 240
    },
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': 'iPhone 14',
      'appium:app': '/path/to/gowithsally.ipa',
      'appium:bundleId': 'com.gowithsally.mobile',
      'appium:noReset': false,
      'appium:newCommandTimeout': 240
    }
  ],
  logLevel: 'info',
  bail: 0,
  baseUrl: 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
  reporters: ['spec', ['junit', { outputDir: './test-results' }]],

  before: function() {
    const expect = require('chai').expect;
    global.expect = expect;
  },

  onPrepare: function() {
    console.log('Starting Appium tests...');
  }
};
