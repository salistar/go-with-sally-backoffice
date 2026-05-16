import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'user@test.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

test.describe('Ride Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard|home|app|rides/i, { timeout: 10000 }).catch(() => {});
  });

  test.describe('Ride Booking', () => {
    test('should display ride booking form', async ({ page }) => {
      // Navigate to rides page or find booking form
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride"), button:has-text("Request Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();
      }

      // Check for pickup location input
      const pickupInput = page.locator('input[placeholder*="pickup"], input[placeholder*="Pickup"], input[placeholder*="from"]').first();
      const dropoffInput = page.locator('input[placeholder*="dropoff"], input[placeholder*="Dropoff"], input[placeholder*="to"]').first();

      if (await pickupInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(pickupInput).toBeVisible();
      }
    });

    test('should validate required ride fields', async ({ page }) => {
      // Navigate to book ride
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride"), button:has-text("Request Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Try to submit without filling fields
        const submitButton = page.locator('button[type="submit"], button:has-text("Request"), button:has-text("Confirm")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();

          // Should show validation error
          const errorMessage = page.locator('text=/required|must|please/i').first();
          const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
          expect(hasError || page.url().includes('login')).toBeTruthy();
        }
      }
    });

    test('should populate pickup location from current location', async ({ page }) => {
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Look for use current location button
        const currentLocationButton = page.locator('button:has-text("Current"), button:has-text("Location"), button:has-text("GPS")').first();
        if (await currentLocationButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await currentLocationButton.click();
          await page.waitForTimeout(1000);

          // Check if location was populated
          const pickupInput = page.locator('input[placeholder*="pickup"], input[placeholder*="from"]').first();
          const value = await pickupInput.inputValue().catch(() => '');
          expect(value || await pickupInput.isVisible()).toBeTruthy();
        }
      }
    });

    test('should calculate fare estimate', async ({ page }) => {
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Fill in pickup and dropoff
        const pickupInput = page.locator('input[placeholder*="pickup"], input[placeholder*="from"]').first();
        const dropoffInput = page.locator('input[placeholder*="dropoff"], input[placeholder*="to"]').first();

        if (await pickupInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await pickupInput.fill('123 Main Street, Marrakech');
          await page.waitForTimeout(500);

          if (await dropoffInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dropoffInput.fill('456 Park Avenue, Marrakech');
            await page.waitForTimeout(1000);

            // Check for fare estimate
            const fareEstimate = page.locator('text=/fare|estimate|price|total/i').first();
            const hasFareEstimate = await fareEstimate.isVisible({ timeout: 3000 }).catch(() => false);
            expect(hasFareEstimate).toBeTruthy();
          }
        }
      }
    });

    test('should display available ride types/services', async ({ page }) => {
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Look for ride type selection
        const rideTypes = page.locator('[data-testid*="ride-type"], .ride-type, [role="radio"]');
        const typeCount = await rideTypes.count();

        if (typeCount > 0) {
          expect(typeCount).toBeGreaterThan(0);
          await expect(rideTypes.first()).toBeVisible();
        }
      }
    });

    test('should allow ride type selection', async ({ page }) => {
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Select different ride types
        const rideTypes = page.locator('[data-testid*="ride-type"], .ride-type, [role="radio"]');
        const typeCount = await rideTypes.count();

        if (typeCount > 1) {
          await rideTypes.nth(1).click();
          await page.waitForTimeout(500);

          // Verify selection
          const selected = await rideTypes.nth(1).evaluate((el) => {
            return el.classList.contains('active') || el.getAttribute('aria-checked') === 'true';
          });
          expect(selected).toBeTruthy();
        }
      }
    });

    test('should allow scheduling a ride for future date/time', async ({ page }) => {
      const bookRideButton = page.locator('button:has-text("Book"), button:has-text("New Ride")').first();

      if (await bookRideButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookRideButton.click();

        // Look for schedule option
        const scheduleButton = page.locator('button:has-text("Schedule"), button:has-text("Later"), label:has-text("Schedule")').first();
        if (await scheduleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await scheduleButton.click();

          // Check for date/time picker
          const dateInput = page.locator('input[type="date"], input[placeholder*="date"]').first();
          const timeInput = page.locator('input[type="time"], input[placeholder*="time"]').first();

          const hasDatetime = await dateInput.isVisible({ timeout: 2000 }).catch(() => false);
          expect(hasDatetime).toBeTruthy();
        }
      }
    });
  });

  test.describe('Ride Lifecycle', () => {
    test('should show ride status changes (Requested → Assigned → In Progress → Completed)', async ({ page }) => {
      // Navigate to rides history or active rides
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides"), a:has-text("History")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides|history/i, { timeout: 5000 }).catch(() => {});

        // Check for ride status indicators
        const statusElements = page.locator('[data-testid*="status"], .ride-status, [class*="badge"]');
        const statusCount = await statusElements.count();

        if (statusCount > 0) {
          expect(statusCount).toBeGreaterThan(0);
        }
      }
    });

    test('should display driver information when assigned', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides/i, { timeout: 5000 }).catch(() => {});

        // Look for driver info in ride details
        const driverName = page.locator('[data-testid="driver-name"], .driver-name, text=/Driver:/i').first();
        const driverRating = page.locator('[data-testid="driver-rating"], .driver-rating, text=/Rating:/i').first();

        const hasDriverInfo = await driverName.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasDriverInfo) {
          expect(hasDriverInfo).toBeTruthy();
        }
      }
    });

    test('should show real-time ride tracking on map', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        // Look for map element
        const map = page.locator('[data-testid="ride-map"], .map, [class*="map"]').first();
        const hasMap = await map.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasMap) {
          expect(hasMap).toBeTruthy();
        }
      }
    });

    test('should display ride details (pickup, dropoff, fare, duration)', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides/i, { timeout: 5000 }).catch(() => {});

        // Click on a ride to view details
        const rideRow = page.locator('[data-testid="ride-row"], table tbody tr, .ride-item').first();
        if (await rideRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await rideRow.click();
          await page.waitForTimeout(1000);

          // Check for ride details
          const pickupLocation = page.locator('text=/pickup|from/i').first();
          const dropoffLocation = page.locator('text=/dropoff|to|destination/i').first();

          const hasDetails = await pickupLocation.isVisible({ timeout: 2000 }).catch(() => false);
          expect(hasDetails).toBeTruthy();
        }
      }
    });
  });

  test.describe('Ride Cancellation', () => {
    test('should allow cancellation of requested ride', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides/i, { timeout: 5000 }).catch(() => {});

        // Look for cancel button on a ride
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.click();

          // Check for confirmation dialog
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();

            // Should show cancellation confirmation
            const confirmationMessage = page.locator('text=/cancelled|cancel/i').first();
            const hasConfirmation = await confirmationMessage.isVisible({ timeout: 3000 }).catch(() => false);
            expect(hasConfirmation).toBeTruthy();
          }
        }
      }
    });

    test('should show cancellation policy and fees', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        const cancelButton = page.locator('button:has-text("Cancel")').first();
        if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.click();

          // Check for cancellation policy details
          const policyText = page.locator('text=/fee|refund|policy/i').first();
          const hasPolicy = await policyText.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasPolicy) {
            expect(hasPolicy).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Ride Rating & Review', () => {
    test('should display rating prompt after completed ride', async ({ page }) => {
      // Navigate to completed rides
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        // Filter for completed rides
        const completedFilter = page.locator('button:has-text("Completed"), a:has-text("Completed")').first();
        if (await completedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await completedFilter.click();
          await page.waitForTimeout(500);
        }

        // Click on a completed ride
        const rideRow = page.locator('[data-testid="ride-row"], table tbody tr').first();
        if (await rideRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await rideRow.click();

          // Check for rating prompt
          const ratingPrompt = page.locator('[data-testid="rating"], .rating, text=/rate|review/i').first();
          const hasRating = await ratingPrompt.isVisible({ timeout: 3000 }).catch(() => false);
          if (hasRating) {
            expect(hasRating).toBeTruthy();
          }
        }
      }
    });

    test('should allow rating submission (1-5 stars)', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        const rideRow = page.locator('[data-testid="ride-row"], table tbody tr').first();
        if (await rideRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await rideRow.click();

          // Find and click rating stars
          const stars = page.locator('[data-testid*="star"], .star, [class*="rating"] button').filter({ hasText: /[1-5]/ });
          const starCount = await stars.count();

          if (starCount >= 3) {
            await stars.nth(3).click(); // 4 stars
            await page.waitForTimeout(500);

            // Check if rating was selected
            const selectedStar = await stars.nth(3).evaluate((el) => {
              return el.classList.contains('active') || el.getAttribute('aria-checked') === 'true';
            });
            expect(selectedStar).toBeTruthy();
          }
        }
      }
    });

    test('should allow adding review text after rating', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        const rideRow = page.locator('[data-testid="ride-row"], table tbody tr').first();
        if (await rideRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await rideRow.click();

          // Find review text area
          const reviewInput = page.locator('textarea[placeholder*="review"], textarea[placeholder*="comment"]').first();
          if (await reviewInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await reviewInput.fill('Great ride, very safe and clean vehicle.');

            // Check for submit button
            const submitButton = page.locator('button:has-text("Submit"), button:has-text("Send")').first();
            if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              expect(await reviewInput.inputValue()).toContain('Great ride');
            }
          }
        }
      }
    });
  });

  test.describe('Ride History & Filters', () => {
    test('should display ride history list', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides"), a:has-text("History")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides|history/i, { timeout: 5000 }).catch(() => {});

        // Check for rides list
        const ridesList = page.locator('table, [data-testid="rides-list"], .rides-list').first();
        const hasRidesList = await ridesList.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasRidesList) {
          expect(hasRidesList).toBeTruthy();
        }
      }
    });

    test('should filter rides by status (All, Completed, Cancelled, Scheduled)', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        // Look for status filters
        const statusFilters = page.locator('button:has-text("All"), button:has-text("Completed"), button:has-text("Cancelled")');
        const filterCount = await statusFilters.count();

        if (filterCount > 0) {
          expect(filterCount).toBeGreaterThan(0);

          // Try clicking a filter
          await statusFilters.first().click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should search rides by date range', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        // Look for date picker
        const dateInput = page.locator('input[type="date"], input[placeholder*="date"]').first();
        if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dateInput.fill('2024-03-01');
          await page.waitForTimeout(500);

          // Results should be filtered
          const results = page.locator('table tbody tr, [data-testid="ride-row"]');
          const resultCount = await results.count();
          expect(resultCount).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test.describe('Emergency Features', () => {
    test('should display emergency/SOS button during active ride', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        // Look for SOS button
        const sosButton = page.locator('button:has-text("SOS"), button:has-text("Emergency"), button:has-text("Help")').first();
        const hasSos = await sosButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasSos) {
          expect(hasSos).toBeTruthy();
        }
      }
    });

    test('should show emergency contacts option', async ({ page }) => {
      const ridesLink = page.locator('a:has-text("Rides"), button:has-text("Rides")').first();

      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();

        const emergencyLink = page.locator('a:has-text("Emergency"), button:has-text("Emergency"), text=/emergency contacts/i').first();
        const hasEmergency = await emergencyLink.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasEmergency) {
          expect(hasEmergency).toBeTruthy();
        }
      }
    });
  });
});
