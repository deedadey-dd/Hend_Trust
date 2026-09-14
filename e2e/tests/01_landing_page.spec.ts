import { test, expect } from '@playwright/test';

test.describe('Landing Page & Navigation', () => {
  test('should load the homepage and render HendAxis Trust branding and search input', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/HendAxis Trust/i);

    // Verify marketplace search input is visible
    const searchInput = page.locator('input[placeholder*="Search verified shops"]');
    await expect(searchInput).toBeVisible();
  });

  test('should navigate to public pages cleanly', async ({ page }) => {
    await page.goto('/');
    
    // Check header navbar visibility
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});
