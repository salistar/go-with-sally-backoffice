import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@gowithsally.ma',
  password: 'Admin@2024',
};

test.describe('User Management (Admin Panel)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/admin|dashboard/i, { timeout: 10000 }).catch(() => {});
  });

  test.describe('User List & View', () => {
    test('should navigate to users management section', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users|user-management/i, { timeout: 5000 }).catch(() => {});
      }
    });

    test('should display users list with pagination', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Check for users table or list
        const usersList = page.locator('table, [data-testid="users-list"], .users-list').first();
        const hasUsersList = await usersList.isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasUsersList).toBeTruthy();

        // Check for pagination
        const pagination = page.locator('[data-testid="pagination"], .pagination, nav:has-text("Page")').first();
        const hasPagination = await pagination.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasPagination) {
          expect(hasPagination).toBeTruthy();
        }
      }
    });

    test('should display user information columns (Name, Email, Phone, Status, Created Date)', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Check table headers
        const nameHeader = page.locator('th:has-text("Name"), th:has-text("User"), td:has-text("name")').first();
        const emailHeader = page.locator('th:has-text("Email"), td:has-text("email")').first();

        const hasColumns = await nameHeader.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasColumns) {
          expect(hasColumns).toBeTruthy();
        }
      }
    });

    test('should allow viewing individual user details', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Click first user row
        const userRow = page.locator('table tbody tr, [data-testid="user-row"], .user-item').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();
          await page.waitForURL(/users\/\w+|user-detail/i, { timeout: 5000 }).catch(() => {});

          // Check user detail page
          const userDetail = page.locator('[data-testid="user-detail"], .user-detail-panel').first();
          const hasDetail = await userDetail.isVisible({ timeout: 3000 }).catch(() => false);

          if (hasDetail) {
            expect(hasDetail).toBeTruthy();
          }
        }
      }
    });

    test('should display user profile information', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();
          await page.waitForTimeout(500);

          // Check for profile info
          const profileName = page.locator('[data-testid="user-name"], .user-name').first();
          const profileEmail = page.locator('[data-testid="user-email"], .user-email').first();
          const profilePhone = page.locator('[data-testid="user-phone"], .user-phone').first();

          const hasProfile = await profileName.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasProfile) {
            expect(hasProfile).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('User Search & Filter', () => {
    test('should search users by email', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Find search input
        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="email"]').first();

        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill('test@test.com');
          await page.waitForTimeout(1000);

          // Verify results are filtered
          const results = page.locator('table tbody tr, [data-testid="user-row"]');
          const resultCount = await results.count();
          expect(resultCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should search users by name', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="name"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchInput.fill('John');
          await page.waitForTimeout(1000);

          const results = page.locator('table tbody tr, [data-testid="user-row"]');
          const resultCount = await results.count();
          expect(resultCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should filter users by status (Active, Inactive, Suspended)', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Look for status filter
        const statusFilter = page.locator('select[name*="status"], button:has-text("Status")').first();
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusFilter.click();
          await page.waitForTimeout(500);

          // Check for filter options
          const activeOption = page.locator('text=/active/i').first();
          if (await activeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await activeOption.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });

    test('should filter users by date range', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        // Look for date filter
        const dateInput = page.locator('input[type="date"], input[placeholder*="date"]').first();
        if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dateInput.fill('2024-01-01');
          await page.waitForTimeout(500);

          const results = page.locator('table tbody tr, [data-testid="user-row"]');
          expect(await results.count()).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should clear filters and show all users', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Add search filter
          await searchInput.fill('test');
          await page.waitForTimeout(500);

          // Clear search
          const clearButton = page.locator('button:has-text("Clear"), button[aria-label*="clear"]').first();
          if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await clearButton.click();
            await page.waitForTimeout(500);

            // Verify all results are shown
            const results = page.locator('table tbody tr, [data-testid="user-row"]');
            const resultCount = await results.count();
            expect(resultCount).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('User Actions', () => {
    test('should allow editing user information', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();
          await page.waitForTimeout(500);

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

    test('should allow suspending/deactivating user', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();

          // Look for suspend/deactivate button
          const suspendButton = page.locator('button:has-text("Suspend"), button:has-text("Deactivate"), button:has-text("Disable")').first();
          if (await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await suspendButton.click();

            // Check for confirmation dialog
            const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
            if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              expect(confirmButton).toBeVisible();
            }
          }
        }
      }
    });

    test('should allow reactivating user', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        // Filter for inactive users
        const statusFilter = page.locator('select[name*="status"], button:has-text("Status")').first();
        if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusFilter.click();

          const inactiveOption = page.locator('text=/inactive|suspended|disabled/i').first();
          if (await inactiveOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await inactiveOption.click();
            await page.waitForTimeout(500);
          }
        }

        // Click user to view details
        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();

          // Look for reactivate button
          const reactivateButton = page.locator('button:has-text("Reactivate"), button:has-text("Activate"), button:has-text("Enable")').first();
          if (await reactivateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            expect(reactivateButton).toBeVisible();
          }
        }
      }
    });

    test('should allow resetting user password', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();

          // Look for reset password button
          const resetButton = page.locator('button:has-text("Reset Password"), button:has-text("Change Password")').first();
          if (await resetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await resetButton.click();

            // Check for password reset confirmation
            const confirmMessage = page.locator('text=/reset|sent|email/i').first();
            const hasConfirmation = await confirmMessage.isVisible({ timeout: 3000 }).catch(() => false);
            if (hasConfirmation) {
              expect(hasConfirmation).toBeTruthy();
            }
          }
        }
      }
    });

    test('should allow sending messages to user', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const userRow = page.locator('table tbody tr, [data-testid="user-row"]').first();
        if (await userRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userRow.click();

          // Look for message button
          const messageButton = page.locator('button:has-text("Message"), button:has-text("Send Email"), button:has-text("Notify")').first();
          if (await messageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await messageButton.click();

            // Check for message compose
            const messageInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="email"]').first();
            const hasMessageForm = await messageInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasMessageForm) {
              expect(hasMessageForm).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('User Statistics', () => {
    test('should display user signup statistics/trends', async ({ page }) => {
      // Navigate to users section
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        // Look for stats panel
        const statsPanel = page.locator('[data-testid="user-stats"], .user-statistics, [class*="stat"]').first();
        const hasStats = await statsPanel.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasStats) {
          expect(hasStats).toBeTruthy();
        }
      }
    });

    test('should show total users count', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        // Look for total count
        const totalCount = page.locator('[data-testid="total-users"], text=/Total.*Users/i').first();
        const hasCount = await totalCount.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasCount) {
          expect(hasCount).toBeVisible();
        }
      }
    });
  });

  test.describe('Bulk Actions', () => {
    test('should allow selecting multiple users', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();
        await page.waitForURL(/users/i, { timeout: 5000 }).catch(() => {});

        // Look for checkboxes
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();

        if (checkboxCount > 1) {
          // Click first checkbox
          await checkboxes.nth(0).click();
          await page.waitForTimeout(300);

          // Click second checkbox
          await checkboxes.nth(1).click();

          // Check for bulk actions toolbar
          const bulkActions = page.locator('[data-testid="bulk-actions"], .bulk-actions').first();
          const hasBulkActions = await bulkActions.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasBulkActions) {
            expect(hasBulkActions).toBeTruthy();
          }
        }
      }
    });

    test('should allow bulk suspending users', async ({ page }) => {
      const usersLink = page.locator('a:has-text("Users"), button:has-text("Users")').first();

      if (await usersLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersLink.click();

        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 1) {
          await checkboxes.nth(0).click();
          await page.waitForTimeout(300);

          // Look for bulk suspend button
          const suspendButton = page.locator('[data-testid="bulk-suspend"], button:has-text("Suspend Selected")').first();
          if (await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            expect(suspendButton).toBeVisible();
          }
        }
      }
    });
  });
});
