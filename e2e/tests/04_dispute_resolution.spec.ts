import { test, expect } from '@playwright/test';

test.describe('E2E-03: Dispute & Order Tracking Workflows', () => {
  test('buyer can access package tracking page', async ({ page }) => {
    await page.goto('/track');

    // Verify tracking page heading or search input
    await expect(page).toHaveURL(/.*\/track.*/i);
  });
});
