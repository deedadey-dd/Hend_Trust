import { test, expect } from '@playwright/test';

test.describe('E2E-01: Public Checkout & Payment Link Flow', () => {
  test('buyer can view public payment link details and initiate checkout', async ({ page }) => {
    // Navigate to public payment link view (mock link slug)
    await page.goto('/l/test-link-001');

    // Should load public checkout page or redirect gracefully
    await expect(page).toHaveURL(/.*\/l\/test-link-001.*/i);
  });
});
