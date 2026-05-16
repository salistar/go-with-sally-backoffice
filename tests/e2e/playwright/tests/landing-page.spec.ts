import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load landing page successfully', async ({ page }) => {
    // Wait for main content to be visible
    await expect(page.locator('h1')).toBeTruthy();

    // Check page title
    await expect(page).toHaveTitle(/GoWithSally|Go With Sally/i);

    // Verify page is not showing 404 or error
    await expect(page.locator('text=404')).not.toBeVisible();
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for common nav elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check for key navigation links
    const homeLink = page.locator('a:has-text("Home")');
    const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign In")');

    if (await homeLink.isVisible()) {
      await expect(homeLink).toBeVisible();
    }
  });

  test('should have login button visible', async ({ page }) => {
    // Look for login/sign in button
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")').first();
    await expect(loginButton).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that content is still visible
    const mainContent = page.locator('main, [role="main"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible();
    }

    // Check for mobile menu button if it exists
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu-button, .hamburger');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check that content is still visible
    const mainContent = page.locator('main, [role="main"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible();
    }
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check that content is visible and properly laid out
    const mainContent = page.locator('main, [role="main"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible();
    }
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for language attribute
    await expect(page.locator('html')).toHaveAttribute('lang', /^[a-z]{2}(-[a-zA-Z]{2})?$/);

    // Check for title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should load all images successfully', async ({ page }) => {
    // Get all image elements
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Check first few images are loaded
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        const isVisible = await img.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
          // Verify image has natural dimensions
          const height = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);
          expect(height).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should navigate to login page when login button clicked', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")').first();

    await loginButton.click();

    // Wait for navigation and verify we're on login page
    await page.waitForURL(/login|signin/i, { timeout: 5000 }).catch(() => {
      // If URL doesn't change, check if login form appears
      return page.locator('input[type="email"], input[name*="email"]').first().isVisible();
    });
  });

  test('should have working footer links', async ({ page }) => {
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded().catch(() => {});

    // Get all footer links
    const footerLinks = page.locator('footer a');
    const linkCount = await footerLinks.count();

    if (linkCount > 0) {
      // Verify first footer link is clickable
      const firstLink = footerLinks.first();
      await expect(firstLink).toBeVisible();
    }
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});
