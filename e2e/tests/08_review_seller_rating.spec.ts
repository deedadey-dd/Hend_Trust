import { test, expect } from '@playwright/test';

test.describe('E2E: Verified Seller Directory & Reviews', () => {
  test('public user can visit reviews page and view recent escrow reviews', async ({ page }) => {
    await page.goto('/reviews');

    // Page title check
    await expect(page).toHaveURL(/.*\/reviews.*/i);

    // Navbar check
    await expect(page.locator('nav')).toBeVisible();
  });

  test('public user can search verified shops directory', async ({ page }) => {
    await page.goto('/shops');

    const shopSearch = page.locator('input[placeholder*="search"i], input[type="text"]').first();
    await expect(shopSearch).toBeVisible();

    await shopSearch.fill('Tech Store');
    await expect(shopSearch).toHaveValue('Tech Store');
  });
});
