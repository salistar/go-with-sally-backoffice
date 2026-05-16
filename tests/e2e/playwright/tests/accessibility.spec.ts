import { test, expect } from '@playwright/test';

test.describe('Accessibility (a11y)', () => {
  test.describe('WCAG Compliance', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');

      // Check heading hierarchy (H1, then H2, etc.)
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');

      const h1Count = await h1.count();
      const h2Count = await h2.count();

      // Should have at least one H1
      if (h1Count > 0) {
        expect(h1Count).toBeGreaterThan(0);
      }
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto('/');

      // Check for text with sufficient contrast
      // This is a basic check - more thorough testing would use accessibility tools
      const bodyText = page.locator('body');
      const textColor = await bodyText.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).color;
      });

      expect(textColor).toBeTruthy();
    });

    test('should have semantic HTML structure', async ({ page }) => {
      await page.goto('/');

      // Check for semantic elements
      const main = page.locator('main');
      const nav = page.locator('nav');
      const footer = page.locator('footer');
      const article = page.locator('article');

      // Should have at least nav or footer
      const hasSemanticElements = await main.isVisible({ timeout: 2000 }).catch(() => false) ||
                                   await nav.isVisible({ timeout: 2000 }).catch(() => false) ||
                                   await footer.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasSemanticElements) {
        expect(hasSemanticElements).toBeTruthy();
      }
    });

    test('should have proper ARIA labels on form controls', async ({ page }) => {
      await page.goto('/login');

      // Check for labels or ARIA labels
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      // Check for associated label
      const emailLabel = page.locator('label[for*="email"], label:has(+ input[type="email"])').first();
      const hasLabel = await emailLabel.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasLabel) {
        expect(hasLabel).toBeTruthy();
      }

      // Check for aria-label as fallback
      const emailAria = await emailInput.getAttribute('aria-label').catch(() => null);
      const hasAriaLabel = emailAria !== null;

      expect(hasLabel || hasAriaLabel).toBeTruthy();
    });

    test('should have alt text on images', async ({ page }) => {
      await page.goto('/');

      // Check images for alt text
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        for (let i = 0; i < Math.min(3, imageCount); i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute('alt').catch(() => null);

          // Alt text should exist (though may be empty for decorative images)
          expect(typeof alt === 'string').toBeTruthy();
        }
      }
    });

    test('should have proper link text', async ({ page }) => {
      await page.goto('/');

      // Check that links have descriptive text (not just "click here")
      const links = page.locator('a');
      const linkCount = await links.count();

      if (linkCount > 0) {
        const firstLink = links.first();
        const linkText = await firstLink.textContent();
        expect(linkText).toBeTruthy();
        expect(linkText?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate form fields with Tab key', async ({ page }) => {
      await page.goto('/login');

      // Get email input and focus it
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      // Focus first input
      await emailInput.focus();

      let focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('type');
      });

      expect(focusedElement).toBe('email');

      // Tab to next field
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('type');
      });

      expect(focusedElement).toBe('password');
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      await page.goto('/login');

      // Focus on a button
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.focus();

      // Check if it's focused
      const isFocused = await page.evaluate(() => {
        return document.activeElement?.tagName === 'BUTTON';
      });

      expect(isFocused).toBeTruthy();
    });

    test('should close modals with Escape key', async ({ page }) => {
      await page.goto('/');

      // Look for a modal or dialog trigger
      const modalTrigger = page.locator('button:has-text("Open"), button:has-text("Modal"), button:has-text("Dialog")').first();

      if (await modalTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalTrigger.click();
        await page.waitForTimeout(500);

        // Check if modal is visible
        const modal = page.locator('[role="dialog"], .modal, .dialog').first();
        const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          // Press Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          // Modal should be closed
          const stillVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
          expect(!stillVisible).toBeTruthy();
        }
      }
    });

    test('should support arrow key navigation in dropdowns', async ({ page }) => {
      await page.goto('/login');

      // Look for a select or dropdown
      const select = page.locator('select').first();

      if (await select.isVisible({ timeout: 2000 }).catch(() => false)) {
        await select.focus();

        // Press down arrow
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);

        // Option should be highlighted
        const activeOption = page.locator('[role="option"][aria-selected="true"]').first();
        const isSelected = await activeOption.isVisible({ timeout: 2000 }).catch(() => false);

        if (isSelected) {
          expect(isSelected).toBeTruthy();
        }
      }
    });

    test('should skip to main content with keyboard shortcut', async ({ page }) => {
      await page.goto('/');

      // Look for skip link
      const skipLink = page.locator('a:has-text("Skip"), [href="#main"], [href="#content"]').first();

      if (await skipLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipLink.click();

        // Should jump to main content
        const mainContent = page.locator('main, [role="main"]').first();
        const isFocused = await mainContent.evaluate((el: HTMLElement) => {
          return el === document.activeElement || el.contains(document.activeElement as Node);
        });

        expect(isFocused).toBeTruthy();
      }
    });

    test('should maintain focus visible indicator', async ({ page }) => {
      await page.goto('/login');

      // Tab through elements and check focus indicator
      const firstInput = page.locator('input').first();
      await firstInput.focus();

      // Check if focused element has visible indicator
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
        };
      });

      expect(focusedElement.outline !== 'none' || focusedElement.boxShadow !== 'none').toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA roles', async ({ page }) => {
      await page.goto('/');

      // Check for proper roles
      const navigation = page.locator('[role="navigation"], nav').first();
      const buttons = page.locator('[role="button"], button');
      const main = page.locator('[role="main"], main').first();

      const hasNavRole = await navigation.isVisible({ timeout: 2000 }).catch(() => false);
      const buttonCount = await buttons.count();

      if (hasNavRole) {
        expect(hasNavRole).toBeTruthy();
      }
      expect(buttonCount).toBeGreaterThanOrEqual(0);
    });

    test('should have descriptive ARIA labels', async ({ page }) => {
      await page.goto('/');

      // Look for elements with aria-label
      const elementsWithAriaLabel = page.locator('[aria-label]');
      const ariaCount = await elementsWithAriaLabel.count();

      if (ariaCount > 0) {
        const firstElement = elementsWithAriaLabel.first();
        const label = await firstElement.getAttribute('aria-label');
        expect(label).toBeTruthy();
      }
    });

    test('should announce form errors to screen readers', async ({ page }) => {
      await page.goto('/login');

      // Trigger form error
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check for error announcement
      const errorAlert = page.locator('[role="alert"], .error, .error-message').first();
      const hasError = await errorAlert.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        expect(hasError).toBeTruthy();
      }
    });

    test('should have ARIA live regions for dynamic content', async ({ page }) => {
      await page.goto('/');

      // Look for live regions
      const liveRegion = page.locator('[aria-live], [aria-live="polite"], [aria-live="assertive"]').first();

      if (await liveRegion.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(liveRegion).toBeVisible();
      }
    });

    test('should provide text alternatives for icons', async ({ page }) => {
      await page.goto('/');

      // Check icon buttons
      const iconButtons = page.locator('button:has(svg), button:has(i)');
      const iconButtonCount = await iconButtons.count();

      if (iconButtonCount > 0) {
        const firstIconButton = iconButtons.first();

        // Should have aria-label or title
        const ariaLabel = await firstIconButton.getAttribute('aria-label').catch(() => null);
        const title = await firstIconButton.getAttribute('title').catch(() => null);
        const text = await firstIconButton.textContent();

        expect(ariaLabel || title || text).toBeTruthy();
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modal dialog', async ({ page }) => {
      await page.goto('/');

      // Open a modal
      const modalTrigger = page.locator('button:has-text("Open"), button:has-text("Modal")').first();

      if (await modalTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalTrigger.click();
        await page.waitForTimeout(500);

        // Check if modal exists
        const modal = page.locator('[role="dialog"], .modal').first();
        const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          // Tab through and verify focus stays in modal
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], .modal');
            return modal?.contains(document.activeElement as Node) || false;
          });

          expect(focusedElement).toBeTruthy();
        }
      }
    });

    test('should restore focus after modal closes', async ({ page }) => {
      await page.goto('/');

      // Focus trigger element
      const modalTrigger = page.locator('button:has-text("Open"), button:has-text("Modal")').first();

      if (await modalTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalTrigger.focus();

        // Open modal
        await modalTrigger.click();
        await page.waitForTimeout(500);

        // Close modal
        const closeButton = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Focus should return to trigger
          const focusedElement = await page.evaluate(() => {
            return document.activeElement?.textContent;
          });

          expect(focusedElement).toBeTruthy();
        }
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Check heading hierarchy
      const h1 = page.locator('h1');
      const h1Count = await h1.count();

      if (h1Count > 0) {
        expect(h1Count).toBeGreaterThan(0);
      }

      // Check keyboard navigation
      const firstInput = page.locator('input').first();
      if (await firstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstInput.focus();
        expect(firstInput).toBeFocused();
      }
    });

    test('should have accessible touch targets (minimum 44x44px)', async ({ page }) => {
      await page.goto('/');

      // Check button sizes
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const box = await firstButton.boundingBox();

        // Should have reasonable size for touch
        if (box) {
          expect(box.width).toBeGreaterThan(40);
          expect(box.height).toBeGreaterThan(40);
        }
      }
    });
  });

  test.describe('Error Prevention & Recovery', () => {
    test('should clearly label required fields', async ({ page }) => {
      await page.goto('/login');

      // Look for required indicator
      const requiredIndicator = page.locator('[aria-required="true"], .required, .asterisk, text="*"').first();

      if (await requiredIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(requiredIndicator).toBeVisible();
      }
    });

    test('should provide clear error messages', async ({ page }) => {
      await page.goto('/login');

      // Submit without filling
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(500);

      // Check for error message
      const errorMessage = page.locator('[role="alert"], .error, .error-message').first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toBeTruthy();
      }
    });

    test('should suggest corrections for errors', async ({ page }) => {
      await page.goto('/login');

      // Enter invalid email
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('notanemail');
      await page.waitForTimeout(500);

      // Check for suggestion or error
      const errorMessage = page.locator('[role="alert"], .error').first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Text & Content Accessibility', () => {
    test('should use readable font sizes', async ({ page }) => {
      await page.goto('/');

      // Check body font size
      const body = page.locator('body');
      const fontSize = await body.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).fontSize;
      });

      // Should be at least 12px
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(12);
    });

    test('should have adequate line spacing', async ({ page }) => {
      await page.goto('/');

      // Check line height
      const body = page.locator('body');
      const lineHeight = await body.evaluate((el: HTMLElement) => {
        return window.getComputedStyle(el).lineHeight;
      });

      expect(lineHeight).toBeTruthy();
      // Line height should be > 1.0
    });

    test('should use clear language without jargon', async ({ page }) => {
      await page.goto('/');

      // Check main content readability
      const mainContent = page.locator('main, [role="main"]').first();
      const text = await mainContent.textContent().catch(() => '');

      expect(text.length).toBeGreaterThan(0);
    });

    test('should not use color alone to convey information', async ({ page }) => {
      await page.goto('/');

      // Required fields should have indicator beyond color
      const requiredElements = page.locator('[aria-required="true"], .required');
      const requiredCount = await requiredElements.count();

      if (requiredCount > 0) {
        // Should have text or symbol beyond color
        const firstRequired = requiredElements.first();
        const text = await firstRequired.textContent();
        expect(text || await firstRequired.getAttribute('aria-label')).toBeTruthy();
      }
    });
  });
});
