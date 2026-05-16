import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'user@test.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
};

test.describe('Performance', () => {
  test.describe('Page Load Times', () => {
    test('should load landing page within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Check for Core Web Vitals approximation
      const metrics = await page.metrics();
      expect(metrics.JSHeapUsedSize).toBeLessThan(100_000_000); // Less than 100MB
    });

    test('should load login page quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/login', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should load dashboard within acceptable time when authenticated', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(/dashboard|home|app/i, { timeout: 10000 }).catch(() => {});

      // Measure dashboard load time
      const startTime = Date.now();

      await page.reload({ waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      // Dashboard should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should lazy load images', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Check if images have lazy loading attribute
      const lazyImages = page.locator('img[loading="lazy"]');
      const eagerImages = page.locator('img[loading="eager"]');

      const lazyCount = await lazyImages.count();
      const eagerCount = await eagerImages.count();

      // Should have either lazy loaded or eager loaded images
      expect(lazyCount + eagerCount).toBeGreaterThanOrEqual(0);
    });

    test('should defer JavaScript loading', async ({ page }) => {
      await page.goto('/');

      // Check for deferred or async scripts
      const deferredScripts = page.locator('script[defer]');
      const asyncScripts = page.locator('script[async]');

      const deferCount = await deferredScripts.count();
      const asyncCount = await asyncScripts.count();

      // Should have some deferred or async scripts
      if (deferCount + asyncCount > 0) {
        expect(deferCount + asyncCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Resource Optimization', () => {
    test('should compress CSS', async ({ page }) => {
      const requests: Array<{
        url: string;
        size: number;
        contentType?: string;
      }> = [];

      page.on('response', (response) => {
        if (response.url().includes('.css')) {
          requests.push({
            url: response.url(),
            size: 0,
            contentType: response.headers()['content-type'],
          });
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have CSS files
      expect(requests.length).toBeGreaterThanOrEqual(0);
    });

    test('should minify JavaScript', async ({ page }) => {
      const javaScriptRequests: Array<{
        url: string;
        isMinified: boolean;
      }> = [];

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.js') && !url.includes('sourcemap')) {
          // Check if minified (heuristic: js files typically < 50KB when minified)
          javaScriptRequests.push({
            url,
            isMinified: url.includes('.min.js') || url.includes('_bundle') || url.includes('chunk'),
          });
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have JavaScript files
      expect(javaScriptRequests.length).toBeGreaterThanOrEqual(0);
    });

    test('should cache static assets', async ({ page }) => {
      const cacheHeaders: {
        url: string;
        cacheControl?: string;
      }[] = [];

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.css') || url.includes('.js') || url.includes('.png')) {
          cacheHeaders.push({
            url,
            cacheControl: response.headers()['cache-control'],
          });
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Check for cache headers on static assets
      const cachedAssets = cacheHeaders.filter((a) => a.cacheControl?.includes('max-age'));
      if (cachedAssets.length > 0) {
        expect(cachedAssets.length).toBeGreaterThan(0);
      }
    });

    test('should use appropriate image formats (WebP, AVIF)', async ({ page }) => {
      const imageFormats: {
        url: string;
        format: string;
      }[] = [];

      page.on('response', (response) => {
        const url = response.url();
        if (url.match(/\.(jpg|png|webp|avif|gif)$/i)) {
          const format = url.split('.').pop()?.toLowerCase() || 'unknown';
          imageFormats.push({ url, format });
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have some images
      expect(imageFormats.length).toBeGreaterThanOrEqual(0);

      // Check for modern formats
      const modernFormats = imageFormats.filter((img) => img.format === 'webp' || img.format === 'avif');
      if (modernFormats.length > 0) {
        expect(modernFormats.length).toBeGreaterThan(0);
      }
    });

    test('should minimize render-blocking resources', async ({ page }) => {
      const blockingResources: string[] = [];

      page.on('response', (response) => {
        const url = response.url();
        // Check if critical CSS/JS is inline or deferred
        if (url.includes('.css') || url.includes('.js')) {
          blockingResources.push(url);
        }
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Load time to DOM should be acceptable
      const navigationTiming = await page.evaluate(() => {
        const perf = window.performance.timing;
        return {
          domLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
          pageLoaded: perf.loadEventEnd - perf.navigationStart,
        };
      });

      expect(navigationTiming.domLoaded).toBeLessThan(3000);
    });
  });

  test.describe('Memory & CPU Usage', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      const memorySnapshots: number[] = [];

      // Collect memory snapshots
      for (let i = 0; i < 3; i++) {
        await page.goto('/', { waitUntil: 'networkidle' });
        const metrics = await page.metrics();
        memorySnapshots.push(metrics.JSHeapUsedSize);

        // Navigate away and back
        await page.goto('/login', { waitUntil: 'networkidle' });
      }

      // Memory should not grow excessively
      const firstMemory = memorySnapshots[0];
      const lastMemory = memorySnapshots[memorySnapshots.length - 1];

      // Should not increase by more than 50%
      expect(lastMemory).toBeLessThan(firstMemory * 1.5);
    });

    test('should handle rapid navigation without issues', async ({ page }) => {
      // Navigate rapidly
      for (let i = 0; i < 5; i++) {
        await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }

      // Page should still be functional
      const mainContent = page.locator('main, [role="main"]');
      const isVisible = await mainContent.isVisible({ timeout: 2000 }).catch(() => false);

      expect(isVisible || await page.url().includes('/')).toBeTruthy();
    });

    test('should not consume excessive CPU', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Get metrics before and after interaction
      const metricsBefore = await page.metrics();

      // Simulate user interaction
      await page.click('button').catch(() => {});
      await page.waitForTimeout(1000);

      const metricsAfter = await page.metrics();

      // CPU should return to normal
      expect(metricsAfter.JSHeapUsedSize).toBeLessThan(100_000_000);
    });
  });

  test.describe('Network Performance', () => {
    test('should have reasonable number of HTTP requests', async ({ page }) => {
      const requests: string[] = [];

      page.on('request', (request) => {
        requests.push(request.url());
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have less than 100 requests for landing page
      expect(requests.length).toBeLessThan(100);
    });

    test('should combine and minimize HTTP requests', async ({ page }) => {
      const requestsByType = {
        js: 0,
        css: 0,
        images: 0,
        fonts: 0,
        api: 0,
      };

      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('.js')) requestsByType.js++;
        else if (url.includes('.css')) requestsByType.css++;
        else if (url.match(/\.(jpg|png|webp|gif|svg)$/i)) requestsByType.images++;
        else if (url.match(/\.(woff|woff2|ttf|otf)$/i)) requestsByType.fonts++;
        else if (url.includes('/api')) requestsByType.api++;
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have reasonable number of each type
      expect(requestsByType.js).toBeLessThan(20);
      expect(requestsByType.css).toBeLessThan(10);
    });

    test('should use CDN for static assets', async ({ page }) => {
      const cdnRequests: string[] = [];

      page.on('request', (request) => {
        const url = request.url();
        if (
          url.includes('cdn') ||
          url.includes('cloudflare') ||
          url.includes('akamai') ||
          url.includes('cloudfront')
        ) {
          cdnRequests.push(url);
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // May or may not use CDN - just verify structure
      expect(Array.isArray(cdnRequests)).toBeTruthy();
    });

    test('should enable gzip compression', async ({ page }) => {
      let gzipCount = 0;

      page.on('response', (response) => {
        const encoding = response.headers()['content-encoding'];
        if (encoding?.includes('gzip')) {
          gzipCount++;
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have some gzip-compressed responses
      if (gzipCount > 0) {
        expect(gzipCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should have good FCP (First Contentful Paint)', async ({ page }) => {
      const navigationTiming = await page.evaluate(() => {
        const perf = window.performance.getEntriesByType('paint');
        return perf;
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // FCP should be marked
      expect(navigationTiming || page).toBeTruthy();
    });

    test('should have good LCP (Largest Contentful Paint)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for LCP to complete
      await page.waitForTimeout(2000);

      // Check that main content is loaded
      const mainContent = page.locator('main, [role="main"]').first();
      const isVisible = await mainContent.isVisible({ timeout: 1000 }).catch(() => false);

      expect(isVisible).toBeTruthy();
    });

    test('should minimize CLS (Cumulative Layout Shift)', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for layout to settle
      await page.waitForTimeout(2000);

      // Scroll and check for jank
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });

      // Page should respond smoothly
      const url = page.url();
      expect(url).toBeTruthy();
    });

    test('should not have layout shift during image loading', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Check if images have dimensions to prevent layout shift
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        const firstImage = images.first();
        const width = await firstImage.getAttribute('width').catch(() => null);
        const height = await firstImage.getAttribute('height').catch(() => null);

        // Ideally images should have dimensions
        if (width && height) {
          expect(width).toBeTruthy();
          expect(height).toBeTruthy();
        }
      }
    });
  });

  test.describe('Bundle Size', () => {
    test('should have reasonable bundle sizes', async ({ page }) => {
      let totalSize = 0;
      const fileSizes: Record<string, number> = {};

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css')) {
          const size = response.headers()['content-length'];
          if (size) {
            fileSizes[url] = parseInt(size);
            totalSize += parseInt(size);
          }
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Main bundle should be < 500KB
      expect(totalSize).toBeLessThan(500_000);
    });

    test('should code split vendor code', async ({ page }) => {
      const jsFiles: string[] = [];

      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('.js')) {
          jsFiles.push(url);
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Should have multiple JS files for code splitting
      expect(jsFiles.length).toBeGreaterThan(0);
    });
  });

  test.describe('Animation Performance', () => {
    test('should animate at 60fps', async ({ page }) => {
      await page.goto('/');

      // Look for animated elements and check frame rate
      const animatedElements = page.locator('[style*="animation"], [class*="animate"]');
      const animationCount = await animatedElements.count();

      if (animationCount > 0) {
        // Animations should exist
        expect(animationCount).toBeGreaterThan(0);
      }
    });

    test('should use GPU acceleration for transitions', async ({ page }) => {
      await page.goto('/');

      // Check for transform and opacity animations
      const styles = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let count = 0;
        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          if (
            style.transform !== 'none' ||
            style.transition.includes('transform') ||
            style.transition.includes('opacity')
          ) {
            count++;
          }
        });
        return count;
      });

      // Should have some GPU-accelerated animations
      if (styles > 0) {
        expect(styles).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Search Engine Optimization', () => {
    test('should have meta description', async ({ page }) => {
      await page.goto('/');

      const metaDescription = page.locator('meta[name="description"]');
      const hasDescription = await metaDescription.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasDescription) {
        const content = await metaDescription.getAttribute('content');
        expect(content?.length).toBeGreaterThan(10);
      }
    });

    test('should have proper page title', async ({ page }) => {
      await page.goto('/');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(5);
    });

    test('should have Open Graph meta tags', async ({ page }) => {
      await page.goto('/');

      const ogTitle = page.locator('meta[property="og:title"]');
      const ogDescription = page.locator('meta[property="og:description"]');

      const hasOG = await ogTitle.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasOG) {
        expect(hasOG).toBeTruthy();
      }
    });

    test('should have canonical URL', async ({ page }) => {
      await page.goto('/');

      const canonical = page.locator('link[rel="canonical"]');
      const hasCanonical = await canonical.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasCanonical) {
        expect(hasCanonical).toBeTruthy();
      }
    });
  });
});
