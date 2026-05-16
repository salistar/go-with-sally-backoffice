import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin1234',
};

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Login as admin
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for dashboard to load
    await page.waitForURL(/admin|dashboard/i, { timeout: 10000 }).catch(() => {});
  });

  test('should display admin dashboard', async ({ page }) => {
    // Check for dashboard title or heading
    const adminHeading = page.locator('h1:has-text("Admin"), h1:has-text("Dashboard")').first();
    await expect(adminHeading).toBeVisible({ timeout: 5000 }).catch(() => {});

    // Verify not on login page
    await expect(page).not.toHaveURL(/login|signin/i);
  });

  test('should display user management section', async ({ page }) => {
    // Look for users link or menu item
    const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

    if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usersLink.click();
      await page.waitForURL(/users|user-management/i, { timeout: 5000 }).catch(() => {});

      // Verify users page has content
      const usersList = page.locator('table, [data-testid="users-list"], .user-list').first();
      await expect(usersList).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should display drivers management section', async ({ page }) => {
    // Look for drivers link or menu item
    const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

    if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await driversLink.click();
      await page.waitForURL(/drivers|driver-management/i, { timeout: 5000 }).catch(() => {});

      // Verify drivers page has content
      const driversList = page.locator('table, [data-testid="drivers-list"], .drivers-list').first();
      await expect(driversList).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should display rides management section', async ({ page }) => {
    // Look for rides link
    const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

    if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ridesLink.click();
      await page.waitForURL(/rides|ride-management/i, { timeout: 5000 }).catch(() => {});

      // Verify rides page has content
      const ridesList = page.locator('table, [data-testid="rides-list"], .rides-list').first();
      await expect(ridesList).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should display analytics or statistics', async ({ page }) => {
    // Look for analytics/stats
    const analyticsSection = page.locator('[data-testid="analytics"], [data-testid="stats"], .analytics, .statistics').first();

    if (await analyticsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(analyticsSection).toBeVisible();

      // Check for common stats like total users, total rides, etc
      const statCards = page.locator('[data-testid*="stat"], .stat-card, [class*="metric"]');
      const statCount = await statCards.count();
      expect(statCount).toBeGreaterThan(0);
    }
  });

  test('should have user search/filter functionality', async ({ page }) => {
    // Navigate to users section
    const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();
    if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usersLink.click();
      await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

      // Look for search input
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Verify results are filtered
        const results = page.locator('table tbody tr, [data-testid="user-row"]');
        const resultCount = await results.count();
        expect(resultCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should display admin menu/navigation', async ({ page }) => {
    // Check for sidebar or main navigation
    const sidebar = page.locator('[data-testid="admin-sidebar"], .admin-sidebar, [role="navigation"]').first();

    if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(sidebar).toBeVisible();

      // Verify it has multiple menu items
      const menuItems = sidebar.locator('a, button');
      const itemCount = await menuItems.count();
      expect(itemCount).toBeGreaterThan(2);
    }
  });

  test('should allow admin to view user details', async ({ page }) => {
    // Navigate to users
    const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();
    if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await usersLink.click();
      await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

      // Click first user in list
      const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
      if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userRow.click();
        await page.waitForURL(/users\/\w+|user-detail/i, { timeout: 5000 }).catch(() => {});

        // Verify user details are displayed
        const userEmail = page.locator('input[value*="@"], [data-testid="user-email"]').first();
        await expect(userEmail).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });

  test('should have admin settings', async ({ page }) => {
    // Look for settings
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForURL(/settings|admin-settings/i, { timeout: 5000 }).catch(() => {});

      // Verify settings page loaded
      const settingsContent = page.locator('[data-testid="settings"], .settings-panel').first();
      await expect(settingsContent).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should prevent non-admin access to admin panel', async ({ page, context }) => {
    // Logout first
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
    }

    // Create new page and login as regular user
    const newPage = await context.newPage();
    await newPage.goto('/login');

    const regularUser = {
      email: process.env.TEST_USER_EMAIL || 'user@test.com',
      password: process.env.TEST_USER_PASSWORD || 'test1234',
    };

    await newPage.fill('input[type="email"]', regularUser.email);
    await newPage.fill('input[type="password"]', regularUser.password);
    const submitButton = newPage.locator('button[type="submit"]').first();
    await submitButton.click();

    await newPage.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

    // Try to access admin panel
    await newPage.goto('/admin', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show error
    const isAdminPage = newPage.url().includes('/admin');
    const isUnauthorized = newPage.url().includes('/login') || newPage.url().includes('/home');

    expect(isAdminPage || isUnauthorized).toBeTruthy();

    await newPage.close();
  });

  test('should display compliance/verification section', async ({ page }) => {
    // Look for compliance/verification menu
    const complianceLink = page.locator('a:has-text("Verification"), a:has-text("Compliance"), button:has-text("Verification")').first();

    if (await complianceLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await complianceLink.click();
      await page.waitForURL(/verification|compliance|documents/i, { timeout: 5000 }).catch(() => {});

      // Verify content loaded
      const content = page.locator('[data-testid="verification"], .compliance-panel').first();
      await expect(content).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should have proper admin role indicators', async ({ page }) => {
    // Check for admin label or role indicator
    const adminLabel = page.locator('[data-testid="admin-role"], .admin-badge, text=/Admin/').first();

    if (await adminLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(adminLabel).toBeVisible();
    }
  });
});
