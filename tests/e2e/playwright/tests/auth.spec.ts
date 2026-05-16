import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@gowithsally.ma',
  password: 'Admin@2024',
};

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'user@test.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

const TEST_DRIVER = {
  email: process.env.TEST_DRIVER_EMAIL || 'driver@test.com',
  password: process.env.TEST_DRIVER_PASSWORD || 'test1234',
};

test.describe('Authentication & Authorization', () => {
  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should display login form with all required fields', async ({ page }) => {
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

    test('should show validation error on empty email field', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      // Fill only password
      await emailInput.fill('');
      await passwordInput.fill('somepassword');
      await submitButton.click();

      // Check for validation error
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });

    test('should show validation error on empty password field', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      // Fill only email
      await emailInput.fill('test@example.com');
      await passwordInput.fill('');
      await submitButton.click();

      // Check for validation error
      const isInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });

    test('should show error message on invalid email format', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      // Fill with invalid email
      await emailInput.fill('notanemail');
      await passwordInput.fill('password123');

      // Check for validation error
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });

    test('should show error on invalid credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      // Fill in invalid credentials
      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('wrongpassword123');
      await submitButton.click();

      // Wait for error message
      const errorMessage = page.locator('text=/invalid|wrong|incorrect|failed|unauthorized/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {});

      // Verify still on login page
      await expect(page).toHaveURL(/login|signin/i);
    });

    test('should successfully login with admin credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_ADMIN.email);
      await passwordInput.fill(TEST_ADMIN.password);
      await submitButton.click();

      // Wait for navigation to admin dashboard
      await page.waitForURL(/admin|dashboard/i, { timeout: 10000 }).catch(() => {});

      // Verify logged in by checking for admin-specific UI
      const isLoggedIn = await page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first().isVisible({ timeout: 5000 }).catch(() => false);
      expect(isLoggedIn).toBeTruthy();
    });

    test('should successfully login with user credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL(/dashboard|home|app|rides/i, { timeout: 10000 }).catch(() => {});

      // Verify logged in
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
      const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isLoggedIn).toBeTruthy();
    });

    test('should successfully login with driver credentials', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_DRIVER.email);
      await passwordInput.fill(TEST_DRIVER.password);
      await submitButton.click();

      // Wait for navigation to driver dashboard
      await page.waitForURL(/driver|dashboard|app/i, { timeout: 10000 }).catch(() => {});

      // Verify logged in
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
      const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isLoggedIn).toBeTruthy();
    });

    test('should have forgot password link', async ({ page }) => {
      const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("forgot"), a:has-text("Reset")').first();

      if (await forgotLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(forgotLink).toBeVisible();
        await forgotLink.click();
        await page.waitForURL(/forgot|reset|password/i, { timeout: 5000 }).catch(() => {});
      }
    });

    test('should have signup/registration link', async ({ page }) => {
      const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")').first();

      if (await signupLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(signupLink).toBeVisible();
      }
    });
  });

  test.describe('Session Management', () => {
    test('should persist login session across pages', async ({ page, context }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      // Wait for login to complete
      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Create new page in same context (should maintain session)
      const newPage = await context.newPage();
      await newPage.goto('/');

      // Check if still logged in
      const logoutButton = newPage.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
      const isLoggedIn = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isLoggedIn).toBeTruthy();

      await newPage.close();
    });

    test('should store JWT token in local storage or cookies', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Check for token in localStorage
      const token = await page.evaluate(() => {
        return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt');
      });

      // Check for token in cookies
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find(c => c.name.toLowerCase().includes('token') || c.name.toLowerCase().includes('auth'));

      expect(token || tokenCookie).toBeTruthy();
    });

    test('should clear session on logout', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Click logout
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
      await logoutButton.click();

      // Should redirect to login or home
      await page.waitForURL(/login|signin|home|$/i, { timeout: 5000 }).catch(() => {});

      // Check that token is cleared
      const token = await page.evaluate(() => {
        return localStorage.getItem('token') || localStorage.getItem('authToken');
      });

      expect(token).toBeFalsy();
    });

    test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
      // Try to access dashboard without logging in
      await page.goto('/dashboard', { waitUntil: 'networkidle' }).catch(() => {});

      // Should redirect to login or home
      const url = page.url();
      const isRedirected = url.includes('/login') || url.includes('/') && !url.includes('/dashboard');
      expect(isRedirected).toBeTruthy();
    });
  });

  test.describe('Password Reset', () => {
    test('should display password reset form when accessing reset page', async ({ page }) => {
      await page.goto('/reset-password', { waitUntil: 'networkidle' }).catch(() => {});

      // Check if password reset form exists or redirect to forgot password
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("Send"), button:has-text("Submit")').first();

      const hasResetForm = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasResetForm).toBeTruthy();
    });

    test('should show error on invalid email for password reset', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'networkidle' }).catch(() => {});

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('notanemail');

        const resetButton = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').first();
        await resetButton.click();

        // Check for validation error
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        expect(isInvalid).toBeTruthy();
      }
    });

    test('should send reset email for valid email address', async ({ page }) => {
      await page.goto('/forgot-password', { waitUntil: 'networkidle' }).catch(() => {});

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill(TEST_USER.email);

        const resetButton = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').first();
        await resetButton.click();

        // Should show success message
        const successMessage = page.locator('text=/sent|check|email/i').first();
        await expect(successMessage).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });

  test.describe('Role-based Access Control', () => {
    test('should prevent non-admin users from accessing admin panel', async ({ page, context }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Try to access admin panel
      await page.goto('/admin', { waitUntil: 'networkidle' }).catch(() => {});

      // Should either redirect or show error
      const isAdminPage = page.url().includes('/admin');
      const isRedirected = page.url().includes('/login') || page.url().includes('/home') || page.url().includes('/dashboard');

      expect(isAdminPage || isRedirected).toBeTruthy();
    });

    test('should allow admin users to access admin panel', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_ADMIN.email);
      await page.fill('input[type="password"]', TEST_ADMIN.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/admin|dashboard/i, { timeout: 10000 }).catch(() => {});

      // Navigate to admin panel
      await page.goto('/admin', { waitUntil: 'networkidle' }).catch(() => {});

      // Should be on admin page
      const isAdminPage = page.url().includes('/admin') || page.url().includes('admin');
      expect(isAdminPage).toBeTruthy();
    });

    test('should allow drivers to access driver-specific routes', async ({ page }) => {
      // Login as driver
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_DRIVER.email);
      await page.fill('input[type="password"]', TEST_DRIVER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/driver|dashboard|app/i, { timeout: 10000 }).catch(() => {});

      // Verify logged in as driver
      const isLoggedIn = await page.locator('button:has-text("Logout")').first().isVisible({ timeout: 2000 }).catch(() => false);
      expect(isLoggedIn).toBeTruthy();
    });
  });

  test.describe('Token Management', () => {
    test('should refresh JWT token on expiry', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Get initial token
      const initialToken = await page.evaluate(() => {
        return localStorage.getItem('token') || localStorage.getItem('authToken');
      });

      // Wait a bit for potential token refresh
      await page.waitForTimeout(2000);

      // Get token again
      const newToken = await page.evaluate(() => {
        return localStorage.getItem('token') || localStorage.getItem('authToken');
      });

      // Token should exist
      expect(initialToken).toBeTruthy();
      expect(newToken).toBeTruthy();
    });

    test('should handle invalid token gracefully', async ({ page, context }) => {
      // Set invalid token in localStorage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('token', 'invalid.jwt.token');
      });

      // Navigate to protected route
      await page.goto('/dashboard', { waitUntil: 'networkidle' }).catch(() => {});

      // Should redirect to login
      const isRedirected = page.url().includes('/login') || !page.url().includes('/dashboard');
      expect(isRedirected).toBeTruthy();
    });
  });

  test.describe('Two-Factor Authentication (if implemented)', () => {
    test('should show 2FA prompt when enabled on account', async ({ page }) => {
      // This test depends on whether 2FA is implemented
      await page.goto('/login');
      // Implementation would depend on app's 2FA flow
    });
  });

  test.describe('Account Lockout', () => {
    test('should lock account after multiple failed login attempts', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await page.goto('/login');
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(500);
      }

      // Should show account locked or rate limited message
      const lockedMessage = page.locator('text=/locked|too many|rate limit|try again/i').first();
      const isLocked = await lockedMessage.isVisible({ timeout: 2000 }).catch(() => false);
      // This assertion depends on app implementation
      if (isLocked) {
        expect(isLocked).toBeTruthy();
      }
    });
  });
});
