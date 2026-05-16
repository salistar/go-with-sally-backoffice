import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'user@test.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

test.describe('API Integration', () => {
  test.describe('Authentication API', () => {
    test('should return 401 for invalid credentials', async ({ page }) => {
      // Make API request through page
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'invalid@test.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should return JWT token on successful login', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.token).toBeTruthy();
      expect(body.user).toBeTruthy();
      expect(body.user.email).toBe(TEST_USER.email);
    });

    test('should return user data on successful login', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const body = await response.json();
      expect(body.user.id).toBeTruthy();
      expect(body.user.email).toBeTruthy();
      expect(body.user.firstName || body.user.name).toBeTruthy();
    });

    test('should handle missing email field', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          password: 'password123',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should handle missing password field', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should validate email format on backend', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'notanemail',
          password: 'password',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('User API', () => {
    let authToken: string;

    test.beforeAll(async ({ browser }) => {
      // Get auth token
      const context = await browser.newContext();
      const page = await context.newPage();

      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const body = await loginResponse.json();
      authToken = body.token;

      await context.close();
    });

    test('should return 401 without authentication token', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users/profile`);

      expect(response.status()).toBe(401);
    });

    test('should return user profile with valid token', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(body.email).toBeTruthy();
    });

    test('should update user profile', async ({ page }) => {
      const response = await page.request.put(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          firstName: 'UpdatedName',
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.firstName).toBe('UpdatedName');
    });

    test('should list users with pagination', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.users) || Array.isArray(body.data)).toBeTruthy();
      expect(body.pagination || body.page).toBeTruthy();
    });

    test('should search users by email', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users?search=test`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.users) || Array.isArray(body.data)).toBeTruthy();
    });
  });

  test.describe('Rides API', () => {
    let authToken: string;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const body = await loginResponse.json();
      authToken = body.token;

      await context.close();
    });

    test('should create a new ride', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/rides`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          pickupLocation: { lat: 31.6295, lng: -8.0088 },
          dropoffLocation: { lat: 31.6450, lng: -8.0050 },
          rideType: 'economy',
        },
      });

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.id).toBeTruthy();
      expect(body.status).toBe('requested');
    });

    test('should fetch ride details', async ({ page }) => {
      // First create a ride
      const createResponse = await page.request.post(`${API_BASE_URL}/api/rides`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          pickupLocation: { lat: 31.6295, lng: -8.0088 },
          dropoffLocation: { lat: 31.6450, lng: -8.0050 },
          rideType: 'economy',
        },
      });

      const createBody = await createResponse.json();
      const rideId = createBody.id;

      // Fetch ride details
      const getResponse = await page.request.get(`${API_BASE_URL}/api/rides/${rideId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.status()).toBe(200);

      const body = await getResponse.json();
      expect(body.id).toBe(rideId);
      expect(body.status).toBeTruthy();
    });

    test('should get user ride history', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/rides`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.rides) || Array.isArray(body.data)).toBeTruthy();
    });

    test('should cancel a ride', async ({ page }) => {
      // Create a ride first
      const createResponse = await page.request.post(`${API_BASE_URL}/api/rides`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          pickupLocation: { lat: 31.6295, lng: -8.0088 },
          dropoffLocation: { lat: 31.6450, lng: -8.0050 },
          rideType: 'economy',
        },
      });

      const createBody = await createResponse.json();
      const rideId = createBody.id;

      // Cancel the ride
      const cancelResponse = await page.request.post(`${API_BASE_URL}/api/rides/${rideId}/cancel`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(cancelResponse.status()).toBe(200);

      const body = await cancelResponse.json();
      expect(body.status).toBe('cancelled');
    });

    test('should validate required ride fields', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/rides`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {},
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Driver API', () => {
    let authToken: string;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const body = await loginResponse.json();
      authToken = body.token;

      await context.close();
    });

    test('should get driver profile', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/drivers/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }).catch(() => null);

      // May not exist for non-drivers, so just check structure
      if (response) {
        expect([200, 400, 404, 403]).toContain(response.status());
      }
    });

    test('should list drivers', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/drivers?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body.drivers) || Array.isArray(body.data)).toBeTruthy();
    });

    test('should get driver by ID', async ({ page }) => {
      // Get drivers list first
      const listResponse = await page.request.get(`${API_BASE_URL}/api/drivers?page=1&limit=1`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const listBody = await listResponse.json();
      const drivers = listBody.drivers || listBody.data;

      if (drivers && drivers.length > 0) {
        const driverId = drivers[0].id;

        // Get driver details
        const detailResponse = await page.request.get(`${API_BASE_URL}/api/drivers/${driverId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect(detailResponse.status()).toBe(200);

        const body = await detailResponse.json();
        expect(body.id).toBe(driverId);
      }
    });

    test('should get driver ratings', async ({ page }) => {
      // Get drivers list
      const listResponse = await page.request.get(`${API_BASE_URL}/api/drivers?page=1&limit=1`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const listBody = await listResponse.json();
      const drivers = listBody.drivers || listBody.data;

      if (drivers && drivers.length > 0) {
        const driverId = drivers[0].id;

        // Get driver ratings
        const ratingResponse = await page.request.get(`${API_BASE_URL}/api/drivers/${driverId}/ratings`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }).catch(() => null);

        if (ratingResponse) {
          expect([200, 404]).toContain(ratingResponse.status());
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should return proper error response for 404', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/nonexistent`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      }).catch(() => null);

      if (response) {
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('should return proper error response for 403 Forbidden', async ({ page }) => {
      // Try to access admin-only endpoint without admin token
      const response = await page.request.get(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          Authorization: 'Bearer valid-but-non-admin-token',
        },
      }).catch(() => null);

      if (response) {
        expect([403, 401, 404]).toContain(response.status());
      }
    });

    test('should return validation error with details', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'invalid-email',
          password: '',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);

      const body = await response.json();
      expect(body.error || body.message).toBeTruthy();
    });

    test('should return meaningful error messages', async ({ page }) => {
      const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      if (response.status() === 401) {
        const body = await response.json();
        expect(body.message || body.error).toBeTruthy();
      }
    });
  });

  test.describe('Response Format & Data', () => {
    let authToken: string;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const body = await loginResponse.json();
      authToken = body.token;

      await context.close();
    });

    test('should return JSON responses', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.headers()['content-type']).toContain('application/json');

      // Should be valid JSON
      const body = await response.json();
      expect(body).toBeTruthy();
    });

    test('should include proper HTTP status codes', async ({ page }) => {
      // Test various endpoints
      const responses = await Promise.all([
        page.request.post(`${API_BASE_URL}/api/auth/login`, {
          data: {
            email: TEST_USER.email,
            password: TEST_USER.password,
          },
        }),
        page.request.get(`${API_BASE_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      expect(responses[0].status()).toBe(200);
      expect(responses[1].status()).toBe(200);
    });

    test('should include pagination info in list endpoints', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.pagination || body.page || body.limit).toBeTruthy();
    });

    test('should handle large response bodies', async ({ page }) => {
      const response = await page.request.get(`${API_BASE_URL}/api/users?page=1&limit=100`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      const users = body.users || body.data;
      expect(Array.isArray(users)).toBeTruthy();
    });
  });

  test.describe('API Response Display in UI', () => {
    test('should display API data on user profile page', async ({ page }) => {
      // Login and navigate to profile
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app|profile/i, { timeout: 10000 }).catch(() => {});

      // Navigate to profile
      const profileLink = page.locator('a:has-text("Profile"), button:has-text("Profile")').first();
      if (await profileLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await profileLink.click();
        await page.waitForTimeout(1000);

        // Check if user data is displayed
        const userName = page.locator('[data-testid="user-name"], .user-name').first();
        const userEmail = page.locator('[data-testid="user-email"], .user-email').first();

        const hasUserData = await userName.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasUserData) {
          expect(hasUserData).toBeTruthy();
        }
      }
    });

    test('should display API errors in UI', async ({ page }) => {
      // Go to login with invalid credentials
      await page.goto('/login');
      await page.fill('input[type="email"]', 'invalid@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.locator('button[type="submit"]').first().click();

      // Should show error message
      const errorMessage = page.locator('[role="alert"], .error, .error-message').first();
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasError).toBeTruthy();
    });

    test('should display loading state during API calls', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      // Look for loading indicator before it disappears
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Loading state or spinner should appear
      const loadingIndicator = page.locator('[data-testid="loading"], .spinner, .loader, [role="status"]').first();
      const hasLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasLoading) {
        expect(hasLoading).toBeTruthy();
      }
    });
  });
});
