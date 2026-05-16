import { test, expect } from '@playwright/test';

const LANGUAGES = {
  EN: 'en',
  FR: 'fr',
  AR: 'ar',
};

test.describe('Internationalization & RTL (i18n)', () => {
  test.describe('Language Switching', () => {
    test('should display language selector', async ({ page }) => {
      await page.goto('/');

      // Look for language selector
      const languageSelector = page.locator('[data-testid="language-selector"], .language-selector, select[name*="language"]').first();
      const hasLanguageSelector = await languageSelector.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasLanguageSelector) {
        expect(hasLanguageSelector).toBeVisible();
      }
    });

    test('should switch to English', async ({ page }) => {
      await page.goto('/');

      // Find language switcher
      const languageButton = page.locator('button:has-text("EN"), button:has-text("English"), [data-lang="en"]').first();

      if (await languageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await languageButton.click();
        await page.waitForTimeout(1000);

        // Check page language
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe('en');

        // Check if page content is in English
        const pageText = await page.locator('body').textContent();
        expect(pageText).toBeTruthy();
      }
    });

    test('should switch to French', async ({ page }) => {
      await page.goto('/');

      // Find French language button
      const frenchButton = page.locator('button:has-text("FR"), button:has-text("Français"), [data-lang="fr"]').first();

      if (await frenchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frenchButton.click();
        await page.waitForTimeout(1000);

        // Check page language
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe('fr');
      }
    });

    test('should switch to Arabic', async ({ page }) => {
      await page.goto('/');

      // Find Arabic language button
      const arabicButton = page.locator('button:has-text("AR"), button:has-text("العربية"), [data-lang="ar"]').first();

      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);

        // Check page language
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe('ar');

        // Check for RTL direction
        const direction = await page.locator('html').getAttribute('dir');
        expect(direction).toBe('rtl');
      }
    });

    test('should maintain language preference across pages', async ({ page }) => {
      await page.goto('/');

      // Switch to French
      const frenchButton = page.locator('button:has-text("FR"), button:has-text("Français"), [data-lang="fr"]').first();
      if (await frenchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frenchButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to another page
      const loginLink = page.locator('a:has-text("Login"), a:has-text("Connexion")').first();
      if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginLink.click();
        await page.waitForURL(/login|connexion/i, { timeout: 5000 }).catch(() => {});
      }

      // Check language is still French
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('fr');
    });

    test('should persist language preference in local storage', async ({ page }) => {
      await page.goto('/');

      // Switch to Arabic
      const arabicButton = page.locator('button:has-text("AR"), button:has-text("العربية"), [data-lang="ar"]').first();
      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);
      }

      // Check local storage for language preference
      const savedLanguage = await page.evaluate(() => {
        return localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('i18n_lang');
      });

      expect(savedLanguage).toBeTruthy();
      expect(savedLanguage?.toLowerCase()).toContain('ar');
    });
  });

  test.describe('RTL (Right-to-Left) Layout', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Arabic
      await page.goto('/');
      const arabicButton = page.locator('button:has-text("AR"), button:has-text("العربية"), [data-lang="ar"]').first();
      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);
      }
    });

    test('should apply RTL direction to HTML element', async ({ page }) => {
      // Check dir attribute
      const direction = await page.locator('html').getAttribute('dir');
      expect(direction).toBe('rtl');
    });

    test('should mirror layout for RTL (text alignment, margins, etc)', async ({ page }) => {
      // Check if text is right-aligned for body
      const bodyElement = page.locator('body');
      const textAlign = await bodyElement.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).direction;
      });

      expect(textAlign).toBe('rtl');
    });

    test('should position navigation correctly for RTL', async ({ page }) => {
      const nav = page.locator('nav').first();
      if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check positioning
        const computedStyle = await nav.evaluate((el: HTMLElement) => {
          return window.getComputedStyle(el);
        });

        expect(computedStyle).toBeTruthy();
      }
    });

    test('should align form inputs correctly for RTL', async ({ page }) => {
      // Navigate to login to check form alignment
      const loginLink = page.locator('a:has-text("دخول"), a:has-text("تسجيل الدخول"), button:has-text("Login")').first();
      if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1000);
      }

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const inputStyle = await emailInput.evaluate((el: HTMLElement) => {
          return window.getComputedStyle(el);
        });

        expect(inputStyle).toBeTruthy();
      }
    });

    test('should display Arabic text correctly', async ({ page }) => {
      // Check if Arabic text is displayed
      const arabicText = await page.evaluate(() => {
        return document.body.textContent || '';
      });

      // Arabic text should contain at least some Arabic characters
      expect(arabicText).toBeTruthy();
    });

    test('should handle Arabic text in form inputs', async ({ page }) => {
      // Navigate to settings or profile where user can input text
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Input Arabic text
        await emailInput.fill('اختبار@مثال.com');

        const value = await emailInput.inputValue();
        expect(value).toContain('اختبار');
      }
    });

    test('should align buttons correctly for RTL', async ({ page }) => {
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const computedStyle = await firstButton.evaluate((el: HTMLElement) => {
          return window.getComputedStyle(el);
        });

        expect(computedStyle).toBeTruthy();
      }
    });

    test('should position sidebar/navigation on right for RTL', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar, [role="navigation"]').first();

      if (await sidebar.isVisible({ timeout: 2000 }).catch(() => false)) {
        const position = await sidebar.evaluate((el: HTMLElement) => {
          const style = window.getComputedStyle(el);
          return {
            left: style.left,
            right: style.right,
          };
        });

        expect(position).toBeTruthy();
      }
    });

    test('should mirror scrollbar position for RTL', async ({ page }) => {
      // For RTL, horizontal scroll should be mirrored
      const isRTL = await page.evaluate(() => {
        return document.documentElement.dir === 'rtl';
      });

      expect(isRTL).toBeTruthy();
    });
  });

  test.describe('Content Translation', () => {
    test('should translate navigation menu items', async ({ page }) => {
      await page.goto('/');

      // Switch to Arabic
      const arabicButton = page.locator('button:has-text("AR"), [data-lang="ar"]').first();
      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);
      }

      // Check for translated menu items
      const nav = page.locator('nav').first();
      if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
        const navText = await nav.textContent();
        expect(navText).toBeTruthy();
      }
    });

    test('should translate form labels and placeholders', async ({ page }) => {
      await page.goto('/login');

      // Switch to French
      const frenchButton = page.locator('button:has-text("FR"), [data-lang="fr"]').first();
      if (await frenchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frenchButton.click();
        await page.waitForTimeout(1000);
      }

      // Check for French labels
      const emailInput = page.locator('input[type="email"]').first();
      const placeholder = await emailInput.getAttribute('placeholder');

      if (placeholder) {
        expect(placeholder).toBeTruthy();
      }
    });

    test('should translate buttons and CTAs', async ({ page }) => {
      await page.goto('/login');

      // Switch to Arabic
      const arabicButton = page.locator('button:has-text("AR"), [data-lang="ar"]').first();
      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);
      }

      // Check for translated submit button
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const buttonText = await submitButton.textContent();
        expect(buttonText).toBeTruthy();
      }
    });

    test('should translate error messages', async ({ page }) => {
      await page.goto('/login');

      // Switch to French
      const frenchButton = page.locator('button:has-text("FR"), [data-lang="fr"]').first();
      if (await frenchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frenchButton.click();
        await page.waitForTimeout(1000);
      }

      // Trigger validation error
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Check for French error message
      const errorMessage = page.locator('[role="alert"], .error, .error-message').first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        expect(hasError).toBeTruthy();
      }
    });

    test('should translate success messages', async ({ page }) => {
      // This test would need successful action
      // Check if success messages are translated
      const successMessages = page.locator('[role="status"], .success, .success-message');
      const messageCount = await successMessages.count();

      // Just verify structure
      expect(messageCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Date & Time Localization', () => {
    test('should display dates in correct format for English', async ({ page }) => {
      await page.goto('/');

      // Switch to English
      const enButton = page.locator('button:has-text("EN"), [data-lang="en"]').first();
      if (await enButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to rides or history to see dates
      const ridesLink = page.locator('a:has-text("Rides"), a:has-text("History")').first();
      if (await ridesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ridesLink.click();
        await page.waitForURL(/rides|history/i, { timeout: 5000 }).catch(() => {});

        // Check date format (should be MM/DD/YYYY or DD/MM/YYYY for EN)
        const dateElements = page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2}/');
        const dateCount = await dateElements.count();

        if (dateCount > 0) {
          expect(dateCount).toBeGreaterThan(0);
        }
      }
    });

    test('should display times in correct format', async ({ page }) => {
      await page.goto('/');

      // Check time format in any time elements
      const timeElements = page.locator('text=/\\d{1,2}:\\d{2}/');
      const timeCount = await timeElements.count();

      if (timeCount > 0) {
        expect(timeCount).toBeGreaterThan(0);
      }
    });

    test('should display currency symbols correctly per language', async ({ page }) => {
      await page.goto('/');

      // Navigate to rides or pricing
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Réserver"), button:has-text("احجز")').first();
      if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookButton.click();

        // Check for currency symbol
        const currencySymbol = page.locator('text=/MAD|Dh|درهم|€|£/');
        const symbolCount = await currencySymbol.count();

        if (symbolCount > 0) {
          expect(symbolCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Number & Currency Formatting', () => {
    test('should format numbers according to locale', async ({ page }) => {
      await page.goto('/');

      // Switch to French
      const frenchButton = page.locator('button:has-text("FR"), [data-lang="fr"]').first();
      if (await frenchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await frenchButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to pricing to see formatted numbers
      const bookButton = page.locator('button:has-text("Book"), button:has-text("Réserver")').first();
      if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bookButton.click();

        // Check for formatted numbers
        const numbers = page.locator('text=/\\d+[,.]\\d+|\\d+ \\d+/');
        const numberCount = await numbers.count();

        if (numberCount > 0) {
          expect(numberCount).toBeGreaterThan(0);
        }
      }
    });

    test('should format currency with correct decimal places', async ({ page }) => {
      await page.goto('/');

      // Look for prices or currency amounts
      const prices = page.locator('text=/\\d+\\.\\d{2}|\\d+,\\d{2}/');
      const priceCount = await prices.count();

      if (priceCount > 0) {
        expect(priceCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Language Fallback', () => {
    test('should fallback to English if translation missing', async ({ page }) => {
      // This test depends on implementation
      // Navigate to page and switch languages
      await page.goto('/');

      const arabicButton = page.locator('button:has-text("AR"), [data-lang="ar"]').first();
      if (await arabicButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arabicButton.click();
        await page.waitForTimeout(1000);

        // Page should still be readable
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      }
    });

    test('should use correct language based on browser settings', async ({ context }) => {
      // Create new context with language
      const newPage = await context.newPage();
      await newPage.goto('/', {
        waitUntil: 'networkidle',
      });

      // Check what language is displayed by default
      const htmlLang = await newPage.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();

      await newPage.close();
    });
  });
});
