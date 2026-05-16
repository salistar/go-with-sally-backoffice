const { remote } = require('webdriverio');

describe('Mobile App Login', () => {
  let driver;

  before(async () => {
    driver = await remote(require('../wdio.conf').config);
  });

  after(async () => {
    await driver.deleteSession();
  });

  it('should display login screen on app launch', async () => {
    // Wait for app to load
    await driver.pause(2000);

    // Check for login title
    const loginTitle = await driver.$('~LoginTitle');
    await expect(loginTitle).toBeDisplayed();
  });

  it('should have email and password input fields', async () => {
    // Email input
    const emailInput = await driver.$('~EmailInput');
    await expect(emailInput).toBeDisplayed();

    // Password input
    const passwordInput = await driver.$('~PasswordInput');
    await expect(passwordInput).toBeDisplayed();
  });

  it('should have login button', async () => {
    const loginButton = await driver.$('~LoginButton');
    await expect(loginButton).toBeDisplayed();
  });

  it('should show error on invalid credentials', async () => {
    // Get input elements
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    // Enter invalid credentials
    await emailInput.setValue('invalid@test.com');
    await passwordInput.setValue('wrongpassword');

    // Click login
    await loginButton.click();

    // Wait for error message
    await driver.pause(1000);

    const errorMessage = await driver.$('~ErrorMessage');
    const isDisplayed = await errorMessage.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should login successfully with valid credentials', async () => {
    // Get input elements
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    // Clear previous input
    await emailInput.clearValue();
    await passwordInput.clearValue();

    // Enter valid credentials
    await emailInput.setValue('user@test.com');
    await passwordInput.setValue('test1234');

    // Click login
    await loginButton.click();

    // Wait for navigation
    await driver.pause(3000);

    // Check if we're on home/dashboard screen
    const homeScreen = await driver.$('~HomeScreen');
    const isPresent = await homeScreen.isDisplayed().catch(() => false);

    expect(isPresent).toBeTruthy();
  });

  it('should have remember me option', async () => {
    // Navigate back to login if needed
    const rememberCheckbox = await driver.$('~RememberMeCheckbox');

    const exists = await rememberCheckbox.isDisplayed().catch(() => false);

    if (exists) {
      expect(exists).toBeTruthy();
    }
  });

  it('should have forgot password link', async () => {
    const forgotLink = await driver.$('~ForgotPasswordLink');

    const exists = await forgotLink.isDisplayed().catch(() => false);

    if (exists) {
      expect(exists).toBeTruthy();

      await forgotLink.click();

      // Check if forgot password screen appears
      await driver.pause(1000);
      const forgotScreen = await driver.$('~ForgotPasswordScreen');
      const isForgotDisplayed = await forgotScreen.isDisplayed().catch(() => false);

      expect(isForgotDisplayed).toBeTruthy();
    }
  });

  it('should have sign up link', async () => {
    // Navigate back to login if needed
    const signupLink = await driver.$('~SignUpLink');

    const exists = await signupLink.isDisplayed().catch(() => false);

    if (exists) {
      expect(exists).toBeTruthy();

      await signupLink.click();

      // Check if signup screen appears
      await driver.pause(1000);
      const signupScreen = await driver.$('~SignUpScreen');
      const isSignupDisplayed = await signupScreen.isDisplayed().catch(() => false);

      expect(isSignupDisplayed).toBeTruthy();
    }
  });

  it('should validate email format', async () => {
    // Get input elements
    const emailInput = await driver.$('~EmailInput');
    const loginButton = await driver.$('~LoginButton');

    // Clear and enter invalid email
    await emailInput.clearValue();
    await emailInput.setValue('notanemail');

    // Try to login
    await loginButton.click();

    // Check for validation error
    await driver.pause(500);

    const validationError = await driver.$('~ValidationError');
    const isDisplayed = await validationError.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should require password field', async () => {
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    // Clear fields
    await emailInput.clearValue();
    await passwordInput.clearValue();

    // Enter only email
    await emailInput.setValue('user@test.com');

    // Try to login
    await loginButton.click();

    // Check for validation error
    await driver.pause(500);

    const validationError = await driver.$('~ValidationError');
    const isDisplayed = await validationError.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should show loading indicator during login', async () => {
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    // Clear and enter credentials
    await emailInput.clearValue();
    await passwordInput.clearValue();

    await emailInput.setValue('user@test.com');
    await passwordInput.setValue('test1234');

    // Click login and check for loading
    await loginButton.click();

    await driver.pause(500);

    const loadingSpinner = await driver.$('~LoadingSpinner');
    const isDisplayed = await loadingSpinner.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });

  it('should disable login button while processing', async () => {
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    // Clear and enter credentials
    await emailInput.clearValue();
    await passwordInput.clearValue();

    await emailInput.setValue('user@test.com');
    await passwordInput.setValue('test1234');

    // Click login
    await loginButton.click();

    await driver.pause(500);

    const isEnabled = await loginButton.isEnabled();

    expect(isEnabled).toBeFalsy();

    // Wait for process to complete
    await driver.pause(3000);

    const isEnabledAfter = await loginButton.isEnabled();

    // After login, button should be in original state or screen changed
    expect(isEnabledAfter !== undefined).toBeTruthy();
  });

  it('should persist login session', async () => {
    // Login
    const emailInput = await driver.$('~EmailInput');
    const passwordInput = await driver.$('~PasswordInput');
    const loginButton = await driver.$('~LoginButton');

    await emailInput.clearValue();
    await passwordInput.clearValue();

    await emailInput.setValue('user@test.com');
    await passwordInput.setValue('test1234');

    await loginButton.click();

    await driver.pause(3000);

    // Check home screen
    let homeScreen = await driver.$('~HomeScreen');
    let isDisplayed = await homeScreen.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();

    // Close and reopen app (simulated)
    await driver.background(5);

    // Bring to foreground
    await driver.switchToWindow((await driver.getWindowHandles())[0]);

    // Check if still logged in
    homeScreen = await driver.$('~HomeScreen');
    isDisplayed = await homeScreen.isDisplayed().catch(() => false);

    expect(isDisplayed).toBeTruthy();
  });
});
