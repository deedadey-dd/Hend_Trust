import { test, expect } from '@playwright/test';

test.describe('E2E: Delivery Confirmation & Dispute Modal Interaction', () => {
  test('tracking page allows user to enter order reference or tracking code', async ({ page }) => {
    await page.goto('/track');

    const searchBox = page.locator('input[placeholder*="reference"i], input[placeholder*="track"i], input[type="text"]').first();
    await expect(searchBox).toBeVisible();

    await searchBox.fill('REF-GH-100200');
    await expect(searchBox).toHaveValue('REF-GH-100200');
  });
});
