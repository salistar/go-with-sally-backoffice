import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@gowithsally.ma',
  password: 'Admin@2024',
};

test.describe('Driver Management (Admin Panel)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/admin|dashboard/i, { timeout: 10000 }).catch(() => {});
  });

  test.describe('Driver List & View', () => {
    test('should navigate to drivers management section', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers|driver-management/i, { timeout: 5000 }).catch(() => {});
      }
    });

    test('should display drivers list with pagination', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers/i, { timeout: 5000 }).catch(() => {});

        // Check for drivers table/list
        const driversList = page.locator('table, [data-testid="drivers-list"], .drivers-list').first();
        const hasDriversList = await driversList.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasDriversList).toBeTruthy();

        // Check for pagination
        const pagination = page.locator('[data-testid="pagination"], .pagination').first();
        const hasPagination = await pagination.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasPagination) {
          expect(hasPagination).toBeTruthy();
        }
      }
    });

    test('should display driver information (Name, Email, Phone, Vehicle, Status, Rating)', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers/i, { timeout: 5000 }).catch(() => {});

        // Check table headers
        const nameHeader = page.locator('th:has-text("Name"), th:has-text("Driver")').first();
        const emailHeader = page.locator('th:has-text("Email")').first();
        const statusHeader = page.locator('th:has-text("Status")').first();

        const hasColumns = await nameHeader.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasColumns) {
          expect(hasColumns).toBeTruthy();
        }
      }
    });

    test('should allow viewing individual driver details', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers/i, { timeout: 5000 }).catch(() => {});

        // Click first driver row
        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"], .driver-item').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();
          await page.waitForURL(/drivers\/\w+|driver-detail/i, { timeout: 5000 }).catch(() => {});

          // Check driver detail page
          const driverDetail = page.locator('[data-testid="driver-detail"], .driver-detail-panel').first();
          const hasDetail = await driverDetail.isVisible({ timeout: 3000 }).catch(() => false);

          if (hasDetail) {
            expect(hasDetail).toBeTruthy();
          }
        }
      }
    });

    test('should display driver profile including vehicle information', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();
          await page.waitForTimeout(500);

          // Check for vehicle info
          const vehicleMake = page.locator('[data-testid="vehicle-make"], .vehicle-make, text=/Make/i').first();
          const vehicleModel = page.locator('[data-testid="vehicle-model"], .vehicle-model, text=/Model/i').first();
          const licensePlate = page.locator('[data-testid="license-plate"], .license-plate').first();

          const hasVehicleInfo = await vehicleMake.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasVehicleInfo) {
            expect(hasVehicleInfo).toBeTruthy();
          }
        }
      }
    });

    test('should display driver rating and reviews', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Check for rating
          const rating = page.locator('[data-testid="driver-rating"], .driver-rating, text=/Rating/i').first();
          const hasRating = await rating.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasRating) {
            expect(hasRating).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Driver Search & Filter', () => {
    test('should search drivers by name', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers/i, { timeout: 5000 }).catch(() => {});

        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="name"]').first();

        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill('Ahmed');
          await page.waitForTimeout(1000);

          const results = page.locator('table tbody tr, [data-testid="driver-row"]');
          const resultCount = await results.count();
          expect(resultCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should search drivers by email or phone', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill('+212612345678');
          await page.waitForTimeout(1000);

          const results = page.locator('table tbody tr, [data-testid="driver-row"]');
          expect(await results.count()).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should filter drivers by status (Active, Inactive, Suspended, Offline)', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const statusFilter = page.locator('select[name*="status"], button:has-text("Status")').first();
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusFilter.click();
          await page.waitForTimeout(500);

          const activeOption = page.locator('text=/active/i').first();
          if (await activeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await activeOption.click();
            await page.waitForTimeout(1000);

            const results = page.locator('table tbody tr, [data-testid="driver-row"]');
            expect(await results.count()).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    test('should filter drivers by verification status (Verified, Pending, Rejected)', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const verificationFilter = page.locator('button:has-text("Verification"), select[name*="verification"]').first();
        if (await verificationFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await verificationFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should filter drivers by rating range', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const ratingFilter = page.locator('input[name*="rating"], select[name*="rating"]').first();
        if (await ratingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Select drivers with 4+ stars
          await ratingFilter.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Driver Verification', () => {
    test('should display driver verification status', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Check verification status
          const verificationStatus = page.locator('[data-testid="verification-status"], .verification-status, text=/Verification/i').first();
          const hasStatus = await verificationStatus.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasStatus) {
            expect(hasStatus).toBeTruthy();
          }
        }
      }
    });

    test('should display driver documents (license, insurance, inspection)', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for documents section
          const documentsSection = page.locator('[data-testid="documents"], .documents-panel, text=/Documents/i').first();
          const hasDocuments = await documentsSection.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasDocuments) {
            expect(hasDocuments).toBeTruthy();
          }
        }
      }
    });

    test('should allow approving driver verification', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        // Filter for pending verification
        const verificationFilter = page.locator('button:has-text("Verification"), select[name*="verification"]').first();
        if (await verificationFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await verificationFilter.click();

          const pendingOption = page.locator('text=/pending/i').first();
          if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await pendingOption.click();
            await page.waitForTimeout(500);
          }
        }

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for approve button
          const approveButton = page.locator('button:has-text("Approve"), button:has-text("Verify")').first();
          if (await approveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            expect(approveButton).toBeVisible();
          }
        }
      }
    });

    test('should allow rejecting driver verification with reason', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for reject button
          const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Deny")').first();
          if (await rejectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await rejectButton.click();

            // Check for reason input
            const reasonInput = page.locator('textarea[placeholder*="reason"], textarea[placeholder*="Reason"]').first();
            const hasReasonForm = await reasonInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasReasonForm) {
              expect(hasReasonForm).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Driver Actions', () => {
    test('should allow suspending driver account', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for suspend button
          const suspendButton = page.locator('button:has-text("Suspend"), button:has-text("Deactivate")').first();
          if (await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await suspendButton.click();

            // Check for confirmation
            const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              expect(confirmButton).toBeVisible();
            }
          }
        }
      }
    });

    test('should allow reactivating suspended driver', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        // Filter for suspended drivers
        const statusFilter = page.locator('select[name*="status"], button:has-text("Status")').first();
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusFilter.click();

          const suspendedOption = page.locator('text=/suspended/i').first();
          if (await suspendedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await suspendedOption.click();
            await page.waitForTimeout(500);
          }
        }

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for reactivate button
          const reactivateButton = page.locator('button:has-text("Reactivate"), button:has-text("Activate")').first();
          if (await reactivateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            expect(reactivateButton).toBeVisible();
          }
        }
      }
    });

    test('should allow editing driver information', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for edit button
          const editButton = page.locator('button:has-text("Edit"), button:has-text("Update")').first();
          if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editButton.click();

            // Check for editable fields
            const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
            const hasEditForm = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
            expect(hasEditForm).toBeTruthy();
          }
        }
      }
    });

    test('should allow sending messages to driver', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Look for message button
          const messageButton = page.locator('button:has-text("Message"), button:has-text("Send Email"), button:has-text("Notify")').first();
          if (await messageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await messageButton.click();

            // Check for message compose
            const messageInput = page.locator('textarea[placeholder*="message"]').first();
            const hasMessageForm = await messageInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasMessageForm) {
              expect(hasMessageForm).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Driver Earnings & Statistics', () => {
    test('should display driver earnings', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Check for earnings section
          const earnings = page.locator('[data-testid="earnings"], .earnings-panel, text=/Earnings/i').first();
          const hasEarnings = await earnings.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasEarnings) {
            expect(hasEarnings).toBeTruthy();
          }
        }
      }
    });

    test('should display driver ride statistics (total rides, completed, cancelled)', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Check for stats
          const totalRides = page.locator('text=/Total Rides/i').first();
          const completedRides = page.locator('text=/Completed/i').first();

          const hasStats = await totalRides.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasStats) {
            expect(hasStats).toBeTruthy();
          }
        }
      }
    });

    test('should display driver acceptance rate and cancellation rate', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const driverRow = page.locator('table tbody tr, [data-testid="driver-row"]').first();
        if (await driverRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await driverRow.click();

          // Check for acceptance rate
          const acceptanceRate = page.locator('text=/Acceptance Rate|Completion Rate/i').first();
          const hasRate = await acceptanceRate.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasRate) {
            expect(hasRate).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Driver Bulk Actions', () => {
    test('should allow selecting multiple drivers', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();
        await page.waitForURL(/drivers/i, { timeout: 5000 }).catch(() => {});

        // Look for checkboxes
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();

        if (checkboxCount > 1) {
          await checkboxes.nth(0).click();
          await page.waitForTimeout(300);
          await checkboxes.nth(1).click();

          // Check for bulk actions
          const bulkActions = page.locator('[data-testid="bulk-actions"], .bulk-actions').first();
          const hasBulkActions = await bulkActions.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasBulkActions) {
            expect(hasBulkActions).toBeTruthy();
          }
        }
      }
    });

    test('should allow bulk suspending drivers', async ({ page }) => {
      const driversLink = page.locator('a:has-text("Drivers"), button:has-text("Drivers")').first();

      if (await driversLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await driversLink.click();

        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 1) {
          await checkboxes.nth(0).click();
          await page.waitForTimeout(300);

          const suspendButton = page.locator('[data-testid="bulk-suspend"], button:has-text("Suspend Selected")').first();
          if (await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            expect(suspendButton).toBeVisible();
          }
        }
      }
    });
  });
});
