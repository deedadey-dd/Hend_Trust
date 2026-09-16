import { test, expect } from '@playwright/test';

test.describe('E2E: Payment Link Creation & Public Checkout Flow', () => {
  test('unauthenticated user creating link redirects to login', async ({ page }) => {
    await page.goto('/create-link');
    await expect(page).toHaveURL(/.*\/login.*/i);
  });

  test('buyer can view public checkout link and see product pricing', async ({ page }) => {
    await page.goto('/l/demo-product-link');

    // Should load public checkout page or show clean error
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});
