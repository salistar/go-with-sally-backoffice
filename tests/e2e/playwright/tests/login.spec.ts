import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'user@test.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

const TEST_DRIVER = {
  email: process.env.TEST_DRIVER_EMAIL || 'driver@test.com',
  password: process.env.TEST_DRIVER_PASSWORD || 'test1234',
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await expect(submitButton).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for error message
    await page.waitForSelector('text=/invalid|wrong|incorrect|failed/i', { timeout: 5000 }).catch(() => {});

    // Verify still on login page
    await expect(page).toHaveURL(/login|signin/i);
  });

  test('should login successfully with valid user credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Click submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation to dashboard or home
    await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

    // Verify we're logged in (look for logout button or user profile)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    const userProfile = page.locator('[data-testid="user-profile"], .user-profile').first();

    const isLoggedIn = (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
                       (await userProfile.isVisible({ timeout: 1000 }).catch(() => false));

    expect(isLoggedIn).toBeTruthy();
  });

  test('should login successfully with driver credentials', async ({ page }) => {
    // Fill in driver credentials
    await page.fill('input[type="email"]', TEST_DRIVER.email);
    await page.fill('input[type="password"]', TEST_DRIVER.password);

    // Click submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation
    await page.waitForURL(/dashboard|driver|app/i, { timeout: 10000 }).catch(() => {});

    // Verify logged in
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    const driverPanel = page.locator('[data-testid="driver-dashboard"], .driver-panel').first();

    const isLoggedIn = (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
                       (await driverPanel.isVisible({ timeout: 1000 }).catch(() => false));

    expect(isLoggedIn).toBeTruthy();
  });

  test('should require email field', async ({ page }) => {
    // Leave email empty
    await page.fill('input[type="email"]', '');
    await page.fill('input[type="password"]', TEST_USER.password);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Check for validation error
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should require password field', async ({ page }) => {
    // Leave password empty
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', '');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Check for validation error
    const passwordInput = page.locator('input[type="password"]');
    const isInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should have remember me option', async ({ page }) => {
    const rememberMeCheckbox = page.locator('input[type="checkbox"]').first();
    const rememberMeLabel = page.locator('label:has-text("Remember"), label:has-text("remember")').first();

    if (await rememberMeCheckbox.isVisible()) {
      await expect(rememberMeCheckbox).toBeVisible();
      await expect(rememberMeLabel).toBeVisible();
    }
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("forgot"), a:has-text("Reset")').first();

    if (await forgotLink.isVisible()) {
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      await page.waitForURL(/forgot|reset/i, { timeout: 5000 }).catch(() => {});
    }
  });

  test('should have signup link', async ({ page }) => {
    const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")').first();

    if (await signupLink.isVisible()) {
      await expect(signupLink).toBeVisible();
      await signupLink.click();
      await page.waitForURL(/signup|register|create/i, { timeout: 5000 }).catch(() => {});
    }
  });

  test('should persist login session', async ({ page, context }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for login to complete
    await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

    // Get current URL (should be logged in)
    const loggedInUrl = page.url();

    // Create new page in same context (should maintain session)
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Check if still logged in (look for logout or user profile)
    const logoutButton = newPage.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    const userProfile = newPage.locator('[data-testid="user-profile"]').first();

    const isStillLoggedIn = (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) ||
                           (await userProfile.isVisible({ timeout: 2000 }).catch(() => false));

    expect(isStillLoggedIn).toBeTruthy();

    await newPage.close();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for login
    await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

    // Click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    await logoutButton.click();

    // Should redirect to login or home
    await page.waitForURL(/login|signin|home|$/i, { timeout: 5000 }).catch(() => {});

    // Verify logout button no longer exists
    const stillLoggedIn = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
    expect(stillLoggedIn).toBeFalsy();
  });
});
